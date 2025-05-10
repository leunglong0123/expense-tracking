import Head from 'next/head';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { useEffect, useState } from 'react';
import { getReceiptHistory, removeReceiptFromHistory } from '../lib/storageUtils';
import { ReceiptData } from '../lib/clipboardUtils';
import { formatDateForSheet } from '../lib/clipboardUtils';

const inter = Inter({ subsets: ['latin'] });

export default function History() {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Load receipt history from localStorage
  useEffect(() => {
    const loadHistory = () => {
      const savedHistory = getReceiptHistory();
      setReceipts(savedHistory);
    };
    
    loadHistory();
    
    // Set up a storage event listener to detect changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'receipt-history') {
        loadHistory();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Refresh periodically
    const intervalId = setInterval(loadHistory, 5000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, []);
  
  // Handle receipt deletion
  const handleDelete = (index: number) => {
    const confirmed = window.confirm('Are you sure you want to delete this receipt?');
    if (confirmed) {
      removeReceiptFromHistory(index);
      setReceipts(getReceiptHistory());
    }
  };
  
  // Calculate pagination
  const totalPages = Math.ceil(receipts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReceipts = receipts.slice(startIndex, startIndex + itemsPerPage);
  
  // Format date for display
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // If not a valid date object, try using formatDateForSheet
        return formatDateForSheet(dateString);
      }
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };
  
  // Format currency for display
  const formatCurrency = (value: string | number | undefined): string => {
    if (value === undefined) return '$0.00';
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '$0.00';
    
    return `$${numValue.toFixed(2)}`;
  };

  return (
    <>
      <Head>
        <title>Receipt History | Expense Tracker</title>
        <meta name="description" content="View your expense history" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={`min-h-screen p-8 ${inter.className}`}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/" className="text-blue-600 hover:underline">
              ← Back to Home
            </Link>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Receipt History</h1>
            <div className="flex gap-4">
              {/* These could be implemented in the future */}
              <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                Filter
              </button>
              <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                Sort
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {receipts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No receipt history found.</p>
                <p className="mt-2 text-sm">Receipts will appear here after you save or copy them.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Vendor</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReceipts.map((receipt, index) => {
                    const originalIndex = startIndex + index;
                    return (
                      <tr key={receipt.savedAt || originalIndex} className="border-t hover:bg-gray-50">
                        <td className="py-3 px-4">{formatDate(receipt.date)}</td>
                        <td className="py-3 px-4">{receipt.vendor || 'Unknown vendor'}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(receipt.total)}</td>
                        <td className="py-3 px-4 text-right">
                          <Link 
                            href={`/?receipt=${originalIndex}`}
                            className="text-blue-600 hover:underline mx-2"
                          >
                            View
                          </Link>
                          <button 
                            className="text-red-600 hover:underline mx-2"
                            onClick={() => handleDelete(originalIndex)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          {receipts.length > 0 && (
            <div className="mt-6 flex justify-between items-center">
              <div>
                <span className="text-gray-600">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, receipts.length)} of {receipts.length} receipts
                </span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                >
                  Previous
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className={`px-3 py-1 rounded ${currentPage === totalPages || totalPages === 0 ? 'bg-gray-100 text-gray-400' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
} 