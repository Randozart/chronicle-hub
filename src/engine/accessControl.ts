import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/engine/database';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function verifyWorldAccess(worldId: string, requiredRole: 'owner' | 'writer' | 'admin' = 'owner'): Promise<boolean> {
    const session = await getServerSession(authOptions);
    if (!session?.user) return false;
    const userId = (session.user as any).id;

    // 1. Admin Override (Optional: Hardcode your ID for god mode)
    // if (userId === "YOUR_ADMIN_ID") return true;

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // 2. Fetch World Owner
    const world = await db.collection('worlds').findOne(
        { worldId }, 
        { projection: { ownerId: 1, collaborators: 1 } }
    );

    if (!world) return false;

    // 3. Check Owner
    if (world.ownerId === userId) return true;

    // 4. Check Collaborators
    if (world.collaborators) {
        const colab = world.collaborators.find((c: any) => c.userId === userId);
        if (colab) {
            // Owners allow everything. 
            // If requiredRole is 'owner', only owners pass.
            // If requiredRole is 'writer', writers and admins pass.
            
            if (requiredRole === 'writer') return true; 
            if (requiredRole === 'admin' && colab.role === 'admin') return true;
        }
    }

    return false;
}