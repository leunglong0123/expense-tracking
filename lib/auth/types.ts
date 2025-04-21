import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

/**
 * Extended types for NextAuth.js
 */

declare module "next-auth" {
  /**
   * Extend the Session type to include custom properties
   */
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    error?: string;
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  /**
   * Extend the JWT type to include custom properties
   */
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
} 