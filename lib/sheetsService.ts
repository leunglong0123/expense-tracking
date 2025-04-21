import { NextApiRequest } from 'next';

/**
 * Get access token from NextAuth session
 */
export const getAccessToken = async (req: NextApiRequest): Promise<string> => {
  // Dynamic imports to ensure they only run on the server
  const { getToken } = await import('next-auth/jwt');
  
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  if (!token?.accessToken) {
    throw new Error('No access token found');
  }

  return token.accessToken as string;
};

// Expense types enum
export enum ExpenseType {
  Food = 1,
  Drinks = 2,
  Clothing = 3,
  Household = 4,
  Electronics = 5,
  Entertainment = 6,
  Transportation = 7,
  Medicine = 8,
  Others = 9
}

// Housemate names for the spreadsheet
export const HOUSEMATES = [
  'Timothy',
  'Rachel',
  'Bryan',
  'Pigskin',
  'Angel',
  'Ivan',
  'Esther',
  'Ken9'
];

// Format the date as YYYY-MM-DD
export const formatDate = (date: Date | string): string => {
  if (typeof date === 'string') {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return dateObj.toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
};

// Format currency as a number
export const formatCurrency = (amount: string | number | undefined): number => {
  if (amount === undefined) return 0;
  
  if (typeof amount === 'string') {
    // Remove non-numeric characters except decimal point
    const cleanString = amount.replace(/[^0-9.]/g, '');
    return parseFloat(cleanString) || 0;
  }
  
  return amount;
};

interface ReceiptItem {
  name?: string;
  description?: string;
  price?: string | number;
  quantity?: string | number;
}

export interface ReceiptData {
  items: ReceiptItem[];
  vendor?: string;
  date?: string;
  total?: string | number;
  tax?: string | number;
  subtotal?: string | number;
  receiptId?: string;
  expenseType?: ExpenseType;
  paidBy?: string;
  driveFileId?: string;
  sharedWith?: string[];
}

/**
 * Write receipt data to Google Sheets
 */
export const writeReceiptToSheet = async (
  req: NextApiRequest,
  data: ReceiptData,
  spreadsheetId: string,
  sheetName: string = 'Sheet1'
): Promise<boolean> => {
  if (!data.items || data.items.length === 0) {
    throw new Error('Receipt data must contain at least one item');
  }
  
  try {
    const accessToken = await getAccessToken(req);
    
    // Prepare rows for each item in the receipt
    const rows = data.items.map(item => {
      // Calculate individual shares
      const amount = formatCurrency(item.price);
      const sharedCount = data.sharedWith?.length || HOUSEMATES.length;
      const perPersonAmount = sharedCount > 0 ? amount / sharedCount : 0;
      
      // Create a row array matching the spreadsheet format
      const row = [
        formatDate(data.date || new Date().toISOString()),
        item.name || item.description || 'Unknown Item',
        data.expenseType?.toString() || ExpenseType.Others.toString(),
        formatCurrency(item.price),
        data.paidBy || '',
        data.vendor || 'Unknown Vendor',
        perPersonAmount // Average column
      ];
      
      // Add individual amounts for each housemate
      HOUSEMATES.forEach(name => {
        // If this housemate is in the sharedWith array, add their share
        const isShared = !data.sharedWith || data.sharedWith.includes(name);
        row.push(isShared ? perPersonAmount : 0);
      });
      
      return row;
    });
    
    // Append the rows to the spreadsheet using Google Sheets API directly
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:Z:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows
        }),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google Sheets API error: ${errorData.error?.message || response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Google Sheets error:', error);
    throw new Error(`Failed to write to spreadsheet: ${(error as Error).message}`);
  }
}; 