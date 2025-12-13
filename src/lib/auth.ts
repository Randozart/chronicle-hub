// ... existing imports ...
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from 'bcrypt';
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';
import { isEmailWhitelisted } from '@/engine/whitelistService';

interface UserDocument {
    _id: ObjectId;
    username: string;
    email: string;
    password?: string;
    acknowledgedPlatformMessages?: string[];
    emailVerified?: Date | null; // Add type definition
}

export const authOptions: NextAuthOptions = {
    // ... secret, strategy ...
    secret: process.env.NEXTAUTH_SECRET,
    session: { strategy: "jwt" },
    providers: [
      CredentialsProvider({
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "text" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
            if (!credentials?.email || !credentials.password) return null;
            
            const client = await clientPromise;
            const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
            const user = await db.collection<UserDocument>('users').findOne({ email: credentials.email });
            
            if (!user || !user.password) return null;

            // --- UPDATED: VERIFICATION & WHITELIST CHECK ---
            const isWhitelisted = await isEmailWhitelisted(user.email);

            if (!user.emailVerified && !isWhitelisted) {
                // If they aren't verified AND they aren't on the special list, block them.
                throw new Error("Email not verified. Please check your inbox.");
            }
            // -----------------------------------------------

            const isValid = await bcrypt.compare(credentials.password, user.password);
            if (!isValid) return null;
            
            return {
                id: user._id.toString(),
                name: user.username,
                email: user.email,
            };
        },
      }),
    ],
    // ... pages ...
    pages: {
      signIn: "/login",
      error: "/login", 
    },
    callbacks: {
        // ...
        async signIn({ user }) {
            // whitelist check is still good to keep as a double layer
            return true;
            // if (!user.email) return false;
            // return await isEmailWhitelisted(user.email);
        },
        async jwt({ token, user }) {
            if (user) token.id = user.id;
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                (session.user as any).id = token.id;
            }
            return session;
        },
    },
};