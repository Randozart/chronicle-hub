import clientPromise from '@/engine/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export type LazarusPermission = 'none' | 'full' | 'specific';

export async function verifyLazarusAccess(worldId?: string): Promise<{ access: boolean, role: LazarusPermission, allowedWorlds: string[] }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { access: false, role: 'none', allowedWorlds: [] };

    const userId = (session.user as any).id;
    const userEmail = session.user.email;

    // 1. SysAdmin Override
    if (ADMIN_EMAIL && userEmail === ADMIN_EMAIL) {
        return { access: true, role: 'full', allowedWorlds: ['*'] };
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!user) return { access: false, role: 'none', allowedWorlds: [] };

    const roles = user.roles || [];
    const tags = user.accessTags || [];

    // 2. Full Archivist Access
    if (roles.includes('owner') || roles.includes('admin') || roles.includes('archivist')) {
        return { access: true, role: 'full', allowedWorlds: ['*'] };
    }

    // 3. Specific World Access (author:world_name)
    const allowedWorlds = tags
        .filter((t: string) => t.startsWith('author:'))
        .map((t: string) => t.split(':')[1]);

    if (allowedWorlds.length > 0) {
        // If checking a specific world, verify match
        if (worldId) {
            if (allowedWorlds.includes(worldId)) {
                return { access: true, role: 'specific', allowedWorlds };
            }
            return { access: false, role: 'specific', allowedWorlds };
        }
        // If just checking general access to the tool
        return { access: true, role: 'specific', allowedWorlds };
    }

    return { access: false, role: 'none', allowedWorlds: [] };
}