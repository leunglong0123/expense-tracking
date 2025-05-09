import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { ComponentType, useEffect } from 'react';

// Higher-order component to protect pages that require authentication
export default function withAuth<P extends object>(Component: ComponentType<P>) {
  return function ProtectedRoute(props: P) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const isLoading = status === 'loading';
    const isAuthenticated = status === 'authenticated';

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.replace('/auth/signin');
      }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 mx-auto text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    // Only render the protected component if authenticated
    return isAuthenticated ? <Component {...props} /> : null;
  };
} 