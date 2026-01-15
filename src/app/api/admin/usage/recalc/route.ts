import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';

export async function GET(request: NextRequest) {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Dev mode only' }, { status: 403 });
    }
    console.log(`[API: GET /admin/usage/recalc] Triggering storage usage recalculation.`);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
    const collection = db.collection('users');
    const users = await collection.find({ assets: { $exists: true, $not: { $size: 0 } } }).toArray();
    
    let updates = 0;

    for (const user of users) {
        const assets = user.assets as any[] || [];
        const totalSize = assets.reduce((acc, asset) => acc + (asset.size || 0), 0);
        
        if (totalSize > 0) {
            await collection.updateOne(
                { _id: user._id },
                { $set: { storageUsage: totalSize } }
            );
            updates++;
        }
    }

    return NextResponse.json({ 
        success: true, 
        message: `Recalculated usage for ${updates} users.` 
    });
}