# Google OAuth Setup Instructions

This document provides instructions for setting up Google OAuth for the Receipt Scanner application.

## Required Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```
# NextAuth Config
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Google API Keys
GEMINI_API_KEY=your-gemini-api-key-here
```

## Getting Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API, Google Sheets API, and People API
4. Go to "APIs & Services" > "Credentials"
5. Click "Create Credentials" > "OAuth client ID"
6. Choose "Web application" as the application type
7. Add a name for your OAuth client, e.g., "Receipt Scanner"
8. Add authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - Your production URL (if deployed)
9. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - `https://your-production-domain.com/api/auth/callback/google` (for production)
10. Click "Create"
11. Copy the generated Client ID and Client Secret to your `.env.local` file

## Getting Gemini API Key

1. Go to the [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key or use an existing one
3. Copy the API key to your `.env.local` file as `GEMINI_API_KEY`

## Generating NEXTAUTH_SECRET

For the `NEXTAUTH_SECRET`, generate a random secure string. You can use this command in your terminal:

```bash
openssl rand -base64 32
```

Copy the output to your `.env.local` file as `NEXTAUTH_SECRET`.

## Testing the Authentication

After setting up the environment variables:

1. Run the development server: `npm run dev`
2. Visit `http://localhost:3000`
3. Click the "Sign in with Google" button
4. You should be redirected to the Google OAuth consent screen
5. After granting permission, you should be redirected back to the application and signed in

## Required OAuth Scopes

The application requires the following OAuth scopes:

- `openid`: For standard OpenID Connect authentication
- `email`: To access the user's email address
- `profile`: To access the user's profile information
- `https://www.googleapis.com/auth/drive.file`: To create and manage files in Google Drive
- `https://www.googleapis.com/auth/spreadsheets`: To read and write to Google Sheets

These scopes are configured in the `pages/api/auth/[...nextauth].ts` file. 