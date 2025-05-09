import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import EditableReceiptTable from '../components/ui/EditableReceiptTable';
import { ExpenseType } from '../lib/sheetsService';

// Define a sample receipt data type to match our component
interface ReceiptItem {
  description: string;
  price: string | number;
  unit_price?: string | number;
  quantity?: string | number;
  date?: string;
  taxable?: boolean;
  // Who is involved in this specific item (1 if involved, 0 if not)
  involvedHousemates?: Record<string, number>;
}

interface ReceiptData {
  items: ReceiptItem[];
  total?: string | number;
  vendor?: string;
  date?: string;
  tax?: string | number;
  subtotal?: string | number;
  receiptId?: string;
  paidBy?: string;
  // Who is involved in the entire receipt (1 if involved, 0 if not)
  involvedHousemates?: Record<string, number>;
  expenseType?: number;
}

// Sample data for testing the component
const sampleReceiptData: ReceiptData = {
  vendor: 'Grocery Store',
  date: new Date().toISOString().split('T')[0],
  items: [
    {
      description: 'Apples',
      quantity: '2',
      unit_price: '1.99',
      price: '3.98',
      taxable: true
    },
    {
      description: 'Bread',
      quantity: '1',
      unit_price: '3.49',
      price: '3.49',
      taxable: false
    },
    {
      description: 'Milk',
      quantity: '1',
      unit_price: '4.99',
      price: '4.99',
      taxable: false
    }
  ],
  subtotal: '12.46',
  tax: '0.52',
  total: '12.98',
  expenseType: ExpenseType.Food
};

const ReviewPage: React.FC = () => {
  const router = useRouter();
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // In a real app, we might fetch the receipt data from an API or state management
    // For this demo, we'll just use the sample data with a small delay to simulate loading
    const timer = setTimeout(() => {
      setReceiptData(sampleReceiptData);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleSaveReceipt = async (data: ReceiptData) => {
    // In a real app, we would send this data to an API endpoint
    console.log('Saving receipt data:', data);
    
    // Simulate an API call
    try {
      // For demo purposes, we'll just wait a bit and then show success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveSuccess(true);
      
      // Navigate to home page after a successful save
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert('Failed to save receipt data');
    }
  };

  const handleCancel = () => {
    // Navigate back to the home page
    router.push('/');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (saveSuccess) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-4">
            <p className="text-lg font-semibold">Receipt saved successfully!</p>
          </div>
          <p>Redirecting to home page...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Review & Edit Receipt</h1>
        
        {receiptData ? (
          <EditableReceiptTable 
            data={receiptData} 
            onSave={handleSaveReceipt}
            onCancel={handleCancel}
          />
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg">
            <p>No receipt data available to edit.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ReviewPage; 