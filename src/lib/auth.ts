import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from 'bcrypt';
import clientPromise from '@/engine/database';
// Import the shared model
import { UserDocument } from '@/engine/models';
import { isEmailWhitelisted } from '@/engine/whitelistService';

export const authOptions: NextAuthOptions = {
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

            const isWhitelisted = await isEmailWhitelisted(user.email);

            if (!user.emailVerified && !isWhitelisted) {
                throw new Error("Email not verified. Please check your inbox.");
            }

            const isValid = await bcrypt.compare(credentials.password, user.password);
            if (!isValid) return null;
            
            return {
                id: user._id.toString(),
                name: user.username,
                email: user.email,
                // We can pass roles here to the token if we want fewer DB lookups later
                roles: user.roles || [] 
            };
        },
      }),
    ],
    pages: {
      signIn: "/login",
      error: "/login", 
    },
    callbacks: {
        async signIn({ user }) {
            return true;
        },
        async jwt({ token, user }: any) {
            if (user) {
                token.id = user.id;
                token.roles = user.roles; // Persist roles to token
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session.user && token.id) {
                (session.user as any).id = token.id;
                (session.user as any).roles = token.roles; // Make available in client session
            }
            return session;
        },
    },
};