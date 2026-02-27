<?php
// Endpoint for Smart Budget Configurator · Network (service.html)
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

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

function normalize_mess_level($messLevel) {
    $mess = strtolower(trim((string)$messLevel));
    if (!in_array($mess, ['low', 'medium', 'critical'], true)) {
        return 'low';
    }
    return $mess;
}

function normalize_location_code($location) {
    $locationCode = strtoupper(trim((string)$location));
    if (!in_array($locationCode, ['NYC', 'NY', 'NJ', 'CT'], true)) {
        return 'NYC';
    }
    return $locationCode;
}

function parse_int_value($value) {
    if (is_int($value)) {
        return $value;
    }
    if (is_float($value) || is_numeric($value)) {
        return (int)round((float)$value);
    }
    if (!is_string($value)) {
        return null;
    }

    $digits = preg_replace('/[^0-9-]/', '', $value);
    if ($digits === '' || $digits === '-') {
        return null;
    }
    return (int)$digits;
}

function format_usd($amount) {
    return '$' . number_format((int)round((float)$amount), 0, '.', ',');
}

function calculate_materials($switchCount, $messLevel) {
    $mess = strtolower(trim($messLevel));
    if (!in_array($mess, ['low', 'medium', 'critical'], true)) {
        $mess = 'low';
    }

    $portRatio = [
        'low' => 0.55,
        'medium' => 0.70,
        'critical' => 0.85
    ];
    $avgRunFt = [
        'low' => 30,
        'medium' => 40,
        'critical' => 50
    ];

    $activeDrops = max(24, (int)ceil($switchCount * 48 * $portRatio[$mess]));
    $cat6Boxes = max(1, (int)ceil(($activeDrops * $avgRunFt[$mess]) / 1000));
    $rj45 = $activeDrops * 2;
    $patchPanels = max(1, (int)ceil($switchCount / 2));
    $cableManagers = max(2, (int)ceil($switchCount / 2));
    $patchCords = $activeDrops;

    return [
        'boxes' => $cat6Boxes,
        'rj45' => $rj45,
        'patch_panels' => $patchPanels,
        'cable_managers' => $cableManagers,
        'patch_cords' => $patchCords
    ];
}

function calculate_totals($switchCount, $messLevel, $locationCode) {
    $switchUnit = 680;
    $cleaning = 320;
    $messMult = ['low' => 1.0, 'medium' => 1.35, 'critical' => 1.75];
    $locMult = ['NYC' => 1.20, 'NY' => 1.10, 'NJ' => 1.00, 'CT' => 1.00];

    $mess = normalize_mess_level($messLevel);
    $location = normalize_location_code($locationCode);
    $base = ($switchCount * $switchUnit) + $cleaning;
    $fieldServices = $base * $messMult[$mess];
    $total = $fieldServices * $locMult[$location];
    $uplift = $total - $fieldServices;

    return [
        'labor' => (int)round($fieldServices),
        'support' => (int)round($uplift),
        'total' => (int)round($total)
    ];
}

$name = trim((string)first_present_value($payload, ['name', 'full_name'], ''));
$email = filter_var(trim((string)first_present_value($payload, ['email', 'work_email'], '')), FILTER_VALIDATE_EMAIL);
$switches = max(0, (int)first_present_value($payload, ['switches', 'switch_count', 'number_of_switches'], 0));
$messLevelRaw = (string)first_present_value($payload, ['mess', 'messLevel', 'cable_mess_level', 'security'], 'low');
$messLevel = normalize_mess_level($messLevelRaw);
$locationCodeRaw = (string)first_present_value($payload, ['location', 'location_code', 'size'], 'NYC');
$locationCode = normalize_location_code($locationCodeRaw);
$locationLabel = trim((string)first_present_value($payload, ['location_label', 'locationLabel'], ''));

