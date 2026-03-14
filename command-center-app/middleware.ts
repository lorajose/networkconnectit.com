import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login"
  },
  callbacks: {
    authorized: ({ token }) => Boolean((token?.id ?? token?.sub) && token?.role)
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/command-map/:path*",
    "/organizations/:path*",
    "/projects/:path*",
    "/sites/:path*",
    "/devices/:path*",
    "/alerts/:path*",
    "/viewer/:path*",
    "/users/:path*",
    "/settings/:path*"
  ]
};
