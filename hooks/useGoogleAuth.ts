import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface UseGoogleAuthResult {
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
}

export default function useGoogleAuth(): UseGoogleAuthResult {
  const { data: session, status } = useSession();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getAccessToken = async () => {
      if (status === 'loading') return;

      if (status === 'unauthenticated') {
        setIsLoading(false);
        setError('User is not authenticated');
        return;
      }

      if (session?.accessToken) {
        setAccessToken(session.accessToken as string);
        setIsLoading(false);
      } else {
        setError('No access token available');
        setIsLoading(false);
      }
    };

    getAccessToken();
  }, [session, status]);

  return { accessToken, isLoading, error };
} 