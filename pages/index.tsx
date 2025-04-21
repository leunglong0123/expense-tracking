import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import UploadComponent from '../components/ui/UploadComponent';
import ReceiptList from '../components/ui/ReceiptList';
import { ExpenseType, HOUSEMATES } from '../lib/sheetsService';
import { CreditCard, getCreditCards, getDefaultCreditCard } from '../lib/creditCardService';

// Define interface for receipt items
interface ReceiptItem {
  description: string;
  price: string | number;
  quantity?: string | number;
  date?: string;
}

// Define interface for receipt data
interface ReceiptData {
  items: ReceiptItem[];
  total?: string | number;
  vendor?: string;
  date?: string;
  tax?: string | number;
  subtotal?: string | number;
  receiptId?: string;
}

// Interface for OCR API response
interface OcrResponse {
  ocrResult?: ReceiptData;
  success: boolean;
  originalFile: File;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [ocrResult, setOcrResult] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingToDrive, setUploadingToDrive] = useState(false);
  const [savingToSheets, setSavingToSheets] = useState(false);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const [expenseType, setExpenseType] = useState<ExpenseType>(ExpenseType.Food);
  const [selectedHousemates, setSelectedHousemates] = useState<string[]>(HOUSEMATES);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Load credit cards on component mount
  useEffect(() => {
    const cards = getCreditCards();
    setCreditCards(cards);
    
    // Set default card if available
    const defaultCard = getDefaultCreditCard();
    if (defaultCard) {
      setSelectedCard(defaultCard);
    }
  }, []);

  // Handle OCR completion
  const handleOcrComplete = (result: OcrResponse) => {
    // Extract the ocrResult if it's nested
    const receiptData = result.ocrResult ? result.ocrResult : result as unknown as ReceiptData;
    setOcrResult(receiptData);
    setReceiptFile(result.originalFile);
  };

  // Handle OCR error
  const handleOcrError = (errorMsg: string) => {
    setError(errorMsg);
    setTimeout(() => setError(null), 5000);
  };

  // Handle receipt edit
  const handleEditReceipt = (editedData: ReceiptData) => {
    setOcrResult(editedData);
  };

  // Toggle housemate selection
  const toggleHousemate = (name: string) => {
    setSelectedHousemates(prev => {
      if (prev.includes(name)) {
        return prev.filter(h => h !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  // Select all housemates
  const selectAllHousemates = () => {
    setSelectedHousemates([...HOUSEMATES]);
  };

  // Deselect all housemates
  const deselectAllHousemates = () => {
    setSelectedHousemates([]);
  };

  // Save receipt data to Google Sheets and Drive
  const saveReceipt = async () => {
    if (!session) {
      signIn('google');
      return;
    }
    
    if (!ocrResult) {
      setError('No receipt data to save');
      return;
    }
    
    if (!selectedCard) {
      setError('Please select a credit card');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    if (selectedHousemates.length === 0) {
      setError('Please select at least one housemate');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    // First, upload the receipt image to Google Drive
    if (receiptFile) {
      try {
        setUploadingToDrive(true);
        
        const formData = new FormData();
        formData.append('receipt', receiptFile);
        
        const driveResponse = await fetch('/api/drive/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!driveResponse.ok) {
          throw new Error('Failed to upload receipt to Drive');
        }
        
        const driveData = await driveResponse.json();
        setDriveFileId(driveData.fileId);
        
        // Now save to Google Sheets
        setSavingToSheets(true);
        
        const sheetsData = {
          ...ocrResult,
          expenseType: expenseType,
          paidBy: `${selectedCard.name} (${selectedCard.provider} ending in ${selectedCard.last4Digits})`,
          driveFileId: driveData.fileId,
          sharedWith: selectedHousemates
        };
        
        const sheetsResponse = await fetch('/api/sheets/write', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sheetsData),
        });
        
        if (!sheetsResponse.ok) {
          throw new Error('Failed to save receipt data to Sheets');
        }
        
        setSuccess('Receipt saved successfully!');
        setTimeout(() => setSuccess(null), 5000);
      } catch (error) {
        console.error('Error saving receipt:', error);
        setError((error as Error).message);
        setTimeout(() => setError(null), 5000);
      } finally {
        setUploadingToDrive(false);
        setSavingToSheets(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Receipt Scanner</title>
        <meta name="description" content="Scan and track your receipts" />
      </Head>

      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Receipt Scanner</h1>
          
          <div className="flex items-center space-x-4">
            {status === 'authenticated' ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {session.user?.name}
                </span>
                <button
                  onClick={() => router.push('/settings')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Settings
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {!ocrResult ? (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Upload Receipt</h2>
              <UploadComponent 
                onUploadComplete={(result) => handleOcrComplete(result)}
                onError={handleOcrError}
              />
            </div>
          ) : (
            <div className="space-y-6 p-6">
              <ReceiptList 
                data={ocrResult} 
                onEdit={handleEditReceipt} 
              />
              
              {/* Expense Type Selection */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Expense Type</h3>
                <select
                  value={expenseType}
                  onChange={(e) => setExpenseType(Number(e.target.value) as ExpenseType)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={ExpenseType.Food}>食物 - Food</option>
                  <option value={ExpenseType.Drinks}>飲品 - Drinks</option>
                  <option value={ExpenseType.Clothing}>衣物 - Clothing</option>
                  <option value={ExpenseType.Household}>居家 - Household</option>
                  <option value={ExpenseType.Electronics}>電子產品 - Electronics</option>
                  <option value={ExpenseType.Entertainment}>娛樂 - Entertainment</option>
                  <option value={ExpenseType.Transportation}>交通 - Transportation</option>
                  <option value={ExpenseType.Medicine}>醫藥 - Medicine</option>
                  <option value={ExpenseType.Others}>其他 - Others</option>
                </select>
              </div>
              
              {/* Credit Card Selection */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Payment Method</h3>
                {creditCards.length === 0 ? (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          No credit cards found. <button onClick={() => router.push('/settings')} className="font-medium underline">Add a card</button>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {creditCards.map(card => (
                      <div 
                        key={card.id}
                        className={`border p-4 rounded-md cursor-pointer ${
                          selectedCard?.id === card.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedCard(card)}
                      >
                        <div className="font-medium">{card.name}</div>
                        <div className="text-gray-600">
                          {card.provider} •••• {card.last4Digits}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Housemate Selection */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Shared With</h3>
                  <div className="space-x-2">
                    <button 
                      onClick={selectAllHousemates}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <button 
                      onClick={deselectAllHousemates}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {HOUSEMATES.map(name => (
                    <div 
                      key={name}
                      className={`border p-3 rounded-md cursor-pointer ${
                        selectedHousemates.includes(name) ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}
                      onClick={() => toggleHousemate(name)}
                    >
                      <div className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={selectedHousemates.includes(name)}
                          onChange={() => toggleHousemate(name)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2">{name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t pt-6 flex justify-between">
                <button
                  onClick={() => {
                    setOcrResult(null);
                    setReceiptFile(null);
                    setDriveFileId(null);
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-md font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                
                <button
                  onClick={saveReceipt}
                  disabled={uploadingToDrive || savingToSheets}
                  className={`bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md font-medium transition-colors duration-200 ${
                    (uploadingToDrive || savingToSheets) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploadingToDrive ? 'Uploading...' : 
                   savingToSheets ? 'Saving...' : 
                   'Save Receipt'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} Receipt Scanner - All rights reserved
      </footer>
    </div>
  );
} 