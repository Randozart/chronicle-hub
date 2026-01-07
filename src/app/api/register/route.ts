import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import bcrypt from 'bcrypt';
import { isEmailWhitelisted } from '@/engine/whitelistService';
import { validatePassword } from '@/utils/validation';
import { v4 as uuidv4 } from 'uuid';
import { sendVerificationEmail } from '@/lib/email'; // <--- IMPORT THIS

export async function POST(request: NextRequest) {
    try {
        const { username, email, password } = await request.json();
        console.log(`[API: POST /register] Registration attempt for email: ${email}, username: ${username}.`);

        if (!username || !email || !password) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        // 1. Validation
        const passError = validatePassword(password);
        if (passError) {
            return NextResponse.json({ message: passError }, { status: 400 });
        }

        // // 2. Whitelist Check
        // if (!await isEmailWhitelisted(email)) {
        //      return NextResponse.json({ message: 'Invite Only: Your email is not on the list.' }, { status: 403 });
        // }

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
        const usersCollection = db.collection('users');

        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = uuidv4();

        const newUserDocument = {
            username,
            email,
            password: hashedPassword,
            createdAt: new Date(),
            emailVerified: null, 
            verificationToken: verificationToken
        };

        await usersCollection.insertOne(newUserDocument);

        // 3. Send Email
        try {
            await sendVerificationEmail(email, verificationToken);
        } catch (emailError) {
            console.error("⚠️ Registration succeeded, but email failed to send:", emailError);
            // We do NOT fail the request. The user exists, but can't verify yet.
            // They might need a "Resend Email" button later.
        }

        return NextResponse.json({ 
            message: 'User registered successfully. Please check your email.' 
        }, { status: 201 });

    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}