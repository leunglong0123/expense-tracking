import { NextApiRequest, NextApiResponse } from 'next';
import { writeReceiptToSheet, ReceiptData } from '../../../lib/sheetsService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get token from NextAuth.js using dynamic import
    const { getToken } = await import('next-auth/jwt');
    
    // Check authentication
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate request body
    const data = req.body as ReceiptData;
    if (!data || !data.items || data.items.length === 0) {
      return res.status(400).json({ error: 'Invalid receipt data' });
    }
    
    // Get spreadsheet ID from environment variable
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      return res.status(500).json({ error: 'Google Sheet ID not configured' });
    }
    
    // Write to Google Sheets
    const success = await writeReceiptToSheet(req, data, spreadsheetId);
    
    if (success) {
      return res.status(200).json({
        success: true,
        message: 'Receipt data saved to Google Sheets',
        timestamp: new Date().toISOString(),
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to save receipt data',
      });
    }
  } catch (error) {
    console.error('Google Sheets write error:', error);
    return res.status(500).json({ 
      error: 'Failed to save receipt data',
      details: (error as Error).message,
      success: false
    });
  }
} 