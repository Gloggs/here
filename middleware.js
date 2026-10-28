import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from 'next/server'
import { GUEST_COOKIE, verifyGuest } from './lib/guest'

// First line of defence: no session (or demo guest cookie), no access. Every API route also checks the
// session itself (lib/auth.js), so a mistake here can't expose data on its own.
export async function middleware(request) {
    let signedIn = false;
    try {
        const { isAuthenticated } = getKindeServerSession();
        signedIn = await isAuthenticated();
    } catch {
        signedIn = false;
    }

    if (signedIn) return NextResponse.next();
    // Visitors trying the demo carry a signed guest cookie instead of a Kinde session.
    if (await verifyGuest(request.cookies.get(GUEST_COOKIE)?.value)) return NextResponse.next();

    if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    return NextResponse.redirect(new URL('/api/auth/login?post_login_redirect_url=/dashboard', request.url))
}

export const config = {
  // Pages under /dashboard, and every API route except Kinde's own /api/auth/*.
  matcher: ['/dashboard/:path*', '/api/((?!auth/).*)'],
}
