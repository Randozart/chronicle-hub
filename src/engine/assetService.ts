import clientPromise from '@/engine/database';
import { InstrumentDefinition, LigatureTrack } from './audio/models';
import { ObjectId } from 'mongodb';
import { AssetType, GlobalAsset } from './models';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';



export async function getUserAssets(userId: string): Promise<GlobalAsset[]> {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const user = await db.collection('users').findOne(
        { _id: new ObjectId(userId) },
        { projection: { assets: 1 } }
    );

    return (user?.assets as GlobalAsset[]) || [];
}

export async function saveUserAsset(
    userId: string, 
    assetId: string, 
    type: AssetType, 
    folder: string,
    data: any
): Promise<boolean> {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const newAsset: GlobalAsset = {
        id: assetId,
        type,
        folder: folder || "Root",
        data: { ...data, id: assetId },
        lastModified: new Date()
    };
    
    // Remove existing with same ID to update
    await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $pull: { assets: { id: assetId } } as any }
    );

    const result = await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $push: { assets: newAsset } as any }
    );

    return result.acknowledged;
}

export async function deleteUserAsset(userId: string, assetId: string): Promise<boolean> {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const result = await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $pull: { assets: { id: assetId } } as any }
    );

    return result.acknowledged;
}