$locationMap = [
    'NYC' => 'NYC (20% logistics/parking uplift)',
    'NY' => 'NY (metro)',
    'NJ' => 'NJ',
    'CT' => 'CT'
];
$locationDisplay = $locationLabel !== '' ? $locationLabel : ($locationMap[$locationCode] ?? $locationCode);

$materialsCalculated = calculate_materials($switches, $messLevel);
$incomingMaterials = $payload['materials'] ?? [];
if (!is_array($incomingMaterials)) {
    $incomingMaterials = [];
}

$materials = $materialsCalculated;
$materialKeyMap = [
    'boxes' => ['boxes', 'cat6_boxes', 'cat6Boxes'],
    'rj45' => ['rj45', 'rj_45', 'rj45_connectors', 'rj45Connectors'],
    'patch_panels' => ['patch_panels', 'patchPanels'],
    'cable_managers' => ['cable_managers', 'cableManagers'],
    'patch_cords' => ['patch_cords', 'patchCords']
];
foreach ($materialKeyMap as $normalizedKey => $aliases) {
    $candidate = first_present_value($incomingMaterials, $aliases, null);
    $parsed = parse_int_value($candidate);
    if ($parsed !== null && $parsed > 0) {
        $materials[$normalizedKey] = $parsed;
    }
}

$totalsCalculated = calculate_totals($switches, $messLevel, $locationCode);

if (!$email || $switches <= 0) {
    http_response_code(400);
    exit('Missing required fields');
}

$to = "networkconnectit@gmail.com";
$subject = "Network Rack Estimate (Smart Budget Configurator)";
$headers = "From: noreply@networkconnectit.com\r\n";
$headers .= "Reply-To: " . $email . "\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8";

$body = "<h2>Network Rack Preliminary Estimate</h2>
<p><strong>Name:</strong> " . htmlspecialchars($name ?: 'N/A') . "</p>
<p><strong>Email:</strong> " . htmlspecialchars($email) . "</p>
<p><strong>Number of Switches (1U-4U each):</strong> {$switches}</p>
<p><strong>Cable mess level:</strong> " . htmlspecialchars(ucfirst($messLevel)) . "</p>
<p><strong>Location:</strong> " . htmlspecialchars($locationDisplay) . "</p>
<h3>Materials</h3>
<ul>
  <li>Cat6 boxes: " . htmlspecialchars($materials['boxes'] ?? '-') . "</li>
  <li>RJ45 connectors: " . htmlspecialchars($materials['rj45'] ?? '-') . "</li>
  <li>Patch panels: " . htmlspecialchars($materials['patch_panels'] ?? '-') . "</li>
  <li>Cable managers: " . htmlspecialchars($materials['cable_managers'] ?? '-') . "</li>
  <li>Patch cords: " . htmlspecialchars($materials['patch_cords'] ?? '-') . "</li>
</ul>
<h3>Totals (USD)</h3>
<ul>
  <li>Field services subtotal: " . format_usd($totalsCalculated['labor']) . "</li>
  <li>Location uplift: " . format_usd($totalsCalculated['support']) . "</li>
  <li>Total estimate: " . format_usd($totalsCalculated['total']) . "</li>
</ul>
<p><em>Preliminary only. Final proposal follows on-site survey and cabling path review.</em></p>";

$sent = false;
$errorMsg = '';

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
    }
}

if (!$sent) {
    $sent = mail($to, $subject, $body, $headers);
    if (!$sent && !$errorMsg) {
        $errorMsg = 'mail() failed';
    }
}

@file_put_contents('/tmp/estimate_mail.log', date('c') . " network sent=" . ($sent ? '1' : '0') . " error=" . $errorMsg . "\n", FILE_APPEND);

header('Content-Type: application/json');
if ($sent) {
    echo json_encode([
        "status" => "ok",
        "materials" => $materials,
        "totals" => [
            "labor" => format_usd($totalsCalculated['labor']),
            "support" => format_usd($totalsCalculated['support']),
            "total" => format_usd($totalsCalculated['total'])
        ]
    ]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $errorMsg ?: "Mail failed"]);
}
