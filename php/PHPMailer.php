<?php
// Legacy contact endpoint retained for compatibility.
// SMTP credentials must be supplied by the hosting environment; never commit them.

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$autoloadPath = dirname(__DIR__) . '/vendor/autoload.php';
if (file_exists($autoloadPath)) {
    require_once $autoloadPath;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit('Method not allowed.');
}

function nci_clean_legacy_field(string $key): string {
    return htmlspecialchars(trim((string)($_POST[$key] ?? '')), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

$name = nci_clean_legacy_field('name');
$emailRaw = trim((string)($_POST['email'] ?? ''));
$email = filter_var($emailRaw, FILTER_VALIDATE_EMAIL);
$phone = nci_clean_legacy_field('phone');
$project = nci_clean_legacy_field('project');
$subject = nci_clean_legacy_field('subject');
$message = nci_clean_legacy_field('message');

if (!$email || preg_match('/[\r\n]/', $emailRaw) || $name === '' || $message === '') {
    http_response_code(400);
    exit('Please provide a valid name, email address, and message.');
}

$smtpHost = getenv('NCI_SMTP_HOST') ?: '';
$smtpUser = getenv('NCI_SMTP_USER') ?: '';
$smtpPassword = getenv('NCI_SMTP_PASSWORD') ?: '';
$smtpPort = (int)(getenv('NCI_SMTP_PORT') ?: 587);
$to = getenv('NCI_CONTACT_TO') ?: 'networkconnectit@gmail.com';

if ($smtpHost === '' || $smtpUser === '' || $smtpPassword === '' || !class_exists(PHPMailer::class)) {
    http_response_code(503);
    exit('Mail service is not configured.');
}

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
    $mail->addReplyTo($email, $name);
    $mail->isHTML(true);
    $mail->Subject = 'NetworkConnectIT Inquiry: ' . ($subject !== '' ? $subject : 'Website contact');
    $mail->Body = '<h2>Website Inquiry</h2>'
        . '<p><strong>Name:</strong> ' . $name . '</p>'
        . '<p><strong>Email:</strong> ' . htmlspecialchars($email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</p>'
        . ($phone !== '' ? '<p><strong>Phone:</strong> ' . $phone . '</p>' : '')
        . ($project !== '' ? '<p><strong>Project:</strong> ' . $project . '</p>' : '')
        . '<p><strong>Message:</strong> ' . nl2br($message) . '</p>';
    $mail->AltBody = trim(strip_tags(str_replace(['<br>', '<br/>', '<br />', '</p>'], "\n", $mail->Body)));
    $mail->send();
    header('Location: /success.html', true, 303);
    exit;
} catch (Throwable $e) {
    error_log('NetworkConnectIT legacy mail delivery failed');
    header('Location: /failed.html', true, 303);
    exit;
}
