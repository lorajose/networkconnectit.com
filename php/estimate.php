<?php
// Lightweight endpoint to receive the Smart Budget Configurator data
// and forward it to the ops inbox.

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Only accept JSON POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Method Not Allowed');
}

$payload = json_decode(file_get_contents('php://input'), true);
if (!$payload) {
    http_response_code(400);
    exit('Invalid JSON');
}

// Extract fields (support both camera-based and switch-based forms)
$email    = filter_var($payload['email'] ?? '', FILTER_VALIDATE_EMAIL);
$name     = trim($payload['name'] ?? '');
$switches = intval($payload['switches'] ?? ($payload['cameras'] ?? 0));
$mess     = htmlspecialchars($payload['security'] ?? $payload['mess'] ?? '');
$location = htmlspecialchars($payload['size'] ?? $payload['location'] ?? '');
$materials = $payload['materials'] ?? [];
$totals    = $payload['totals'] ?? [];
$extras    = $payload['extras'] ?? [];

if (!$email || $switches <= 0) {
    http_response_code(400);
    exit('Missing required fields');
}

$to = "networkconnectit@gmail.com";
$subject = "Smart Budget Configurator - Preliminary Estimate";
$headers = "From: noreply@networkconnectit.com\r\n";
$headers .= "Reply-To: " . $email . "\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8";

$extrasList = !empty($extras) ? implode(', ', array_map('htmlspecialchars', $extras)) : 'None';

$body = "<h2>Preliminary Estimate</h2>
<p><strong>Name:</strong> " . htmlspecialchars($name ?: 'N/A') . "</p>
<p><strong>Email:</strong> {$email}</p>
<p><strong>Switches / Cameras:</strong> {$switches}</p>
<p><strong>Mess / Security level:</strong> {$mess}</p>
<p><strong>Location / Size:</strong> {$location}</p>
<p><strong>Extras:</strong> {$extrasList}</p>
<h3>Materials</h3>
<ul>
  <li>Cat6 boxes: " . htmlspecialchars($materials['boxes'] ?? '-') . "</li>
  <li>RJ45 connectors: " . htmlspecialchars($materials['rj45'] ?? '-') . "</li>
  <li>Misc parts: " . htmlspecialchars($materials['misc'] ?? '-') . "</li>
</ul>
<h3>Totals (USD)</h3>
<ul>
  <li>Hardware: " . htmlspecialchars($totals['hardware'] ?? '-') . "</li>
  <li>Labor: " . htmlspecialchars($totals['labor'] ?? '-') . "</li>
  <li>Monthly support: " . htmlspecialchars($totals['support'] ?? '-') . "</li>
  <li>Total: " . htmlspecialchars($totals['total'] ?? $totals['total_estimate'] ?? '-') . "</li>
</ul>
<p><em>Note: Preliminary estimate; on-site survey required for final proposal.</em></p>";

// Try PHPMailer with SMTP first (if available), then fallback to mail()
$sent = false;
$errorMsg = '';

// Load Composer autoload (vendor folder is one level up)
$autoloadPath = dirname(__DIR__) . '/vendor/autoload.php';
if (file_exists($autoloadPath)) {
    require_once $autoloadPath;
    try {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = 'mail.networkconnectit.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'network@networkconnectit.com';
        $mail->Password = 'CarlosJose2024';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;

        $mail->setFrom('network@networkconnectit.com', 'NetworkConnectIT');
        $mail->addAddress($to);
        $mail->addReplyTo($email);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $body;
        $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />', '</p>', '</li>'], "\n", $body));
        $mail->send();
        $sent = true;
    } catch (Exception $e) {
        $errorMsg = $mail->ErrorInfo ?: $e->getMessage();
        $sent = false;
    }
}

if (!$sent) {
    $sent = mail($to, $subject, $body, $headers);
    if (!$sent && !$errorMsg) {
        $errorMsg = 'mail() failed';
    }
}

// Optional: write debug log to /tmp (safe path)
@file_put_contents('/tmp/estimate_mail.log', date('c') . " sent=" . ($sent ? '1' : '0') . " error=" . $errorMsg . "\n", FILE_APPEND);

header('Content-Type: application/json');

if ($sent) {
    echo json_encode(["status" => "ok"]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $errorMsg ?: "Mail failed"]);
}
