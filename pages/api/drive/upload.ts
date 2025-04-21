import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { generateReceiptFilename, uploadReceiptImage } from '../../../lib/driveService';

// Disable the default body parser to handle form data
export const config = {
  api: {
    bodyParser: false,
  },
};

interface ParsedForm {
  fields: formidable.Fields;
  files: formidable.Files;
}

// Parse form data with files
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

  try {
    // Check authentication using dynamic import
    const { getToken } = await import('next-auth/jwt');
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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
    
    // Generate a filename with timestamp
    const filename = generateReceiptFilename(receiptFile.originalFilename || undefined);
    
    // Upload to Google Drive
    const fileId = await uploadReceiptImage(req, fileData, fileType, filename);
    
    // Return the file ID and other details
    return res.status(200).json({
      fileId,
      filename,
      mimeType: fileType,
      size: receiptFile.size,
      success: true,
    });
  } catch (error) {
    console.error('Drive upload error:', error);
    return res.status(500).json({ 
      error: 'Failed to upload receipt',
      details: (error as Error).message,
      success: false
    });
  }
} 