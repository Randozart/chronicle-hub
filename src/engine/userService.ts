import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';
import { UserDocument } from '@/engine/models';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const COLLECTION_NAME = 'users';

export const findUserById = async (userId: string): Promise<UserDocument | null> => {
    try {
        if (!ObjectId.isValid(userId)) {
            return null; 
        }

        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const user = await db.collection<UserDocument>(COLLECTION_NAME).findOne({ _id: new ObjectId(userId) });
        
        return user;
    } catch (e) {
        console.error('Database error finding user by ID:', e);
        return null;
    }
};