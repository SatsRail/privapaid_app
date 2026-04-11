import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { satsrail } from "@/lib/satsrail";
import Settings from "@/models/Settings";
import Customer from "@/models/Customer";

declare module "next-auth" {
  interface User {
    type?: "admin" | "customer";
    role?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      type?: "admin" | "customer";
      role?: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
    type?: "admin" | "customer";
    role?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "admin",
      name: "Staff Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();
        const settings = await Settings.findOne({ setup_completed: true }).lean();
        if (!settings?.merchant_id || !settings?.satsrail_api_url) return null;

        try {
          const session = await satsrail.createSession(
            credentials.email as string,
            credentials.password as string,
            settings.satsrail_api_url
          );

          const merchant = session.merchants.find(
            (m) => m.id === settings.merchant_id
          );
          if (!merchant) return null;

          return {
            id: merchant.id,
            email: credentials.email as string,
            name: merchant.name,
            role: merchant.role,
            type: "admin" as const,
          };
        } catch {
          return null;
        }
      },
    }),
    Credentials({
      id: "customer",
      name: "Customer Login",
      credentials: {
        nickname: { label: "Nickname", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.nickname || !credentials?.password) return null;

        await connectDB();
        const customer = await Customer.findOne({
          nickname: credentials.nickname,
        });
        if (!customer) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          customer.password_hash
        );
        if (!valid) return null;

        return {
          id: customer._id.toString(),
          name: customer.nickname,
          type: "customer" as const,
          role: "customer",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.type = user.type;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.type = token.type;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
