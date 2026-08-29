<?php
// Lightweight endpoint to receive the Smart Budget Configurator data
// and forward it to the ops inbox.

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Method Not Allowed');
}

$payload = json_decode(file_get_contents('php://input'), true);
if (!$payload) {
    http_response_code(400);
    exit('Invalid JSON');
}

$email = filter_var($payload['email'] ?? '', FILTER_VALIDATE_EMAIL);
$name = trim($payload['name'] ?? '');
$switches = intval($payload['switches'] ?? ($payload['cameras'] ?? 0));
$mess = htmlspecialchars($payload['security'] ?? $payload['mess'] ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$location = htmlspecialchars($payload['size'] ?? $payload['location'] ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$materials = $payload['materials'] ?? [];
$totals = $payload['totals'] ?? [];
$extras = $payload['extras'] ?? [];

if (!$email || $switches <= 0) {
    http_response_code(400);
    exit('Missing required fields');
}

$to = getenv('NCI_CONTACT_TO') ?: 'networkconnectit@gmail.com';
$subject = 'Smart Budget Configurator - Preliminary Estimate';
$headers = "From: noreply@networkconnectit.com\r\n";
$headers .= 'Reply-To: ' . $email . "\r\n";
$headers .= 'Content-Type: text/html; charset=UTF-8';
$extrasList = !empty($extras) ? implode(', ', array_map('htmlspecialchars', $extras)) : 'None';

$body = '<h2>Preliminary Estimate</h2>'
    . '<p><strong>Name:</strong> ' . htmlspecialchars($name ?: 'N/A', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</p>'
    . '<p><strong>Email:</strong> ' . htmlspecialchars($email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</p>'
    . '<p><strong>Switches / Cameras:</strong> ' . $switches . '</p>'
    . '<p><strong>Mess / Security level:</strong> ' . $mess . '</p>'
    . '<p><strong>Location / Size:</strong> ' . $location . '</p>'
    . '<p><strong>Extras:</strong> ' . $extrasList . '</p>'
    . '<h3>Materials</h3><ul>'
    . '<li>Cat6 boxes: ' . htmlspecialchars((string)($materials['boxes'] ?? '-')) . '</li>'
    . '<li>RJ45 connectors: ' . htmlspecialchars((string)($materials['rj45'] ?? '-')) . '</li>'
    . '<li>Misc parts: ' . htmlspecialchars((string)($materials['misc'] ?? '-')) . '</li></ul>'
    . '<h3>Totals (USD)</h3><ul>'
    . '<li>Hardware: ' . htmlspecialchars((string)($totals['hardware'] ?? '-')) . '</li>'
    . '<li>Labor: ' . htmlspecialchars((string)($totals['labor'] ?? '-')) . '</li>'
    . '<li>Monthly support: ' . htmlspecialchars((string)($totals['support'] ?? '-')) . '</li>'
    . '<li>Total: ' . htmlspecialchars((string)($totals['total'] ?? $totals['total_estimate'] ?? '-')) . '</li></ul>'
    . '<p><em>Preliminary estimate; on-site survey required for final proposal.</em></p>';

$sent = false;
$errorMsg = '';
$autoloadPath = dirname(__DIR__) . '/vendor/autoload.php';
$smtpHost = getenv('NCI_SMTP_HOST') ?: '';
$smtpUser = getenv('NCI_SMTP_USER') ?: '';
$smtpPassword = getenv('NCI_SMTP_PASSWORD') ?: '';
$smtpPort = (int)(getenv('NCI_SMTP_PORT') ?: 587);

if ($smtpHost !== '' && $smtpUser !== '' && $smtpPassword !== '' && file_exists($autoloadPath)) {
    require_once $autoloadPath;
    try {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $smtpHost;
        $mail->SMTPAuth = true;
        $mail->Username = $smtpUser;
        $mail->Password = $smtpPassword;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = $smtpPort;
        $mail->setFrom($smtpUser, 'NetworkConnectIT');
        $mail->addAddress($to);
        $mail->addReplyTo($email);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $body;
        $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />', '</p>', '</li>'], "\n", $body));
        $mail->send();
        $sent = true;
    } catch (Throwable $e) {
        $errorMsg = 'SMTP delivery failed';
    }
}

if (!$sent) {
    $sent = @mail($to, $subject, $body, $headers);
    if (!$sent && !$errorMsg) {
        $errorMsg = 'mail() failed';
    }
}

error_log('NetworkConnectIT estimate delivery=' . ($sent ? 'success' : 'failure') . ($errorMsg ? ' reason=' . $errorMsg : ''));
header('Content-Type: application/json');
if ($sent) {
    echo json_encode(['status' => 'ok']);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Mail delivery failed']);
}
