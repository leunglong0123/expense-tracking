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

/**
 * Generate a timestamped filename for the receipt
 */
export const generateReceiptFilename = (originalFilename?: string): string => {
  const timestamp = new Date().toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .split('.')[0];
  
  const extension = originalFilename 
    ? `.${originalFilename.split('.').pop()}`
    : '.jpg';
    
  return `receipt-${timestamp}${extension}`;
};

/**
 * Upload a receipt image to Google Drive using fetch API
 */
export const uploadReceiptImage = async (
  req: NextApiRequest,
  fileBuffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> => {
  try {
    // Get the access token
    const accessToken = await getAccessToken(req);
    
    // Create a multipart/form-data request
    const boundary = 'receipt-upload-' + Math.random().toString().substr(2);
    const delimiter = '\r\n--' + boundary + '\r\n';
    const closeDelimiter = '\r\n--' + boundary + '--';
    
    // Metadata for the file
    const metadata = {
      name: filename,
      mimeType: mimeType,
    };
    
    // Create the multipart body
    let body = delimiter;
    body += 'Content-Type: application/json; charset=UTF-8\r\n\r\n';
    body += JSON.stringify(metadata) + delimiter;
    body += 'Content-Type: ' + mimeType + '\r\n';
    body += 'Content-Transfer-Encoding: base64\r\n\r\n';
    body += fileBuffer.toString('base64');
    body += closeDelimiter;

    // Upload to Google Drive
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(Buffer.byteLength(body)),
      },
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to upload file to Google Drive: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const fileId = data.id;
    
    if (!fileId) {
      throw new Error('Failed to upload file to Google Drive - no file ID returned');
    }
    
    // Make the file readable by anyone with the link
    const shareResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
    
    if (!shareResponse.ok) {
      console.warn('Could not set file permissions, but upload was successful');
    }
    
    return fileId;
  } catch (error) {
    console.error('Google Drive upload error:', error);
    throw new Error(`Failed to upload receipt: ${(error as Error).message}`);
  }
}; 