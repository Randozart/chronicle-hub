import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from 'bcrypt';
import clientPromise from '@/engine/database';
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
                image: user.image,           
                roles: user.roles || [],
                tosAgreedAt: user.tosAgreedAt 
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
        async jwt({ token, user, trigger, session }: any) {
            if (user) {
                token.id = user.id;
                token.roles = user.roles;
                token.picture = user.image; 
                token.tosAgreed = !!user.tosAgreedAt;
            }
            
            if (trigger === "update" && session?.user) {
                if (session.user.hasAgreedToTos !== undefined) {
                    token.tosAgreed = session.user.hasAgreedToTos;
                }
                if (session.user.image) token.picture = session.user.image;
                if (session.user.name) token.name = session.user.name;
            }
            
            return token;
        },
        async session({ session, token }: any) {
            if (session.user && token.id) {
                (session.user as any).id = token.id;
                (session.user as any).roles = token.roles;
                (session.user as any).hasAgreedToTos = token.tosAgreed;
                session.user.image = token.picture; 
            }
            return session;
        },
    },
};