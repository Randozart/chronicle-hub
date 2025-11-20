// src/engine/userService.ts

import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const COLLECTION_NAME = 'users';

interface UserDocument {
    _id: ObjectId;
    // ... other user fields
}

// This function finds a user by their string ID.
export const findUserById = async (userId: string): Promise<UserDocument | null> => {
    try {
        if (!ObjectId.isValid(userId)) {
            return null; // Invalid ID format
        }

        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const usersCollection = db.collection<UserDocument>(COLLECTION_NAME);

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        
        return user;
    } catch (e) {
        console.error('Database error finding user by ID:', e);
        return null;
    }
};