import React, { useState, useRef, useEffect } from 'react';

interface UploadComponentProps {
  onUploadComplete?: (result: any) => void;
  onError?: (error: string) => void;
  maxFileSize?: number; // Maximum file size in MB
  acceptedFileTypes?: string[]; // Array of accepted MIME types
}

interface OCRResult {
  items: Array<{
    description: string;
    price: string | number;
    quantity?: string | number;
    date?: string;
  }>;
  total?: string | number;
  vendor?: string;
  date?: string;
  tax?: string | number;
  subtotal?: string | number;
  receiptId?: string;
  originalFile?: File;
}

const UploadComponent: React.FC<UploadComponentProps> = ({ 
  onUploadComplete, 
  onError,
  maxFileSize = 10, // Default to 10MB
  acceptedFileTypes = ['image/jpeg', 'image/png', 'image/gif']
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    
    // Also check on resize in case of orientation changes
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Create simulated progress updates
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    
    if (isLoading) {
      setProgress(0);
      progressInterval = setInterval(() => {
        setProgress(prev => {
          const increment = Math.random() * 15;
          const newProgress = prev + increment;
          return newProgress >= 90 ? 90 : newProgress; // Cap at 90% until complete
        });
      }, 500);
    } else if (uploadSuccess) {
      setProgress(100);
    }
    
    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [isLoading, uploadSuccess]);

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  // Validate file type
  const validateFileType = (file: File): boolean => {
    if (!acceptedFileTypes.includes(file.type)) {
      onError?.(`File type not supported. Please upload ${acceptedFileTypes.join(', ')}`);
      return false;
    }
    return true;
  };

  // Validate file size
  const validateFileSize = (file: File): boolean => {
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxFileSize) {
      onError?.(`File size exceeds the maximum allowed size of ${maxFileSize}MB`);
      return false;
    }
    return true;
  };

  // Process the file
  const processFile = async (file: File) => {
    // Reset states
    setUploadSuccess(false);
    
    // Clear any previous preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    // Validate file type and size
    if (!validateFileType(file) || !validateFileSize(file)) {
      return;
    }

    // Store the file and create preview
    setFile(file);
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    
    // Start processing
    setIsLoading(true);
    
    try {
      // Create FormData for API call
      const formData = new FormData();
      formData.append('receipt', file);
      
      // Call the OCR API endpoint
      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      
      setIsLoading(false);
      setUploadSuccess(true);
      
      // Add the original file to the result object
      result.originalFile = file;
      
      // Pass the result to parent component
      onUploadComplete?.(result);
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('OCR processing error:', errorMessage);
      onError?.(errorMessage);
    }
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  // Handle click to open file dialog
  const handleClick = () => {
    if (isMobile && mobileInputRef.current) {
      mobileInputRef.current.click();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Clear the current file
  const handleClearFile = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent triggering the parent click handler
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setUploadSuccess(false);
    
    // Reset file inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (mobileInputRef.current) mobileInputRef.current.value = '';
  };

  // Camera button handler (mobile only)
  const handleCameraClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent parent click
    if (mobileInputRef.current) {
      mobileInputRef.current.click();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-300 ${
          isDragging 
            ? 'border-blue-500 bg-blue-50 shadow-md' 
            : uploadSuccess 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label="Upload a receipt image"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={acceptedFileTypes.join(',')}
          className="hidden"
          aria-hidden="true"
        />
        
        {/* Hidden input for mobile camera */}
        <input
          type="file"
          ref={mobileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-hidden="true"
        />
        
        {previewUrl ? (
          <div className="mb-4 transition-all duration-300 transform hover:scale-[1.02]">
            <div className="relative">
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="max-h-64 mx-auto rounded-md shadow-sm"
              />
              {uploadSuccess && (
                <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-gray-500 mb-4">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {isDragging ? 'Drop the file here' : 'Upload a receipt image'}
            </h3>
          </div>
        )}
        
        <div className="flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="w-full max-w-md">
              <div className="flex items-center text-blue-500 mb-2">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing your receipt...
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Extracting data. This may take a moment...</p>
            </div>
          ) : previewUrl ? (
            <button
              type="button"
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 mb-2"
              onClick={handleClearFile}
            >
              Upload a different image
            </button>
          ) : (
            <div className="flex flex-col items-center">
              <p className="text-sm text-gray-600 mb-2">
                {isDragging ? 'Release to upload' : 'Drag and drop, or click to browse'}
              </p>
              
              {isMobile && (
                <div className="flex mt-2">
                  <button
                    type="button"
                    onClick={handleCameraClick}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md shadow-sm text-sm font-medium transition-colors duration-200 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    Use Camera
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          {acceptedFileTypes.map(type => type.replace('image/', '.')).join(', ')} up to {maxFileSize}MB
        </p>
      </div>
    </div>
  );
};

export default UploadComponent; 