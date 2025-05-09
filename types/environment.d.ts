declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GOOGLE_CLIENT_ID: string;
      GOOGLE_CLIENT_SECRET: string;
      NEXTAUTH_SECRET: string;
      NEXTAUTH_URL?: string;
      NODE_ENV: 'development' | 'production';
      GEMINI_API_KEY: string;
    }
  }
} 