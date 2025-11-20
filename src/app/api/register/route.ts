// src/app/api/register/route.ts

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import bcrypt from 'bcrypt';
import { PlayerQualities, StringQualityState, PyramidalQualityState, QualityType } from '@/engine/models';

const newPlayerQualities: PlayerQualities = {
    'player_name': { qualityId: 'player_name', type: QualityType.String, stringValue: "" }, // Will be set to username
    'player_first_name': { qualityId: 'player_first_name', type: QualityType.String, stringValue: "" },
    'scholar': { qualityId: 'scholar', type: QualityType.Pyramidal, level: 0, changePoints: 0 },
    'fellowship': { qualityId: 'fellowship', type: QualityType.Pyramidal, level: 0, changePoints: 0 },
    'wounds': { qualityId: 'wounds', type: QualityType.Pyramidal, level: 0, changePoints: 0 },
    'charm': { qualityId: 'charm', type: QualityType.Pyramidal, level: 0, changePoints: 0 },
};

export async function POST(request: NextRequest) {
    try {
        const { username, email, password } = await request.json();

        if (!username || !email || !password) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
        const usersCollection = db.collection('users');

        // Check if user already exists
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the new user document
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