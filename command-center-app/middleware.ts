import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login"
  },
  callbacks: {
    authorized: ({ token }) => Boolean(token)
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/organizations/:path*",
    "/sites/:path*",
    "/devices/:path*",
    "/alerts/:path*",
    "/viewer/:path*",
    "/users/:path*",
    "/settings/:path*"
  ]
};
