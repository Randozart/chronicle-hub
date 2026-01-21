import { Resend } from 'resend';
const resend = new Resend(process.env.SMTP_PASS);

export const sendVerificationEmail = async (email: string, token: string) => {
    const baseUrl = process.env.NEXTAUTH_URL; 
    
    if (!baseUrl) {
        console.error("❌ NEXTAUTH_URL is missing. Email link will be broken.");
    }

    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
    if (!process.env.SMTP_PASS) {
        console.log("========================================");
        console.log("📧 [DEV EMAIL] Verification Link:");
        console.log(verifyUrl);
        console.log("========================================");
        return;
    }
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.SMTP_FROM || 'Chronicle Hub <noreply@resend.dev>',
            to: email,
            subject: 'Verify your Chronicle Hub account',
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
                    <h2>Welcome to ChronicleHub</h2>
                    <p>You are one step away from accessing the platform. Please verify your email with the link below.</p>
                    <div style="margin: 30px 0;">
                        <a href="${verifyUrl}" style="background: #2a3e5c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Account</a>
                    </div>
                    <p style="font-size: 0.8rem; color: #777;">Link didn't work? Paste this into your browser:</p>
                    <p style="font-size: 0.8rem; color: #555; word-break: break-all;">${verifyUrl}</p>
                </div>
            `,
        });

        if (error) {
            console.error("❌ Resend API Error:", error);
            return;
        }

        console.log(`✅ Email sent to ${email} (ID: ${data?.id})`);
    } catch (err) {
        console.error("❌ Unexpected Email Error:", err);
    }
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
    const baseUrl = process.env.NEXTAUTH_URL;
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    if (!process.env.SMTP_PASS) {
        console.log("=== [DEV EMAIL] Password Reset ===");
        console.log(resetUrl);
        return;
    }

    try {
        await resend.emails.send({
            from: process.env.SMTP_FROM || 'ChronicleHub <noreply@chroniclehub.dev>',
            to: email,
            subject: 'Reset your Chronicle Hub Password',
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Password Reset Request</h2>
                    <p>We received a request to reset your password. Click below to proceed.</p>
                    <p><a href="${resetUrl}">Reset Password</a></p>
                    <p>This link expires in 1 hour.</p>
                </div>
            `,
        });
    } catch (err) {
        console.error("Email Error:", err);
    }
};

export const sendContactEmail = async (userEmail: string, username: string, subject: string, message: string) => {
    const adminEmail = process.env.ADMIN_EMAIL; 
    
    if (!process.env.SMTP_PASS) {
        console.log("=== [DEV EMAIL] Contact Form ===");
        console.log(`From: ${username} (${userEmail})`);
        console.log(`Subject: ${subject}`);
        console.log(`Message: ${message}`);
        return;
    }

    try {
        await resend.emails.send({
            from: process.env.SMTP_FROM || 'ChronicleHub <noreply@resend.dev>',
            
            to: adminEmail as string, 
            
            replyTo: userEmail, 
            
            subject: `[ChronicleHub Support] ${subject}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                    <h3 style="color: #2a3e5c;">New Message from ${username}</h3>
                    <p><strong>Email:</strong> ${userEmail}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <div style="white-space: pre-wrap; color: #333;">${message}</div>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 0.8rem; color: #777;">
                        To reply to the user, simply click Reply in your email client.
                    </p>
                </div>
            `,
        });
    } catch (err) {
        console.error("Contact Email Error:", err);
        throw new Error("Failed to send email");
    }
};

export const sendContactConfirmation = async (userEmail: string, username: string, subject: string, originalMessage: string) => {
    if (!process.env.SMTP_PASS) {
        console.log("=== [DEV EMAIL] Sending User Receipt ===");
        console.log(`To: ${userEmail}`);
        return;
    }

    try {
        await resend.emails.send({
            from: process.env.SMTP_FROM || 'ChronicleHub <noreply@resend.dev>',
            to: userEmail,
            subject: `[Received] ${subject}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 5px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2a3e5c; margin-top: 0;">We received your message</h2>
                    <p>Hi ${username},</p>
                    <p>Thank you for contacting ChronicleHub Support. We have received your message regarding "<strong>${subject}</strong>" and will get back to you as soon as possible.</p>
                    
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; font-size: 0.9rem; color: #555;">
                        <strong>Your Message:</strong><br/>
                        ${originalMessage.replace(/\n/g, '<br/>')}
                    </div>
                    
                    <p style="font-size: 0.8rem; color: #777; margin-top: 20px;">
                        This is an automated receipt. Please do not reply to this specific email.
                    </p>
                </div>
            `,
        });
    } catch (err) {
        console.error("Confirmation Email Error:", err);
    }
};