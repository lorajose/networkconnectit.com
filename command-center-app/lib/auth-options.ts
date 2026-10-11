import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { prisma } from "@/lib/db";
import type { AppRole } from "@/lib/rbac";
import { getAuthSecret } from "@/lib/runtime-config";
import { signInSchema } from "@/lib/validations/auth";

const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const AUTH_SESSION_UPDATE_AGE_SECONDS = 60 * 60;

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: {
    strategy: "jwt",
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
    updateAge: AUTH_SESSION_UPDATE_AGE_SECONDS
  },
  jwt: {
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS
  },
  pages: {
    signIn: "/login",
    error: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: {
          label: "Email",
          type: "email"
        },
        password: {
          label: "Password",
          type: "password"
        }
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase();
        const user = await prisma.user.findUnique({
          where: {
            email
          }
        });

        if (!user || !user.isActive) {
          return null;
        }

        const passwordMatches = await compare(
          parsed.data.password,
          user.passwordHash
        );

        if (!passwordMatches) {
          return null;
        }

      return {
        id: user.id,
        name: user.name ?? user.email,
        email: user.email,
          role: user.role as AppRole,
          organizationId: user.organizationId ?? null,
          authVersion: user.authVersion
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.email = user.email;
        token.authVersion = user.authVersion;
        return token;
      }

      if (token.id && typeof token.authVersion === "number") {
        const currentUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            email: true,
            role: true,
            organizationId: true,
            isActive: true,
            authVersion: true
          }
        });

        if (
          !currentUser ||
          !currentUser.isActive ||
          currentUser.authVersion !== token.authVersion
        ) {
          delete token.id;
          delete token.role;
          delete token.organizationId;
          delete token.authVersion;
          token.email = undefined;
          return token;
        }

        token.role = currentUser.role as AppRole;
        token.organizationId = currentUser.organizationId ?? null;
        token.email = currentUser.email;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && token.email && token.role) {
        session.user.id = token.id as string;
        session.user.role = (token.role as AppRole | undefined) ?? "VIEWER";
        session.user.email = token.email as string;
        session.user.organizationId =
          (token.organizationId as string | null | undefined) ?? null;
      }

      return session;
    }
  }
};
