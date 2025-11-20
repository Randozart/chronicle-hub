// src/app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from 'bcrypt';
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';
import { findUserById } from "@/engine/userService"; // <-- IMPORT our new function

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
        // --- THIS IS THE CORRECTED jwt CALLBACK ---
        async jwt({ token, user, trigger, session }) {
            // The `user` object is only passed on initial sign-in.
            if (user) {
                token.id = user.id;
            }

            // The `trigger === "session"` check runs when the session is accessed.
            // We can add a periodic check here.
            // For now, let's add the check to always run.
            
            // If the token has an ID, verify that user still exists in the DB.
            if (token.id) {
                const dbUser = await findUserById(token.id as string);
                // If the user is not found in the database, the token is invalid.
                if (!dbUser) {
                    // Invalidate the session by returning an empty object.
                    // This effectively logs the user out.
                    return {};
                }
            }

            return token;
        },
        // --- END OF CORRECTION ---

        async session({ session, token }) {
            if (token && token.id && session.user) {
                // Expose the user ID to the client-side session object.
                (session.user as any).id = token.id;
            } else {
                // If the token was invalidated, ensure the session reflects that.
                // This case might not be strictly necessary but is good for safety.
                return null as any; // Force a logout on the client.
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };