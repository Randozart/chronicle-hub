import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth"; // <--- UPDATE THIS IMPORT
import clientPromise from '@/engine/database';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function verifyWorldAccess(worldId: string, requiredRole: 'owner' | 'writer' | 'admin' = 'owner'): Promise<boolean> {
    const session = await getServerSession(authOptions);

    // DEBUG LOG: Check if session is actually loading
    // console.log("Access Check:", { worldId, userId: (session?.user as any)?.id });

    if (!session?.user) return false;
    const userId = (session.user as any).id;

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const world = await db.collection('worlds').findOne(
        { worldId }, 
        { projection: { ownerId: 1, collaborators: 1 } }
    );

    if (!world) return false;

    if (world.ownerId === userId) return true;
    
    if (world.collaborators) {
        const colab = world.collaborators.find((c: any) => c.userId === userId);
        if (colab) {
            if (requiredRole === 'writer') return true; 
            if (requiredRole === 'admin' && colab.role === 'admin') return true;
        }
    }
    
    return false;
}