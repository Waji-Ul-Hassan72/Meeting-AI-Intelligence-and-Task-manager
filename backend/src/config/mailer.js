const nodemailer = require("nodemailer");
require("dotenv").config();

// ============================================================
// CREATE SMTP TRANSPORTER
// ============================================================

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",

    port: Number(process.env.SMTP_PORT) || 587,

    secure:
        String(process.env.SMTP_SECURE).toLowerCase() === "true",

    auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass:
            process.env.SMTP_PASSWORD ||
            process.env.EMAIL_PASS
    },

    pool: true,

    maxConnections: 5,

    maxMessages: 100
});

// ============================================================
// VERIFY SMTP
// ============================================================

transporter.verify((error) => {
    if (error) {
        console.error(
            "❌ Mailer SMTP Verification Error:",
            error.message
        );
    } else {
        console.log(
            "✅ Mailer is ready to send emails"
        );
    }
});

// ============================================================
// SEND EMAIL
// ============================================================

const sendEmail = async (to, subject, html) => {
    if (!to) {
        throw new Error("Email recipient is required.");
    }

    if (!subject) {
        throw new Error("Email subject is required.");
    }

    if (!html) {
        throw new Error("Email HTML content is required.");
    }

    const fromEmail =
        process.env.SMTP_FROM ||
        process.env.SMTP_USER ||
        process.env.EMAIL_USER;

    if (!fromEmail) {
        throw new Error(
            "SMTP_FROM or SMTP_USER is missing from .env"
        );
    }

    try {
        const info = await transporter.sendMail({
            from: `"AI Meeting Intelligence" <${fromEmail}>`,
            to: to,
            subject: subject,
            html: html
        });

        console.log(
            "📧 Email sent successfully. MessageID:",
            info.messageId
        );

        return info;

    } catch (error) {
        console.error(
            "❌ Error sending email:",
            error.message
        );

        throw error;
    }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    transporter,
    sendEmail
};

