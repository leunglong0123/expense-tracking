import { ExpenseType } from './sheetsService';

export interface ReceiptItem {
  description: string;
  price: string | number;
  unit_price?: string | number;
  quantity?: string | number;
  date?: string;
  taxable?: boolean;
  involvedHousemates?: Record<string, number>;
}

export interface ReceiptData {
  items: ReceiptItem[];
  total?: string | number;
  vendor?: string;
  date?: string;
  tax?: string | number;
  subtotal?: string | number;
  receiptId?: string;
  paidBy?: string;
  sharedWith?: string[];
  involvedHousemates?: Record<string, number>;
  expenseType?: number;
  savedAt?: string; // Timestamp when saved to history
}

// Format a date string as YYYY/M/D or M/D if provided
export const formatDateForSheet = (dateString?: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Use short format (M/D) for current year
    const currentYear = new Date().getFullYear();
    if (year === currentYear) {
      return `${month}/${day}`;
    }
    
    return `${year}/${month}/${day}`;
  } catch (e) {
    return dateString;
  }
};

// Get expense type label based on enum value
export const getExpenseTypeLabel = (expenseType: number = 9): string => {
  return expenseType === 1 ? '食物' : 
         expenseType === 2 ? '飲品' : 
         expenseType === 3 ? '衣物' :
         expenseType === 4 ? '居家' :
         expenseType === 5 ? '電子產品' :
         expenseType === 6 ? '娛樂' :
         expenseType === 7 ? '交通' :
         expenseType === 8 ? '醫藥' : '其他';
};

