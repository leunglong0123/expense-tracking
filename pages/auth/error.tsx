import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";

const getErrorMessage = (error: string | string[] | undefined): string => {
  if (!error) return "An unknown error occurred";
  
  const errorString = Array.isArray(error) ? error[0] : error;
  
  switch (errorString) {
    case "OAuthSignin":
      return "Error starting the sign in process. Please try again.";
    case "OAuthCallback":
      return "Error processing the sign in callback. Please try again.";
    case "OAuthCreateAccount":
      return "Error creating your account. Please try again.";
    case "EmailCreateAccount":
      return "Error creating your account. Please try again.";
    case "Callback":
      return "Error during the OAuth callback. Please try again.";
    case "OAuthAccountNotLinked":
      return "This email is already registered with a different provider.";
    case "EmailSignin":
      return "Error sending the sign in email. Please try again.";
    case "CredentialsSignin":
      return "Sign in failed. Please check your credentials and try again.";
    case "AccessDenied":
      return "You don't have permission to access this resource.";
    default:
      return "An error occurred during authentication. Please try again.";
  }
};

export default function AuthError() {
  const router = useRouter();
  const { error } = router.query;
  const errorMessage = getErrorMessage(error);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Head>
        <title>Authentication Error - Receipt Scanner</title>
      </Head>
      
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {errorMessage}
          </p>
        </div>
        
        <div className="mt-8">
          <Link
            href="/auth/signin"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Try Again
          </Link>
          
          <div className="text-center mt-4">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 