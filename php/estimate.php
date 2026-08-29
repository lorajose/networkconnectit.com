<?php
// Lightweight endpoint to receive the Smart Budget Configurator data
// and forward it to the ops inbox.

use PHPMailer\PHPMailer\PHPMailer;

const NCI_ESTIMATE_MAX_BODY_BYTES = 32768;
const NCI_ESTIMATE_MAX_SWITCHES = 512;
const NCI_ESTIMATE_MAX_EXTRAS = 32;
const NCI_ESTIMATE_MAX_MATERIAL_VALUE = 100000;

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');

function nci_estimate_error(int $status, string $message): void {
    http_response_code($status);
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}

function nci_estimate_text($value, int $maxLength): string {
    if (!is_scalar($value) && $value !== null) {
        return '';
    }
    $text = trim((string)$value);
    if (strlen($text) > $maxLength) {
        $text = substr($text, 0, $maxLength);
    }
    return $text;
}

function nci_estimate_bounded_number($value, float $min, float $max): ?float {
    if (!is_int($value) && !is_float($value) && !is_string($value)) {
        return null;
    }
    if (!is_numeric($value)) {
        return null;
    }
    $number = (float)$value;
    if (!is_finite($number) || $number < $min || $number > $max) {
        return null;
    }
    return $number;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    nci_estimate_error(405, 'Method Not Allowed');
}

$contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
if ($contentLength > NCI_ESTIMATE_MAX_BODY_BYTES) {
    nci_estimate_error(413, 'Request payload too large');
}

$contentType = strtolower(trim((string)($_SERVER['CONTENT_TYPE'] ?? '')));
if ($contentType !== '' && strpos($contentType, 'application/json') !== 0) {
    nci_estimate_error(415, 'Unsupported Media Type');
}

$rawBody = file_get_contents('php://input', false, null, 0, NCI_ESTIMATE_MAX_BODY_BYTES + 1);
if ($rawBody === false) {
    nci_estimate_error(400, 'Invalid request payload');
}
if (strlen($rawBody) > NCI_ESTIMATE_MAX_BODY_BYTES) {
    nci_estimate_error(413, 'Request payload too large');
}

try {
    $payload = json_decode($rawBody, true, 32, JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    nci_estimate_error(400, 'Invalid JSON');
}
if (!is_array($payload)) {
    nci_estimate_error(400, 'Invalid JSON');
}

$name = nci_estimate_text($payload['name'] ?? '', 120);
$emailRaw = nci_estimate_text($payload['email'] ?? '', 254);
$email = filter_var($emailRaw, FILTER_VALIDATE_EMAIL);
$switchesRaw = $payload['switches'] ?? ($payload['cameras'] ?? 0);
$switchesNumber = nci_estimate_bounded_number($switchesRaw, 1, NCI_ESTIMATE_MAX_SWITCHES);
$switches = $switchesNumber === null ? 0 : (int)round($switchesNumber);
$mess = nci_estimate_text($payload['security'] ?? ($payload['mess'] ?? ''), 120);
$location = nci_estimate_text($payload['size'] ?? ($payload['location'] ?? ''), 160);

$materialsRaw = $payload['materials'] ?? [];
$totalsRaw = $payload['totals'] ?? [];
$extrasRaw = $payload['extras'] ?? [];
$materials = is_array($materialsRaw) ? $materialsRaw : [];
$totals = is_array($totalsRaw) ? $totalsRaw : [];
$extras = is_array($extrasRaw) ? array_slice($extrasRaw, 0, NCI_ESTIMATE_MAX_EXTRAS) : [];

if (!$email || $switches <= 0) {
    nci_estimate_error(400, 'Missing or invalid required fields');
}

$allowedMaterialKeys = ['boxes', 'rj45', 'misc'];
$cleanMaterials = [];
foreach ($allowedMaterialKeys as $key) {
    $value = nci_estimate_bounded_number($materials[$key] ?? null, 0, NCI_ESTIMATE_MAX_MATERIAL_VALUE);
    $cleanMaterials[$key] = $value === null ? '-' : (string)(int)round($value);
}

$allowedTotalKeys = ['hardware', 'labor', 'support', 'total', 'total_estimate'];
$cleanTotals = [];
foreach ($allowedTotalKeys as $key) {
    $value = nci_estimate_bounded_number($totals[$key] ?? null, 0, 10000000);
    $cleanTotals[$key] = $value === null ? '-' : number_format($value, 2, '.', '');
}

$cleanExtras = [];
foreach ($extras as $extra) {
    $text = nci_estimate_text($extra, 80);
    if ($text !== '') {
        $cleanExtras[] = $text;
    }
}

$to = getenv('NCI_CONTACT_TO') ?: 'networkconnectit@gmail.com';
$subject = 'Smart Budget Configurator - Preliminary Estimate';
$headers = "From: noreply@networkconnectit.com\r\n";
$headers .= 'Reply-To: ' . $email . "\r\n";
$headers .= 'Content-Type: text/html; charset=UTF-8';
$extrasList = $cleanExtras ? implode(', ', array_map(static function ($item) {
    return htmlspecialchars($item, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}, $cleanExtras)) : 'None';

$body = '<h2>Preliminary Estimate</h2>'
    . '<p><strong>Name:</strong> ' . htmlspecialchars($name ?: 'N/A', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</p>'
    . '<p><strong>Email:</strong> ' . htmlspecialchars((string)$email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</p>'
    . '<p><strong>Switches / Cameras:</strong> ' . $switches . '</p>'
    . '<p><strong>Mess / Security level:</strong> ' . htmlspecialchars($mess, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</p>'
    . '<p><strong>Location / Size:</strong> ' . htmlspecialchars($location, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</p>'
    . '<p><strong>Extras:</strong> ' . $extrasList . '</p>'
    . '<h3>Materials</h3><ul>'
    . '<li>Cat6 boxes: ' . htmlspecialchars($cleanMaterials['boxes'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</li>'
    . '<li>RJ45 connectors: ' . htmlspecialchars($cleanMaterials['rj45'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</li>'
    . '<li>Misc parts: ' . htmlspecialchars($cleanMaterials['misc'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</li></ul>'
    . '<h3>Totals (USD)</h3><ul>'
    . '<li>Hardware: ' . htmlspecialchars($cleanTotals['hardware'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</li>'
    . '<li>Labor: ' . htmlspecialchars($cleanTotals['labor'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</li>'
    . '<li>Monthly support: ' . htmlspecialchars($cleanTotals['support'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</li>'
    . '<li>Total: ' . htmlspecialchars($cleanTotals['total'] !== '-' ? $cleanTotals['total'] : $cleanTotals['total_estimate'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</li></ul>'
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
        $mail->addReplyTo((string)$email);
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
if ($sent) {
    echo json_encode(['status' => 'ok']);
} else {
    nci_estimate_error(500, 'Mail delivery failed');
}
