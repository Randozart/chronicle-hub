import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sendContactConfirmation, sendContactEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const body = await request.json();
        const { subject, message, email } = body;

        if (!message || message.length < 10) {
            return NextResponse.json({ error: "Message too short" }, { status: 400 });
        }

        let senderEmail = email;
        let senderName = "Guest";

        if (session?.user) {
            senderEmail = session.user.email;
            senderName = session.user.name || "User";
        }

        if (!senderEmail) {
            return NextResponse.json({ error: "Email required for guests" }, { status: 400 });
        }

        await Promise.all([
            sendContactEmail(senderEmail, senderName, subject || "General Inquiry", message),
            sendContactConfirmation(senderEmail, senderName, subject || "General Inquiry", message)
        ]);

        return NextResponse.json({ success: true, emailSentTo: senderEmail });
    } catch (e) {
        console.error("Contact API Error:", e);
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }
}