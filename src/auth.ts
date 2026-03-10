import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Auth.js requires AUTH_SECRET. In development only, use a fallback if missing (set AUTH_SECRET in .env for production).
const authSecret =
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === "development"
    ? "dev-secret-replace-with-openssl-rand-base64-32"
    : undefined);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: (credentials.email as string).trim().toLowerCase() },
        });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.sub ?? token.id;
      return session;
    },
  },
});
