import clientPromise from '@/engine/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function verifyWorldAccess(
    worldId: string, 
    requiredPermission: 'reader' | 'writer' | 'owner' = 'writer'
): Promise<boolean> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return false;
    
    const userId = (session.user as any).id;
    const userEmail = session.user.email;

    // 1. SYSADMIN MODE
    // If this is the System Admin defined in .env, they can do ANYTHING.
    if (ADMIN_EMAIL && userEmail === ADMIN_EMAIL) {
        return true; 
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    // 2. FETCH WORLD
    const world = await db.collection('worlds').findOne({ worldId });
    if (!world) return false;

    // 3. OPEN SOURCE CHECK (The Guest/Alt Fix)
    // This part does NOT require a session.
    if (requiredPermission === 'reader') {
        const settings = world.settings || {};
        if (settings.isOpenSource && world.published) {
            return true; // Grant access even if session is null
        }
    }

    // 4. DATABASE SYSTEM ROLE CHECK
    // Check if the user has specific roles granted in the DB
    const userProfile = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    
    if (userProfile && userProfile.roles) {
        if (userProfile.roles.includes('owner') || userProfile.roles.includes('admin')) {
            return true; 
        }
    }

    // 5. WORLD OWNER CHECK
    if (world.ownerId === userId) {
        return true;
    }

    // 6. COLLABORATOR CHECK
    if (requiredPermission === 'owner') {
        return false; 
    }

    const collaborators = world.collaborators || [];
    const userCollab = collaborators.find((c: any) => c.userId === userId);

    if (userCollab) {
        if (requiredPermission === 'writer' && userCollab.role === 'reader') {
            return false;
        }
        return true;
    }

    return false;
}