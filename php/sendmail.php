<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    // Honeypot field (anti-spam)
    if (!empty($_POST['website'])) {
        exit; // Es un bot
    }

    // reCAPTCHA v2 backend verification
    $recaptchaResponse = $_POST['g-recaptcha-response'] ?? '';
    $secretKey = '6Lc3pUoqAAAAAJTyWRL1fsh0jXqTqaCrxmxdAr8U';
    $verifyURL = 'https://www.google.com/recaptcha/api/siteverify';
    $response = file_get_contents($verifyURL . '?secret=' . $secretKey . '&response=' . $recaptchaResponse);
    $responseKeys = json_decode($response, true);

    // Sanitizar inputs
    $name = htmlspecialchars(trim($_POST['name'] ?? ''));
    $email = filter_var(trim($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL);
    $phone = htmlspecialchars(trim($_POST['phone'] ?? ''));
    $project = htmlspecialchars(trim($_POST['project'] ?? ''));
    $subject = htmlspecialchars(trim($_POST['subject'] ?? ''));
    $message = htmlspecialchars(trim($_POST['message'] ?? ''));

    // Validación de campos
    if (!empty($email) && !empty($message) && isset($responseKeys["success"]) && $responseKeys["success"]) {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo "Invalid email address.";
            exit;
        }

        // Protege contra inyecciones de cabecera
        if (preg_match("/[\r\n]/", $email)) {
            echo "Invalid email input.";
            exit;
        }

        // Configuración del email
        $to = "network@networkconnectit.com";
        $headers = "From: noreply@networkconnectit.com\r\n";
        $headers .= "Reply-To: " . $email . "\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8";

        $email_subject = "New Contact Form Submission: " . $subject;
        $email_body = "
            <h2>Contact Form Details</h2>
            <p><strong>Name:</strong> $name</p>
            <p><strong>Email:</strong> $email</p>
            <p><strong>Phone:</strong> $phone</p>
            <p><strong>Project:</strong> $project</p>
            <p><strong>Subject:</strong> $subject</p>
            <p><strong>Message:</strong><br>$message</p>
        ";

        if (mail($to, $email_subject, $email_body, $headers)) {
            header('Location: /success.html');
            exit;
        } else {
            header('Location: /failed.html');
            exit;
        }
    } else {
       echo "<script>alert('Please verify reCAPTCHA and required fields.'); window.history.back();</script>";
       exit;

    }
}
?>

