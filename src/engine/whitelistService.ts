import clientPromise from '@/engine/database';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function isEmailWhitelisted(email: string): Promise<boolean> {
    if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL) {
        return true;
    }
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const entry = await db.collection('whitelist').findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });

    return !!entry;
}

export async function addToWhitelist(email: string) {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db.collection('whitelist').updateOne(
        { email: email.toLowerCase() },
        { $set: { email: email.toLowerCase(), addedAt: new Date() } },
        { upsert: true }
    );
}