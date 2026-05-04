import NextAuth from "next-auth";
import type {} from "next-auth/jwt";
import Discord from "next-auth/providers/discord";

declare module "next-auth" {
  interface Session {
    discordId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    discordId?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Discord],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile && typeof profile.id === "string") {
        token.discordId = profile.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.discordId === "string") {
        session.discordId = token.discordId;
      }
      return session;
    },
  },
});
