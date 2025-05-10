import React, { useState, useEffect } from 'react';
import { ReceiptData } from '../../lib/clipboardUtils';
import { getReceiptHistory, removeReceiptFromHistory, clearReceiptHistory, addReceiptToHistory } from '../../lib/storageUtils';
import { formatDateForSheet } from '../../lib/clipboardUtils';

interface ReceiptHistoryProps {
  onSelectReceipt: (receipt: ReceiptData) => void;
}

const ReceiptHistory: React.FC<ReceiptHistoryProps> = ({ onSelectReceipt }) => {
  const [history, setHistory] = useState<ReceiptData[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load history when component mounts or when the dropdown is opened
  useEffect(() => {
    loadHistory();
    
    // Set up a storage event listener to detect changes from other components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'receipt-history') {
        loadHistory();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Check for updates every few seconds (for changes in the same window)
    const intervalId = setInterval(loadHistory, 3000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, []);
  
  // Refresh history when dropdown is opened
  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = () => {
    const savedHistory = getReceiptHistory();
    setHistory(savedHistory);
  };

  const handleSelectReceipt = (receipt: ReceiptData) => {
    onSelectReceipt(receipt);
    setIsOpen(false);
  };

  const handleRemoveReceipt = (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering select
    removeReceiptFromHistory(index);
    loadHistory(); // Reload history after deletion
  };

  const handleClearHistory = () => {
    const confirmed = window.confirm('Are you sure you want to clear all receipt history?');
    if (confirmed) {
      clearReceiptHistory();
      setHistory([]);
    }
  };

  // Format date for display
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Get a summary of the receipt for preview
  const getReceiptSummary = (receipt: ReceiptData): string => {
    const vendor = receipt.vendor || 'Unknown vendor';
    const date = receipt.date ? formatDateForSheet(receipt.date) : '';
    const itemCount = receipt.items?.length || 0;
    const total = receipt.total ? `$${parseFloat(receipt.total.toString()).toFixed(2)}` : 'No total';
    
    return `${date} ${vendor} - ${itemCount} item${itemCount !== 1 ? 's' : ''} - ${total}`;
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
        </svg>
        History ({history.length})
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-md shadow-lg z-10 border border-gray-200">
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">Receipt History</h3>
              <div className="space-x-2">
                {history.length > 0 && (
                  <button 
                    onClick={handleClearHistory}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Clear All
                  </button>
                )}
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={() => {
                      // Add a test receipt for debugging
                      const testReceipt: ReceiptData = {
                        items: [
                          { description: 'Test Item 1', price: '10.99', taxable: true },
                          { description: 'Test Item 2', price: '5.49', taxable: true },
                        ],
                        vendor: 'Test Vendor',
                        date: new Date().toLocaleDateString(),
                        total: '16.48',
                        paidBy: 'Timothy',
                        expenseType: 1
                      };
                      addReceiptToHistory(testReceipt);
                      loadHistory();
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Add Test
                  </button>
                )}
              </div>
            </div>
            
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No receipt history yet</p>
            ) : (
              <ul className="max-h-96 overflow-y-auto">
                {history.map((receipt, index) => (
                  <li 
                    key={index}
                    onClick={() => handleSelectReceipt(receipt)}
                    className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer flex justify-between items-start rounded"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{receipt.vendor || 'Unknown vendor'}</p>
                      <p className="text-sm text-gray-600">{getReceiptSummary(receipt)}</p>
                      <p className="text-xs text-gray-400">
                        {receipt.savedAt ? formatDate(receipt.savedAt) : 'Unknown time'}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => handleRemoveReceipt(index, e)}
                      className="text-gray-400 hover:text-red-600 ml-2"
                      aria-label="Remove receipt"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptHistory; 