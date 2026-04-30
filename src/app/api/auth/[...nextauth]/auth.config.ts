import { AuthOptions } from "next-auth";
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }

                const user = await prisma.generalAccount.findUnique({
                    where: { username: credentials.username }
                });

                if (user && await bcrypt.compare(credentials.password, user.password)) {
                    return {
                        id: user.id.toString(),
                        username: user.username,
                        role: user.role,
                        email: user.email,
                        createdAt: user.createdAt
                    };
                }

                return null;
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.role = user.role;
                token.email = user.email;
                token.createdAt = user.createdAt;
            }
            return token;
        },
        async session({ session, token }) {
            const user = await prisma.generalAccount.findUnique({
                where: { id: token.id }
            });

            if (user) {
                session.user.id = token.id;
                session.user.username = user.username;
                session.user.role = user.role;
                session.user.email = user.email;
                session.user.createdAt = user.createdAt;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login"
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
        updateAge: 24 * 60 * 60,
    },
}; 