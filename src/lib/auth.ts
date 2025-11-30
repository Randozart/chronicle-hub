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
}

export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
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
    session: { strategy: "jwt" },
    pages: {
      signIn: "/login",
      error: "/login", 
    },
    callbacks: {
        async signIn({ user }) {
            if (!user.email) return false;
            return await isEmailWhitelisted(user.email);
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