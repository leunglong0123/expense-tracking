import { NextApiRequest, NextApiResponse } from 'next';
import { processReceiptImage, validateOcrResponse, sanitizeOcrResponse } from '../../lib/gemini';
import formidable, { Fields, Files, File } from 'formidable';

// Disable the default body parser to handle form data
export const config = {
  api: {
    bodyParser: false,
  },
};

interface ParsedForm {
  fields: Fields;
  files: Files;
}

const parseForm = async (req: NextApiRequest): Promise<ParsedForm> => {
  const options = { 
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024 // 10MB
  };
  
  return new Promise((resolve, reject) => {
    const form = formidable(options);
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for API key
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not found in environment variables');
    return res.status(500).json({ error: 'Internal server configuration error' });
  }

  try {
    // Parse the form data
    const { files } = await parseForm(req);
    const receiptFile = Array.isArray(files.receipt) 
      ? files.receipt[0] 
      : files.receipt as unknown as formidable.File;

    if (!receiptFile) {
      return res.status(400).json({ error: 'No receipt image provided' });
    }

    // Check if file is an image
    const fileType = receiptFile.mimetype;
    if (!fileType || !fileType.startsWith('image/')) {
      return res.status(400).json({ error: 'File must be an image' });
    }

    // Read the file data using dynamic import
    const fs = await import('fs');
    const fileData = fs.readFileSync(receiptFile.filepath);
    
    // Convert to base64 for the API
    const base64Image = fileData.toString('base64');
    
    // Process the image with Gemini
    const ocrResult = await processReceiptImage(base64Image, process.env.GEMINI_API_KEY as string);
    
    // Validate and sanitize the OCR result
    if (!validateOcrResponse(ocrResult)) {
      console.error('Invalid OCR response format:', ocrResult);
      return res.status(500).json({ error: 'Failed to parse receipt data' });
    }
    
    const sanitizedResult = sanitizeOcrResponse(ocrResult);
    
    // Return the processed data
    return res.status(200).json({
      ocrResult: sanitizedResult,
      success: true,
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    return res.status(500).json({ 
      error: 'Failed to process receipt image',
      details: (error as Error).message,
      success: false
    });
  }
} 