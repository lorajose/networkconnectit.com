<?php
require 'vendor/phpmailer/phpmailer/src/PHPMailer.php';
require 'vendor/phpmailer/phpmailer/src/SMTP.php';
require 'vendor/phpmailer/phpmailer/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;


require 'vendor/autoload.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = htmlspecialchars($_POST['name']);
    $email = htmlspecialchars($_POST['email']);
    $phone = htmlspecialchars($_POST['phone']);
    $project = htmlspecialchars($_POST['project']);
    $subject = htmlspecialchars($_POST['subject']);
    $message = htmlspecialchars($_POST['message']);

    if (!empty($email) && !empty($message)) {
        $mail = new PHPMailer(true);

        try {
            // Configuración del servidor SMTP
            $mail->isSMTP();
            $mail->Host = 'mail.networkconnectit.com';
            $mail->SMTPAuth = true;
            $mail->Username = 'network@networkconnectit.com';  // Tu correo SMTP
            $mail->Password = 'CarlosJose2024';  // Tu contraseña SMTP
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; // o PHPMailer::ENCRYPTION_SMTPS para SSL
            $mail->Port = 587; // o 465 para SSL

            // Remitente y destinatario
            $mail->setFrom($email, $name);
            $mail->addAddress('your-email@domain.com');  // Tu correo de recepción

            // Contenido del correo
            $mail->isHTML(true);
            $mail->Subject = 'New Contact Form Submission: ' . $subject;
            $mail->Body = "<h2>Contact Form Details</h2>
                          <p><strong>Name:</strong> $name</p>
                          <p><strong>Email:</strong> $email</p>
                          <p><strong>Phone:</strong> $phone</p>
                          <p><strong>Project:</strong> $project</p>
                          <p><strong>Subject:</strong> $subject</p>
                          <p><strong>Message:</strong> $message</p>";

            $mail->send();
            echo "Message Sent Successfully!";
        } catch (Exception $e) {
            echo "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
        }
    } else {
        echo "Please fill all required fields.";
    }
}
?>
