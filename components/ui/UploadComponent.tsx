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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
      const errorMsg = `File type not supported. Please upload ${acceptedFileTypes.join(', ')}`;
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  // Validate file size
  const validateFileSize = (file: File): boolean => {
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxFileSize) {
      const errorMsg = `File size exceeds the maximum allowed size of ${maxFileSize}MB`;
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  // Process the file
  const processFile = async (file: File) => {
    // Reset states
    setUploadSuccess(false);
    setErrorMessage(null);
    
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
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process the image');
      }
      
      setIsLoading(false);
      setUploadSuccess(true);
      
      // Add the original file to the result object
      result.originalFile = file;
      
      // Pass the result to parent component
      onUploadComplete?.(result);
    } catch (error) {
      setIsLoading(false);
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('OCR processing error:', errorMsg);
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
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
    setErrorMessage(null);
    
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
        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-300 ${
          isDragging 
            ? 'border-blue-500 bg-blue-50 shadow-md' 
            : uploadSuccess 
              ? 'border-green-500 bg-green-50' 
              : errorMessage
                ? 'border-red-500 bg-red-50'
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
        aria-label="Upload receipt"
      >
        {/* Hidden file inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={acceptedFileTypes.join(',')}
          className="hidden"
          aria-hidden="true"
        />
        
        {/* Mobile camera input */}
        <input
          type="file"
          ref={mobileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-hidden="true"
        />
        
        {/* Preview area */}
        {previewUrl ? (
          <div className="relative mb-4">
            <div className="relative overflow-hidden rounded-lg shadow-md mx-auto max-h-96">
              <img 
                src={previewUrl} 
                alt="Receipt preview" 
                className="mx-auto max-h-96 object-contain" 
              />
              
              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-70 flex flex-col items-center justify-center text-white">
                  <div className="mb-2">
                    <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <div className="text-sm font-medium">Processing receipt...</div>
                  <div className="w-48 h-2 bg-gray-600 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-300" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs mt-1">{Math.round(progress)}%</div>
                </div>
              )}
              
              {/* Success overlay */}
              {uploadSuccess && (
                <div className="absolute inset-0 bg-green-500 bg-opacity-30 flex items-center justify-center">
                  <div className="bg-white rounded-full p-2 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
            
            {/* Clear button */}
            <button
              type="button"
              onClick={handleClearFile}
              className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 shadow-md hover:bg-gray-900 transition-colors"
              aria-label="Remove image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            {/* Upload icon and instructions */}
            <div className="mx-auto w-16 h-16 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-1">Upload Receipt</h3>
            <p className="text-sm text-gray-500 mb-4">Drag and drop or click to select a receipt image</p>
            <p className="text-xs text-gray-400">
              Supported formats: {acceptedFileTypes.map(type => type.replace('image/', '').toUpperCase()).join(', ')}
              <br />
              Maximum size: {maxFileSize}MB
            </p>
            
            {/* Mobile camera button */}
            {isMobile && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleCameraClick}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg shadow transition-colors flex items-center justify-center mx-auto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Take Photo
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Error message */}
      {errorMessage && (
        <div className="mt-3 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}
      
      {/* Status message */}
      {uploadSuccess && (
        <div className="mt-3 p-3 bg-green-100 text-green-700 rounded-lg text-sm animate-fadeIn">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Receipt processed successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadComponent; 