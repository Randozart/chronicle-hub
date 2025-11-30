import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import bcrypt from 'bcrypt';
import { isEmailWhitelisted } from '@/engine/whitelistService';
import { validatePassword } from '@/utils/validation'; // <--- Import
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const { username, email, password } = await request.json();

        if (!username || !email || !password) {
            return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
        }

        // 1. Password Strength Check
        const passError = validatePassword(password);
        if (passError) {
            return NextResponse.json({ message: passError }, { status: 400 });
        }

        // 2. Whitelist Check
        if (!await isEmailWhitelisted(email)) {
             return NextResponse.json({ message: 'Invite Only: Email not on list.' }, { status: 403 });
        }

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
        
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return NextResponse.json({ message: 'Email already registered' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = uuidv4(); // Generate Token

        const newUserDocument = {
            username,
            email,
            password: hashedPassword,
            createdAt: new Date(),
            emailVerified: null, // Null means unverified
            verificationToken: verificationToken
        };

        await db.collection('users').insertOne(newUserDocument);

        // 3. Send Email
        // await sendVerificationEmail(email, verificationToken);

        // return NextResponse.json({ 
        //     message: 'Account created. Please check your email to verify.', 
        //     userId: verificationToken 
        // }, { status: 201 });

    } catch (error) {
        console.error('Register Error:', error);
        return NextResponse.json({ message: 'Internal Error' }, { status: 500 });
    }
}