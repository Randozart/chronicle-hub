import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import clientPromise from '@/engine/database';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function verifyWorldAccess(worldId: string, requiredRole: 'owner' | 'writer' | 'admin' = 'owner'): Promise<boolean> {
    const session = await getServerSession(authOptions);
    if (!session?.user) return false;
    
    const userId = (session.user as any).id; // This is a String from NextAuth
    
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const world = await db.collection('worlds').findOne(
        { worldId }, 
        { projection: { ownerId: 1, collaborators: 1 } }
    );

    if (!world) return false;

    // 1. Owner Check (Always allowed)
    if (world.ownerId === userId) return true;
    
    // 2. Collaborator Check
    if (world.collaborators && Array.isArray(world.collaborators)) {
        // Ensure we compare strings
        const colab = world.collaborators.find((c: any) => String(c.userId) === String(userId));
        
        if (colab) {
            if (requiredRole === 'writer') return true; 
            if (requiredRole === 'admin' && colab.role === 'admin') return true;
        }
    }
    
    return false;
}