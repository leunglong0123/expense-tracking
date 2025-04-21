/**
 * Receipt Parser Utility
 * 
 * This file provides functions to parse OCR text from receipts into
 * structured data with line items, quantities, and prices.
 */

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ParsedReceipt {
  vendor: string;
  date: string;
  total: number;
  items: ReceiptItem[];
  raw_text?: string;
  subtotal?: number;
  tax?: number;
  tip?: number;
}

export interface ParsingResult {
  success: boolean;
  receipt?: ParsedReceipt;
  error?: string;
  totalMatchesSum: boolean;
}

/**
 * Main function to parse OCR data into structured receipt data
 */
export const parseReceiptData = (ocrData: any): ParsingResult => {
  try {
    if (!ocrData || typeof ocrData !== 'object') {
      return {
        success: false,
        error: 'Invalid OCR data provided',
        totalMatchesSum: false,
      };
    }

    // Start with OCR data and ensure it has the required properties
    const receipt: ParsedReceipt = {
      vendor: ocrData.vendor || 'Unknown Vendor',
      date: ocrData.date || new Date().toISOString().split('T')[0],
      total: typeof ocrData.total === 'number' ? ocrData.total : 0,
      items: Array.isArray(ocrData.items) ? [...ocrData.items] : [],
      raw_text: ocrData.raw_text,
    };

    // Clean and sanitize the items
    receipt.items = receipt.items.map(sanitizeReceiptItem);

    // Calculate the sum of item prices
    const calculatedTotal = calculateItemsTotal(receipt.items);
    
    // Check if the total matches the sum of items
    const totalMatchesSum = Math.abs(receipt.total - calculatedTotal) < 0.01;

    // Try to extract additional information if available in raw text
    if (receipt.raw_text) {
      // Try to extract tax
      const taxMatch = receipt.raw_text.match(/tax[:\s]*[$]?(\d+\.\d{2})/i);
      if (taxMatch && taxMatch[1]) {
        receipt.tax = parseFloat(taxMatch[1]);
      }

      // Try to extract tip or gratuity
      const tipMatch = receipt.raw_text.match(/(?:tip|gratuity)[:\s]*[$]?(\d+\.\d{2})/i);
      if (tipMatch && tipMatch[1]) {
        receipt.tip = parseFloat(tipMatch[1]);
      }

      // Try to extract subtotal
      const subtotalMatch = receipt.raw_text.match(/(?:subtotal|sub-total)[:\s]*[$]?(\d+\.\d{2})/i);
      if (subtotalMatch && subtotalMatch[1]) {
        receipt.subtotal = parseFloat(subtotalMatch[1]);
      }
    }

    return {
      success: true,
      receipt,
      totalMatchesSum,
    };
  } catch (error) {
    console.error('Receipt parsing error:', error);
    return {
      success: false,
      error: (error as Error).message,
      totalMatchesSum: false,
    };
  }
};

/**
 * Sanitizes a receipt item to ensure consistent data types and formatting
 */
const sanitizeReceiptItem = (item: any): ReceiptItem => {
  return {
    name: String(item.name || 'Unknown Item').trim(),
    quantity: typeof item.quantity === 'number' 
      ? item.quantity 
      : (parseFloat(String(item.quantity).replace(/[^\d.]/g, '')) || 1),
    price: typeof item.price === 'number' 
      ? item.price 
      : (parseFloat(String(item.price).replace(/[^\d.]/g, '')) || 0),
  };
};

/**
 * Calculates the total cost of all items
 */
const calculateItemsTotal = (items: ReceiptItem[]): number => {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};

/**
 * Categorizes receipt items based on predefined expense types
 */
export const categorizeItems = (items: ReceiptItem[]): Record<string, ReceiptItem[]> => {
  const categories: Record<string, ReceiptItem[]> = {
    'food': [],
    'drinks': [],
    'clothing': [],
    'household': [],
    'electronics': [],
    'entertainment': [],
    'transportation': [],
    'medicine': [],
    'other': [],
  };

  // Food-related keywords
  const foodKeywords = ['burger', 'pizza', 'salad', 'chicken', 'beef', 'pork', 'fish', 'rice', 'noodle', 'pasta', 'bread'];
  
  // Beverage-related keywords
  const drinkKeywords = ['water', 'soda', 'coffee', 'tea', 'juice', 'milk', 'beer', 'wine', 'cocktail', 'drink'];
  
  // Household-related keywords
  const householdKeywords = ['soap', 'detergent', 'tissue', 'paper', 'towel', 'cleaner', 'brush', 'battery', 'bulb'];
  
  // Electronics-related keywords
  const electronicsKeywords = ['charger', 'cable', 'phone', 'laptop', 'computer', 'tablet', 'headphone', 'speaker', 'mouse'];
  
  // Clothing-related keywords
  const clothingKeywords = ['shirt', 'pants', 'dress', 'jacket', 'socks', 'hat', 'shoes', 'belt', 'sweater'];
  
  // Entertainment-related keywords
  const entertainmentKeywords = ['movie', 'ticket', 'game', 'toy', 'book', 'magazine', 'concert', 'show'];
  
  // Transportation-related keywords
  const transportationKeywords = ['fare', 'ticket', 'uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking'];
  
  // Medicine-related keywords
  const medicineKeywords = ['pill', 'medicine', 'drug', 'vitamin', 'supplement', 'prescription', 'bandage'];

  items.forEach(item => {
    const itemName = item.name.toLowerCase();
    
    if (foodKeywords.some(keyword => itemName.includes(keyword))) {
      categories.food.push(item);
    } else if (drinkKeywords.some(keyword => itemName.includes(keyword))) {
      categories.drinks.push(item);
    } else if (householdKeywords.some(keyword => itemName.includes(keyword))) {
      categories.household.push(item);
    } else if (electronicsKeywords.some(keyword => itemName.includes(keyword))) {
      categories.electronics.push(item);
    } else if (clothingKeywords.some(keyword => itemName.includes(keyword))) {
      categories.clothing.push(item);
    } else if (entertainmentKeywords.some(keyword => itemName.includes(keyword))) {
      categories.entertainment.push(item);
    } else if (transportationKeywords.some(keyword => itemName.includes(keyword))) {
      categories.transportation.push(item);
    } else if (medicineKeywords.some(keyword => itemName.includes(keyword))) {
      categories.medicine.push(item);
    } else {
      categories.other.push(item);
    }
  });

  return categories;
};

/**
 * Formats a currency value as a string
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}; 