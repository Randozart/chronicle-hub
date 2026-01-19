import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';

export const revalidate = 60; 

const DEFAULT_TOS = `
# TERMS OF SERVICE (Algemene Voorwaarden)

**Last Updated:** ${new Date().toLocaleDateString()}

## 1. Introduction & Applicability
1. These Terms constitute a binding legal agreement between you ("User") and **ChronicleHub** (operated by a private individual residing in Cuijk, The Netherlands).
2. By registering, accessing the Platform, or using Guest Mode, you accept these Terms.
3. **Court of Jurisdiction:** All disputes shall be submitted to the competent court of **Rechtbank Oost-Brabant** ('s-Hertogenbosch).

## 2. Age Requirements
1. You must be at least **16 years old** to use this service.
2. You must be at least **18 years old** to access content flagged as "Mature" or "Erotica".

## 3. Content Policy (Visuals vs Text)
1. **Text:** Mature themes in text are permitted provided they comply with Dutch Law.
2. **Visuals:** We strictly **PROHIBIT** photographs or photorealistic images depicting real human beings in sexual acts, nudity, or extreme violence/gore.
3. **Moderation:** We reserve the right to remove any content for any reason ("The Magic Rule") to protect the platform's reputation.

## 4. Guest Mode
Guest progress is stored in your browser's Local Storage. We accept **zero liability** for data loss caused by clearing cache, updates, or technical errors.

## 5. Liability
ChronicleHub acts as a Hosting Service under **Article 6:196c BW**. We do not monitor content prior to publication and are not liable for user uploads unless we have actual knowledge of illegality and fail to act.
`;

export async function GET(request: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
        
        const doc = await db.collection('system_config').findOne({ _id: "terms_of_service" as any });
        
        return NextResponse.json({ 
            content: doc?.content || DEFAULT_TOS,
            updatedAt: doc?.updatedAt || new Date()
        });
    } catch (e) {
        return NextResponse.json({ content: DEFAULT_TOS });
    }
}