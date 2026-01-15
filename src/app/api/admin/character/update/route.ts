import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { verifyWorldAccess } from '@/engine/accessControl';
import clientPromise from '@/engine/database';
import { QualityType } from '@/engine/models';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const COLLECTION_NAME = 'characters';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { storyId, characterId, qualityId, value } = body;

        if (!storyId || !characterId || !qualityId || value === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const canEdit = await verifyWorldAccess(storyId, 'writer');
        if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const isStringUpdate = typeof value === 'string';
        const updateDoc: any = {};

        if (isStringUpdate) {
            updateDoc[`qualities.${qualityId}.stringValue`] = value;
            updateDoc[`qualities.${qualityId}.type`] = QualityType.String;
        } else {
            updateDoc[`qualities.${qualityId}.level`] = Number(value);
            updateDoc[`qualities.${qualityId}.type`] = QualityType.Pyramidal;
        }
        updateDoc[`qualities.${qualityId}.qualityId`] = qualityId;
        const result = await db.collection(COLLECTION_NAME).updateOne(
            { characterId, storyId },
            { 
                $set: updateDoc,
                $setOnInsert: {
                    [`qualities.${qualityId}.changePoints`]: 0
                }
            }
        );

        if (result.modifiedCount > 0 || result.upsertedCount > 0) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Character not found or value unchanged' }, { status: 404 });
        }

    } catch (e) {
        console.error("Error in /api/admin/character/update:", e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}