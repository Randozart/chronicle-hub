// src/app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from 'bcrypt';
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';
import { findUserById } from "@/engine/userService"; // <-- IMPORT our new function
import { isEmailWhitelisted } from "@/engine/whitelistService";

// Define our User document structure from the DB
interface UserDocument {
    _id: ObjectId;
    username: string;
    email: string;
    password?: string; // Password is not always returned
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
            if (!credentials?.email || !credentials.password) {
                return null;
            }
            
            const client = await clientPromise;
            const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
            const usersCollection = db.collection<UserDocument>('users');
            
            const user = await usersCollection.findOne({ email: credentials.email });

            if (!user || !user.password) {
                return null;
            }

            const isValid = await bcrypt.compare(credentials.password, user.password);
            
            if (!isValid) {
                return null;
            }
            
            // Return a user object that NextAuth understands
            return {
                id: user._id.toString(),
                name: user.username,
                email: user.email,
            };
        },
      }),
    ],
    session: {
      strategy: "jwt",
    },
    pages: {
      signIn: "/login",
      error: "/login", // Redirect errors to the login page
    },
    callbacks: {
        async signIn({ user }) {
            if (!user.email) return false;
            // Security Check: Is this user still allowed?
            return await isEmailWhitelisted(user.email);
        },
        async jwt({ token, user }) {
             // ... existing logic
             return token;
        },
        async session({ session, token }) {
            // ... existing logic
            return session;
        },
    }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };