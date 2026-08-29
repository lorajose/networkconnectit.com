<?php
// Endpoint for Smart Budget Configurator · Network (service.html)
use PHPMailer\PHPMailer\PHPMailer;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Method Not Allowed');
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);
if (!is_array($payload)) {
    $payload = $_POST;
}
if (!is_array($payload)) {
    http_response_code(400);
    exit('Invalid request payload');
}

function first_present_value(array $source, array $keys, $default = null) {
    foreach ($keys as $key) {
        if (array_key_exists($key, $source) && $source[$key] !== null && $source[$key] !== '') {
            return $source[$key];
        }
    }
    return $default;
}
function normalize_mess_level($value) {
    $value = strtolower(trim((string)$value));
    return in_array($value, ['low', 'medium', 'critical'], true) ? $value : 'low';
}
function normalize_location_code($value) {
    $value = strtoupper(trim((string)$value));
    return in_array($value, ['NYC', 'NY', 'NJ', 'CT'], true) ? $value : 'NYC';
}
function parse_int_value($value) {
    if (is_int($value)) return $value;
    if (is_float($value) || is_numeric($value)) return (int)round((float)$value);
    if (!is_string($value)) return null;
    $digits = preg_replace('/[^0-9-]/', '', $value);
    return ($digits === '' || $digits === '-') ? null : (int)$digits;
}
function format_usd($amount) {
    return '$' . number_format((int)round((float)$amount), 0, '.', ',');
}
function calculate_materials($switchCount, $messLevel) {
    $mess = normalize_mess_level($messLevel);
    $portRatio = ['low' => 0.55, 'medium' => 0.70, 'critical' => 0.85];
    $avgRunFt = ['low' => 30, 'medium' => 40, 'critical' => 50];
    $activeDrops = max(24, (int)ceil($switchCount * 48 * $portRatio[$mess]));
    return [
        'boxes' => max(1, (int)ceil(($activeDrops * $avgRunFt[$mess]) / 1000)),
        'rj45' => $activeDrops * 2,
        'patch_panels' => max(1, (int)ceil($switchCount / 2)),
        'cable_managers' => max(2, (int)ceil($switchCount / 2)),
        'patch_cords' => $activeDrops
    ];
}
function calculate_totals($switchCount, $messLevel, $locationCode) {
    $messMult = ['low' => 1.0, 'medium' => 1.35, 'critical' => 1.75];
    $locMult = ['NYC' => 1.20, 'NY' => 1.10, 'NJ' => 1.00, 'CT' => 1.00];
    $mess = normalize_mess_level($messLevel);
    $location = normalize_location_code($locationCode);
    $base = ($switchCount * 680) + 320;
    $fieldServices = $base * $messMult[$mess];
    $total = $fieldServices * $locMult[$location];
    return ['labor' => (int)round($fieldServices), 'support' => (int)round($total - $fieldServices), 'total' => (int)round($total)];
}

$name = trim((string)first_present_value($payload, ['name', 'full_name'], ''));
$email = filter_var(trim((string)first_present_value($payload, ['email', 'work_email'], '')), FILTER_VALIDATE_EMAIL);
$switches = max(0, (int)first_present_value($payload, ['switches', 'switch_count', 'number_of_switches'], 0));
$messLevel = normalize_mess_level(first_present_value($payload, ['mess', 'messLevel', 'cable_mess_level', 'security'], 'low'));
$locationCode = normalize_location_code(first_present_value($payload, ['location', 'location_code', 'size'], 'NYC'));
$locationLabel = trim((string)first_present_value($payload, ['location_label', 'locationLabel'], ''));
$locationMap = ['NYC' => 'NYC (20% logistics/parking uplift)', 'NY' => 'NY (metro)', 'NJ' => 'NJ', 'CT' => 'CT'];
$locationDisplay = $locationLabel !== '' ? $locationLabel : ($locationMap[$locationCode] ?? $locationCode);
$materials = calculate_materials($switches, $messLevel);
$incomingMaterials = is_array($payload['materials'] ?? null) ? $payload['materials'] : [];
$materialKeyMap = ['boxes' => ['boxes', 'cat6_boxes', 'cat6Boxes'], 'rj45' => ['rj45', 'rj_45', 'rj45_connectors', 'rj45Connectors'], 'patch_panels' => ['patch_panels', 'patchPanels'], 'cable_managers' => ['cable_managers', 'cableManagers'], 'patch_cords' => ['patch_cords', 'patchCords']];
foreach ($materialKeyMap as $normalizedKey => $aliases) {
    $parsed = parse_int_value(first_present_value($incomingMaterials, $aliases, null));
    if ($parsed !== null && $parsed > 0) $materials[$normalizedKey] = $parsed;
}
$totalsCalculated = calculate_totals($switches, $messLevel, $locationCode);
if (!$email || $switches <= 0) {
    http_response_code(400);
    exit('Missing required fields');
}

$to = getenv('NCI_CONTACT_TO') ?: 'networkconnectit@gmail.com';
$subject = 'Network Rack Estimate (Smart Budget Configurator)';
$headers = "From: noreply@networkconnectit.com\r\nReply-To: " . $email . "\r\nContent-Type: text/html; charset=UTF-8";
$body = '<h2>Network Rack Preliminary Estimate</h2>'
    . '<p><strong>Name:</strong> ' . htmlspecialchars($name ?: 'N/A') . '</p>'
    . '<p><strong>Email:</strong> ' . htmlspecialchars($email) . '</p>'
    . '<p><strong>Number of Switches:</strong> ' . $switches . '</p>'
    . '<p><strong>Cable mess level:</strong> ' . htmlspecialchars(ucfirst($messLevel)) . '</p>'
    . '<p><strong>Location:</strong> ' . htmlspecialchars($locationDisplay) . '</p>'
    . '<h3>Materials</h3><ul>'
    . '<li>Cat6 boxes: ' . htmlspecialchars((string)$materials['boxes']) . '</li>'
    . '<li>RJ45 connectors: ' . htmlspecialchars((string)$materials['rj45']) . '</li>'
    . '<li>Patch panels: ' . htmlspecialchars((string)$materials['patch_panels']) . '</li>'
    . '<li>Cable managers: ' . htmlspecialchars((string)$materials['cable_managers']) . '</li>'
    . '<li>Patch cords: ' . htmlspecialchars((string)$materials['patch_cords']) . '</li></ul>'
    . '<h3>Totals (USD)</h3><ul><li>Field services subtotal: ' . format_usd($totalsCalculated['labor']) . '</li>'
    . '<li>Location uplift: ' . format_usd($totalsCalculated['support']) . '</li><li>Total estimate: ' . format_usd($totalsCalculated['total']) . '</li></ul>'
    . '<p><em>Preliminary only. Final proposal follows on-site survey and cabling path review.</em></p>';

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
    if (!$sent && !$errorMsg) $errorMsg = 'mail() failed';
}
error_log('NetworkConnectIT network estimate delivery=' . ($sent ? 'success' : 'failure') . ($errorMsg ? ' reason=' . $errorMsg : ''));
header('Content-Type: application/json');
if ($sent) {
    echo json_encode(['status' => 'ok', 'materials' => $materials, 'totals' => ['labor' => format_usd($totalsCalculated['labor']), 'support' => format_usd($totalsCalculated['support']), 'total' => format_usd($totalsCalculated['total'])]]);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Mail delivery failed']);
}
