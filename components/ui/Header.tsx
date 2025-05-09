import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AuthButton from './AuthButton';
import { useSession } from 'next-auth/react';

const Header: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();
  
  // Define navigation links
  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/history', label: 'History' },
    { href: '/settings', label: 'Settings' },
  ];
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-lg font-bold text-gray-900">Receipt Scanner</span>
            </Link>
            
            {/* Navigation links - only show if authenticated */}
            {session && (
              <nav className="hidden md:ml-6 md:flex space-x-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      router.pathname === link.href
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    } transition-colors duration-200`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          
          <div className="flex items-center">
            <AuthButton />
          </div>
        </div>
      </div>
      
      {/* Mobile navigation - only show if authenticated */}
      {session && (
        <div className="md:hidden border-t border-gray-200">
          <div className="flex justify-between px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  router.pathname === link.href
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                } transition-colors duration-200`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header; 