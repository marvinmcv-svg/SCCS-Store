import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { EmailConfig } from 'next-auth/providers/email';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Role } from '@prisma/client';
import { db } from '@/lib/db';
import { sendEmail, emailLayout } from '@/lib/notify/email';
import { rateLimit } from '@/lib/rate-limit';
import { cookies } from 'next/headers';
import { mergeGuestData } from '@/lib/merge';

declare module 'next-auth' {
  interface Session {
    user: { id: string; role: Role } & DefaultSession['user'];
  }
  interface User {
    role?: Role;
  }
}

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

const magicLink: EmailConfig = {
  id: 'email',
  type: 'email',
  name: 'Email',
  maxAge: 24 * 60 * 60,
  async sendVerificationRequest({ identifier, url }) {
    const es = !url.includes('/en/');
    await sendEmail({
      to: identifier,
      subject: es ? 'Su enlace para entrar a SCCS Store' : 'Your SCCS Store sign-in link',
      text: `${es ? 'Entre con este enlace (vence en 24 horas):' : 'Sign in with this link (expires in 24 hours):'} ${url}`,
      html: emailLayout({
        title: es ? 'Entrar a SCCS Store' : 'Sign in to SCCS Store',
        body: es
          ? 'Toque el botón para iniciar sesión. Si no lo pidió, ignore este correo.'
          : "Tap the button to sign in. If you didn't request this, ignore this email.",
        cta: { label: es ? 'Entrar' : 'Sign in', url },
      }),
    });
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // JWT sessions are required by the Credentials provider. The role in the
  // token is only used for UI; every privileged action re-reads the user
  // from the database (see lib/session.ts).
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  pages: { signIn: '/login', verifyRequest: '/login?sent=1', error: '/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase().trim();
        if (!rateLimit(`login:${email}`, 8, 60_000).ok) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user?.passwordHash || user.disabled) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
    magicLink,
  ],
  events: {
    // Runs for both password and magic-link sign-ins.
    async signIn({ user, account }) {
      if (!user?.id) return;
      try {
        // Magic link proves email ownership: attach earlier guest orders.
        if (account?.provider === 'email' && user.email) {
          await db.order.updateMany({ where: { email: user.email.toLowerCase(), userId: null }, data: { userId: user.id } });
        }
        const token = (await cookies()).get('sccs_cart')?.value;
        await mergeGuestData(user.id, token);
      } catch (e) {
        console.error('[auth] merge guest data failed', e);
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
        token.role = user.role ?? 'CUSTOMER';
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) {
        session.user.id = token.uid as string;
        session.user.role = (token.role as Role) ?? 'CUSTOMER';
      }
      return session;
    },
    async signIn({ user }) {
      if (!user?.email) return false;
      const existing = await db.user.findUnique({ where: { email: user.email.toLowerCase() } });
      return !existing?.disabled;
    },
  },
});
