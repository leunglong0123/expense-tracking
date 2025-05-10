import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import UploadComponent from '../components/ui/UploadComponent';
import EditableReceiptTable from '../components/ui/EditableReceiptTable';
import { ExpenseType, HOUSEMATES } from '../lib/sheetsService';
import { CreditCard, getCreditCards, getDefaultCreditCard } from '../lib/creditCardService';
import Layout from '../components/Layout';

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
  const [isEditing, setIsEditing] = useState(false);

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
    setIsEditing(true);
  };

  // Handle OCR error
  const handleOcrError = (errorMsg: string) => {
    setError(errorMsg);
    setTimeout(() => setError(null), 5000);
  };

  // Handle receipt edit
  const handleEditReceipt = (editedData: ReceiptData) => {
    setOcrResult(editedData);
    setIsEditing(false);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
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
        
        // Reset the form after successful save
        setOcrResult(null);
        setReceiptFile(null);
        setIsEditing(false);
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
    <Layout>
      <Head>
        <title>Receipt Scanner</title>
        <meta name="description" content="Scan and track your receipts" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Main Content */}
        {!session && status !== 'loading' ? (
          <div className="text-center py-12">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Welcome to Receipt Scanner
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Please sign in with your Google account to get started.
            </p>
            <div className="mt-8">
              <button
                onClick={() => signIn('google')}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg
                  className="h-5 w-5 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                >
                  <path
                    fill="#FFC107"
                    d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>
        ) : (
          // Rest of the existing content for authenticated users
          <div className="space-y-8">
            {/* Add existing authenticated content here */}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Receipt</h2>
                {!ocrResult && (
                  <UploadComponent
                    onUploadComplete={handleOcrComplete}
                    onError={handleOcrError}
                    maxFileSize={10}
                    acceptedFileTypes={['image/jpeg', 'image/png', 'image/gif']}
                  />
                )}
                
                {/* Show EditableReceiptTable when in editing mode */}
                {ocrResult && isEditing && (
                  <div className="mt-6">
                    <EditableReceiptTable
                      data={ocrResult}
                      onSave={handleEditReceipt}
                      onCancel={handleCancelEdit}
                    />
                  </div>
                )}
                
                {/* Error and Success Messages */}
                {error && (
                  <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">
                    {error}
                  </div>
                )}
                
                {success && (
                  <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-md">
                    {success}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 