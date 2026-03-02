// app/api/auth/[...nextauth]/route.ts
// NextAuth 4 catch-all API route.

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/config";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
