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
        $to = "networkconnectit@gmail.com";
        $subjectLine = "New Contact Form Submission: " . $subject;
        $bodyHtml = "
            <h2>Contact Form Details</h2>
            <p><strong>Name:</strong> $name</p>
            <p><strong>Email:</strong> $email</p>
            <p><strong>Phone:</strong> $phone</p>
            <p><strong>Project:</strong> $project</p>
            <p><strong>Subject:</strong> $subject</p>
            <p><strong>Message:</strong><br>$message</p>
        ";

        $sent = false;
        $errorMsg = '';

        // Primer intento: PHPMailer con SMTP
        $autoload = dirname(__DIR__) . '/vendor/autoload.php';
        if (file_exists($autoload)) {
            require_once $autoload;
            try {
                $mail = new PHPMailer\PHPMailer\PHPMailer(true);
                $mail->isSMTP();
                $mail->Host = 'mail.networkconnectit.com';
                $mail->SMTPAuth = true;
                $mail->Username = 'network@networkconnectit.com';
                $mail->Password = 'CarlosJose2024';
                $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
                $mail->Port = 587;

                $mail->setFrom('network@networkconnectit.com', 'NetworkConnectIT');
                $mail->addAddress($to);
                $mail->addReplyTo($email ?: 'noreply@networkconnectit.com');
                $mail->isHTML(true);
                $mail->Subject = $subjectLine;
                $mail->Body = $bodyHtml;
                $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />', '</p>', '</li>'], "\n", $bodyHtml));
                $mail->send();
                $sent = true;
            } catch (Exception $e) {
                $errorMsg = $mail->ErrorInfo ?: $e->getMessage();
                $sent = false;
            }
        }

        // Segundo intento: mail() nativo
        if (!$sent) {
            $headers = "From: noreply@networkconnectit.com\r\n";
            $headers .= "Reply-To: " . $email . "\r\n";
            $headers .= "Content-Type: text/html; charset=UTF-8";
            $sent = mail($to, $subjectLine, $bodyHtml, $headers);
            if (!$sent && !$errorMsg) {
                $errorMsg = 'mail() failed';
            }
        }

        @file_put_contents('/tmp/sendmail.log', date('c') . " sent=" . ($sent ? '1' : '0') . " error=" . $errorMsg . "\n", FILE_APPEND);

        if ($sent) {
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
