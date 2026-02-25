<?php
// Lightweight endpoint to receive the Smart Budget Configurator data
// and forward it to the ops inbox.

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

// Extract fields
$email   = filter_var($payload['email'] ?? '', FILTER_VALIDATE_EMAIL);
$cams    = intval($payload['cameras'] ?? 0);
$security = htmlspecialchars($payload['security'] ?? '');
$size     = htmlspecialchars($payload['size'] ?? '');
$materials = $payload['materials'] ?? [];
$totals    = $payload['totals'] ?? [];
$extras    = $payload['extras'] ?? [];

if (!$email || $cams <= 0) {
    http_response_code(400);
    exit('Missing required fields');
}

$to = "network@networkconnectit.com";
$subject = "Smart Budget Configurator - Preliminary Estimate";
$headers = "From: noreply@networkconnectit.com\r\n";
$headers .= "Reply-To: " . $email . "\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8";

$extrasList = !empty($extras) ? implode(', ', array_map('htmlspecialchars', $extras)) : 'None';

$body = "<h2>Preliminary Estimate</h2>
<p><strong>Email:</strong> {$email}</p>
<p><strong>Cameras:</strong> {$cams}</p>
<p><strong>Security level:</strong> {$security}</p>
<p><strong>Size:</strong> {$size}</p>
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
  <li>Total: " . htmlspecialchars($totals['total'] ?? '-') . "</li>
</ul>
<p><em>Note: Preliminary estimate; on-site survey required for final proposal.</em></p>";

$sent = mail($to, $subject, $body, $headers);

if ($sent) {
    echo json_encode(["status" => "ok"]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Mail failed"]);
}
