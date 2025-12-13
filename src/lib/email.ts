import { Resend } from 'resend';

// Initialize Resend with your API Key
// We reuse SMTP_PASS since it already holds your 're_...' key
const resend = new Resend(process.env.SMTP_PASS);

export const sendVerificationEmail = async (email: string, token: string) => {
    // 1. Construct Link
    const baseUrl = process.env.NEXTAUTH_URL; 
    
    if (!baseUrl) {
        console.error("❌ NEXTAUTH_URL is missing. Email link will be broken.");
    }

    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    // 2. DEV MODE: Log to console if no API Key is present
    if (!process.env.SMTP_PASS) {
        console.log("========================================");
        console.log("📧 [DEV EMAIL] Verification Link:");
        console.log(verifyUrl);
        console.log("========================================");
        return;
    }

    // 3. PRODUCTION: Send via Resend SDK (HTTP Port 443)
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.SMTP_FROM || 'Chronicle Hub <noreply@resend.dev>',
            to: email,
            subject: 'Verify your Chronicle Hub account',
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
                    <h2>Welcome to Chronicle Hub</h2>
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