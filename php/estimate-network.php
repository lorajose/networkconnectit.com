<?php
// Endpoint for Smart Budget Configurator · Network (service.html)
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
    $keystones = $activeDrops;
    $labels = $activeDrops;
    $velcroRolls = max(1, (int)ceil($activeDrops / 80));

    return [
        'boxes' => $cat6Boxes,
        'rj45' => $rj45,
        'patch_panels' => $patchPanels,
        'cable_managers' => $cableManagers,
        'patch_cords' => $patchCords,
        'keystones' => $keystones,
        'labels' => $labels,
        'velcro_rolls' => $velcroRolls,
        'misc' => "Patch panels: {$patchPanels}, cable managers: {$cableManagers}, patch cords: {$patchCords}, keystones: {$keystones}, labels: {$labels}, velcro rolls: {$velcroRolls}"
    ];
}

$name      = trim($payload['name'] ?? '');
$email     = filter_var($payload['email'] ?? '', FILTER_VALIDATE_EMAIL);
$switches  = intval($payload['switches'] ?? 0);
$messLevelRaw = (string)($payload['mess'] ?? $payload['security'] ?? 'low');
$messLevel = htmlspecialchars($messLevelRaw);
$location  = htmlspecialchars((string)($payload['location'] ?? ''));
$totals    = $payload['totals'] ?? [];
$materials = calculate_materials($switches, $messLevelRaw);

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
<p><strong>Email:</strong> {$email}</p>
<p><strong>Switch count (1U-4U):</strong> {$switches}</p>
<p><strong>Cable mess level:</strong> {$messLevel}</p>
<p><strong>Location:</strong> {$location}</p>
<h3>Materials</h3>
<ul>
  <li>Cat6 boxes: " . htmlspecialchars($materials['boxes'] ?? '-') . "</li>
  <li>RJ45 connectors: " . htmlspecialchars($materials['rj45'] ?? '-') . "</li>
  <li>Patch panels: " . htmlspecialchars($materials['patch_panels'] ?? '-') . "</li>
  <li>Cable managers: " . htmlspecialchars($materials['cable_managers'] ?? '-') . "</li>
  <li>Patch cords: " . htmlspecialchars($materials['patch_cords'] ?? '-') . "</li>
  <li>Keystone jacks: " . htmlspecialchars($materials['keystones'] ?? '-') . "</li>
  <li>Cable labels: " . htmlspecialchars($materials['labels'] ?? '-') . "</li>
  <li>Velcro rolls: " . htmlspecialchars($materials['velcro_rolls'] ?? '-') . "</li>
  <li>Misc parts summary: " . htmlspecialchars($materials['misc'] ?? '-') . "</li>
</ul>
<h3>Totals (USD)</h3>
<ul>
  <li>Labor/Field services: " . htmlspecialchars($totals['labor'] ?? '-') . "</li>
  <li>Location uplift: " . htmlspecialchars($totals['support'] ?? '-') . "</li>
  <li>Total estimate: " . htmlspecialchars($totals['total'] ?? $totals['total_estimate'] ?? '-') . "</li>
</ul>
<p><em>Note: Preliminary estimate; final proposal requires on-site survey for cabling paths and mounting.</em></p>";

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
    echo json_encode(["status" => "ok", "materials" => $materials]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $errorMsg ?: "Mail failed"]);
}