// Format receipt data for copying to clipboard
export const copyReceiptDataToClipboard = (
  receiptData: ReceiptData, 
  onSuccess?: () => void, 
  onError?: (error: string) => void
) => {
  const paidBy = receiptData.paidBy || '';
  
  // Format date as YYYY/M/D or M/D (for current year)
  const formattedDate = formatDateForSheet(receiptData.date);
  
  // Use vendor name or default
  const vendorName = receiptData.vendor || 'Unknown Vendor';
  
  // Get expense type code (default to 1 - Food)
  const expenseType = receiptData.expenseType || 1;
  const expenseTypeLabel = getExpenseTypeLabel(expenseType);
  
  // The standard housemates list
  const housemates = ['Timothy', 'Rachel', 'Bryan', 'Pigskin', 'Angel', 'Ivan', 'Esther', 'Ken9'];
  
  // If using item-level involvement, check if different ratios are used
  let hasMultipleRatios = false;
  let itemHousemateMapping: Array<{item: ReceiptItem, housemates: string[]}> = [];
  
  if (receiptData.items.some(item => item.involvedHousemates)) {
    // Convert each item's involvement to a string representation for comparison
    const involvementPatterns = receiptData.items.map(item => {
      if (!item.involvedHousemates) {
        // If no specific involvement defined, use receipt-level involvement
        return JSON.stringify(receiptData.involvedHousemates || {});
      }
      return JSON.stringify(item.involvedHousemates);
    });
    
    // If we have different patterns, we need multiple rows
    const uniquePatterns = new Set(involvementPatterns);
    hasMultipleRatios = uniquePatterns.size > 1;
    
    // Create item to housemate mapping
    itemHousemateMapping = receiptData.items.map(item => {
      const involved = item.involvedHousemates || receiptData.involvedHousemates || {};
      const involvedHousemates = housemates.filter(name => involved[name] === 1);
      return { item, housemates: involvedHousemates };
    });
  }
  
  let clipboardContent = '';
  
  // If all items share the same ratio, use a single row for the entire receipt
  if (!hasMultipleRatios) {
    // Get the total amount (after tax)
    let totalAmount = 0;
    
    // If total is explicitly defined, use it
    if (receiptData.total) {
      totalAmount = parseFloat(typeof receiptData.total === 'string' ? receiptData.total : receiptData.total.toString());
    } 
    // Otherwise calculate total from subtotal and tax
    else {
      // Calculate subtotal
      const subtotal = receiptData.items.reduce((sum, item) => {
        const price = parseFloat(typeof item.price === 'string' ? item.price : item.price?.toString() || '0');
        return sum + price;
      }, 0);
      
      // Get tax amount
      const taxAmount = receiptData.tax ? 
        parseFloat(typeof receiptData.tax === 'string' ? receiptData.tax : receiptData.tax.toString()) : 
        0;
      
      totalAmount = subtotal + taxAmount;
    }
    
    let involvedHousemates: string[];
    
    // For shared with approach (sharedWith is an array of names)
    if (receiptData.sharedWith && receiptData.sharedWith.length > 0) {
      involvedHousemates = receiptData.sharedWith;
    } 
    // For involvement approach (involvedHousemates is a map of name -> 0|1)
    else if (receiptData.involvedHousemates) {
      involvedHousemates = housemates.filter(
        name => receiptData.involvedHousemates?.[name] === 1
      );
    } 
    // Default to all housemates if nothing specified
    else {
      involvedHousemates = [...housemates];
    }
    
    // Calculate average amount per person
    const perPersonAmount = involvedHousemates.length > 0 ? 
      (totalAmount / involvedHousemates.length).toFixed(4) : 
      "#DIV/0!";
    
    // Create columns for each housemate with "1" (or another value) if they share the expense
    const housemateColumns = housemates
      .map(name => {
        if (!involvedHousemates.includes(name)) return '';
        const involvement = receiptData.involvedHousemates?.[name];
        return involvement !== undefined && involvement >= 1 ? 
          involvement.toString() : 
          involvedHousemates.includes(name) ? '1' : '';
      })
      .join('\t');
    
    // Create a single row for the entire receipt
    clipboardContent = `${formattedDate}\t${vendorName}\t${expenseTypeLabel}\t${totalAmount.toFixed(2)}\t${paidBy}\t${perPersonAmount}\t${perPersonAmount}\t${housemateColumns}`;
  } 
  // If different items have different ratios, create a row per unique sharing pattern
  else {
    // Create a row for each item with different sharing patterns
    for (let i = 0; i < receiptData.items.length; i++) {
      const item = receiptData.items[i];
      const itemPrice = parseFloat(item.price?.toString() || '0');
      
      if (itemPrice <= 0) continue; // Skip zero or negative prices
      
      const involvedHousemates = housemates.filter(
        name => (item.involvedHousemates || receiptData.involvedHousemates || {})[name] === 1
      );
      
      const perPersonAmount = involvedHousemates.length > 0 ? 
        (itemPrice / involvedHousemates.length).toFixed(4) : 
        "#DIV/0!";
      
      // Create columns for each housemate
      const housemateColumns = housemates
        .map(name => {
          if (!involvedHousemates.includes(name)) return '';
          const involvement = (item.involvedHousemates || receiptData.involvedHousemates || {})[name];
          return involvement !== undefined && involvement >= 1 ? 
            involvement.toString() : 
            involvedHousemates.includes(name) ? '1' : '';
        })
        .join('\t');
      
      // Add this item as a new row (with newline if it's not the first row)
      if (clipboardContent) clipboardContent += '\n';
      clipboardContent += `${formattedDate}\t${item.description || vendorName}\t${expenseTypeLabel}\t${itemPrice.toFixed(2)}\t${paidBy}\t${perPersonAmount}\t${perPersonAmount}\t${housemateColumns}`;
    }
  }
  
  // Copy to clipboard
  navigator.clipboard.writeText(clipboardContent)
    .then(() => {
      // Show a success message
      if (onSuccess) {
        onSuccess();
      } else {
        alert('Receipt data copied to clipboard!');
      }
    })
    .catch(err => {
      console.error('Failed to copy: ', err);
      if (onError) {
        onError('Failed to copy receipt data. Please try again.');
      } else {
        alert('Failed to copy receipt data. Please try again.');
      }
    });
}; 