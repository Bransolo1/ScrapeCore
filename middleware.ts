import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Protect web UI pages; leave /api/* unprotected (Electron app calls API directly).
// Set SKIP_AUTH=true in env to disable auth (e.g. local dev / Electron build).
export default withAuth(
  function middleware() {
    const response = NextResponse.next();
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-DNS-Prefetch-Control", "off");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return response;
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token }) => {
        if (process.env.SKIP_AUTH === "true") return true;
        return !!token;
      },
    },
  }
);

export const config = {
  // Protect the main UI pages — not /api/* routes or /share/* (public read-only)
  matcher: ["/", "/dashboard/:path*", "/compare/:path*", "/audit/:path*", "/eval/:path*", "/monitoring/:path*"],
};
