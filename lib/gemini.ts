/**
 * Google Gemini API Client for OCR processing
 * 
 * This file provides utility functions to interact with the Google Gemini API
 * for extracting text from receipt images.
 */

/**
 * Converts an image file to base64 format for API submission
 */
export const imageToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Processes an image with Google Gemini API to extract text
 */
export const processReceiptImage = async (
  base64Image: string,
  apiKey: string,
  retries = 3
): Promise<any> => {
  const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  
  // Create the prompt for receipt OCR
  const prompt = `
    Extract all text from this receipt image. 
    Then, identify and return the following information in JSON format:
    {
      "vendor": "Store name",
      "date": "YYYY-MM-DD",
      "total": 00.00,
      "items": [
        {
          "name": "Item description",
          "quantity": 1,
          "unit_price": 00.00,
          "price": 00.00
        }
      ],
      "raw_text": "The complete extracted text from the receipt"
    }
    
    The items array should contain all line items from the receipt.
    For each item, please include:
    - name: The item description
    - quantity: The number of units (default to 1 if not specified)
    - unit_price: The price per unit (if available)
    - price: The total price for this line item (quantity × unit_price)
    
    If the receipt shows unit prices and quantities separately, make sure to include them.
    If only the total price is shown without quantity, set quantity to 1 and unit_price equal to price.
    If you cannot identify certain fields, use null values.
  `;

  // Construct the request payload
  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          { 
            inlineData: { 
              mimeType: "image/jpeg",
              data: base64Image
            } 
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.8,
      topK: 40
    }
  };

  try {
    // Call the Gemini API
    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract the text response
    const responseText = data.candidates[0].content.parts[0].text;
    
    // Try to extract JSON from the response
    try {
      // Look for JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        console.error("Could not extract JSON from response", responseText);
        return { error: "Could not parse JSON from API response" };
      }
    } catch (jsonError) {
      console.error("JSON parsing error", jsonError);
      return { error: "JSON parsing error", raw: responseText };
    }
  } catch (error) {
    console.error("API request error:", error);
    
    // Implement retry logic
    if (retries > 0) {
      console.log(`Retrying... (${retries} attempts remaining)`);
      // Wait 2 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
      return processReceiptImage(base64Image, apiKey, retries - 1);
    }
    
    return { error: (error as Error).message };
  }
};

/**
 * Validates the OCR response structure
 */
export const validateOcrResponse = (ocrResult: any): boolean => {
  // Check for error
  if (ocrResult.error) {
    return false;
  }

  // Check for required fields
  const requiredFields = ['vendor', 'date', 'total', 'items'];
  for (const field of requiredFields) {
    if (!(field in ocrResult)) {
      return false;
    }
  }

  // Check that items is an array
  if (!Array.isArray(ocrResult.items)) {
    return false;
  }

  return true;
};

// Define interface for receipt items
export interface ReceiptItem {
  description?: string;
  name?: string;
  quantity?: number | string;
  unit_price?: number | string;
  price?: number | string;
  taxable?: boolean;
}

/**
 * Sanitizes the OCR response to ensure consistent formatting
 */
export const sanitizeOcrResponse = (ocrResult: any): any => {
  // Create a copy to avoid mutating the original
  const sanitized = { ...ocrResult };

  // Ensure total is a number
  if (typeof sanitized.total === 'string') {
    sanitized.total = parseFloat(sanitized.total.replace(/[^\d.-]/g, ''));
  }

  // Ensure date is in YYYY-MM-DD format
  if (sanitized.date && typeof sanitized.date === 'string') {
    // Try to parse the date
    const dateObj = new Date(sanitized.date);
    if (!isNaN(dateObj.getTime())) {
      sanitized.date = dateObj.toISOString().split('T')[0];
    }
  }

  // Sanitize items
  if (Array.isArray(sanitized.items)) {
    sanitized.items = sanitized.items.map((item: ReceiptItem) => {
      // Handle quantity first to use in other calculations
      const quantity = typeof item.quantity === 'string' 
        ? parseFloat(item.quantity.replace(/[^\d.]/g, '')) || 1 
        : (item.quantity || 1);
        
      // Handle price
      const totalPrice = typeof item.price === 'string' 
        ? parseFloat(item.price.replace(/[^\d.-]/g, '')) || 0 
        : (item.price || 0);
        
      // Handle unit price
      let unitPrice: number;
      if (item.unit_price) {
        unitPrice = typeof item.unit_price === 'string'
          ? parseFloat(item.unit_price.replace(/[^\d.-]/g, '')) || 0
          : (item.unit_price || 0);
      } else {
        // Calculate unit price if not provided but we have quantity and total price
        unitPrice = quantity > 0 ? totalPrice / quantity : totalPrice;
      }
      
      // If we have a unit price but no total price, calculate total price
      const finalPrice = totalPrice || (unitPrice * quantity);
      
      return {
        description: item.name || 'Unknown Item',
        quantity: quantity,
        unit_price: parseFloat(unitPrice.toFixed(2)),
        price: parseFloat(finalPrice.toFixed(2)),
        taxable: true // Default to taxable
      };
    });
  }

  // Calculate subtotal if not provided
  if (!sanitized.subtotal) {
    if (Array.isArray(sanitized.items)) {
      const subtotal = sanitized.items.reduce((sum: number, item: ReceiptItem) => {
        const price = typeof item.price === 'number' ? item.price : 0;
        return sum + price; // Use the total price, not (unit_price * quantity) as it's already calculated
      }, 0);
      sanitized.subtotal = parseFloat(subtotal.toFixed(2));
    }
  } else if (typeof sanitized.subtotal === 'string') {
    sanitized.subtotal = parseFloat(sanitized.subtotal.replace(/[^\d.-]/g, ''));
  }

  // Default tax calculation (13% Ontario HST) if not provided
  if (!sanitized.tax) {
    const subtotal = typeof sanitized.subtotal === 'number' ? sanitized.subtotal : 0;
    sanitized.tax = parseFloat((subtotal * 0.13).toFixed(2)); // 13% tax rounded to 2 decimal places
  } else if (typeof sanitized.tax === 'string') {
    sanitized.tax = parseFloat(sanitized.tax.replace(/[^\d.-]/g, ''));
  }

  // Validate total based on subtotal and tax
  if (sanitized.subtotal && sanitized.tax && (!sanitized.total || sanitized.total === 0)) {
    sanitized.total = parseFloat((sanitized.subtotal + sanitized.tax).toFixed(2));
  }

  return sanitized;
}; 