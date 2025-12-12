import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.resend.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    // If port is 465, secure must be true. For 587, it must be false.
    secure: process.env.SMTP_PORT === '465', 
    auth: {
        user: process.env.SMTP_USER || 'resend',
        pass: process.env.SMTP_PASS,
    },
});

export const sendVerificationEmail = async (email: string, token: string) => {
    // Ensure this Env Var is set in Coolify!
    const baseUrl = process.env.NEXTAUTH_URL; 
    
    if (!baseUrl) {
        console.error("❌ NEXTAUTH_URL is missing. Email link will be broken.");
    }

    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    // 1. DEV MODE: Log to console if no API Key
    if (!process.env.SMTP_PASS) {
        console.log("========================================");
        console.log("📧 [DEV EMAIL] Verification Link:");
        console.log(verifyUrl);
        console.log("========================================");
        return;
    }

    // 2. PRODUCTION: Send via Resend
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'Chronicle Hub <noreply@chroniclehubgames.com>',
            to: email,
            subject: 'Verify your Chronicle Hub account',
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
                    <h2>Welcome to Chronicle Hub</h2>
                    <p>You are one step away from accessing the platform. Please verify your e-mail with the link below.</p>
                    <div style="margin: 30px 0;">
                        <a href="${verifyUrl}" style="background: #2a3e5c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Account</a>
                    </div>
                    <p style="font-size: 0.8rem; color: #777;">Link didn't work? Paste this into your browser:</p>
                    <p style="font-size: 0.8rem; color: #555; word-break: break-all;">${verifyUrl}</p>
                </div>
            `,
        });
        console.log(`✅ Email sent to ${email}`);
    } catch (err) {
        console.error("❌ Failed to send email via Resend:", err);
        // We do not throw error here, so the user flow isn't blocked.
    }
};