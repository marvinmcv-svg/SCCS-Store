import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Locale negotiation only. Auth and RBAC are enforced server-side in
 * layouts, server actions and route handlers (never trusted to the proxy).
 */
export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next|_vercel|uploads|brand|images|icons|sw.js|manifest.webmanifest|.*\\..*).*)'],
};
