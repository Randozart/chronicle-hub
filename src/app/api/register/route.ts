import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import bcrypt from 'bcrypt';
import { isEmailWhitelisted } from '@/engine/whitelistService'; // <--- Import this

export async function POST(request: NextRequest) {
    try {
        const { username, email, password } = await request.json();

        if (!username || !email || !password) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        // --- 1. WHITELIST CHECK ---
        const isAllowed = await isEmailWhitelisted(email);
        if (!isAllowed) {
             return NextResponse.json({ message: 'Invite Only: Your email is not on the list.' }, { status: 403 });
        }
        // --------------------------

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
        const usersCollection = db.collection('users');

        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUserDocument = {
            username,
            email,
            password: hashedPassword,
            createdAt: new Date(),
        };

        const result = await usersCollection.insertOne(newUserDocument);

        return NextResponse.json({ message: 'User registered successfully', userId: result.insertedId }, { status: 201 });

    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}