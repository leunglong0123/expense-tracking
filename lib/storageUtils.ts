import { ReceiptData } from './clipboardUtils';

const STORAGE_KEY = 'receipt-history';
const MAX_HISTORY_ITEMS = 20;

// Get all receipts from history
export const getReceiptHistory = (): ReceiptData[] => {
  try {
    const historyString = localStorage.getItem(STORAGE_KEY);
    if (!historyString) return [];
    
    const history = JSON.parse(historyString);
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('Failed to load receipt history:', error);
    return [];
  }
};

// Add a receipt to history
export const addReceiptToHistory = (receipt: ReceiptData): void => {
  try {
    // Only save receipts that have at least vendor or items
    if (!receipt.vendor && (!receipt.items || receipt.items.length === 0)) {
      return;
    }
    
    // Get existing history
    const history = getReceiptHistory();
    
    // Create a copy of the receipt with a timestamp
    const receiptWithTimestamp = {
      ...receipt,
      savedAt: new Date().toISOString()
    };
    
    // Add new receipt to the beginning
    const newHistory = [receiptWithTimestamp, ...history];
    
    // Limit to max items
    const limitedHistory = newHistory.slice(0, MAX_HISTORY_ITEMS);
    
    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedHistory));
  } catch (error) {
    console.error('Failed to save receipt to history:', error);
  }
};

// Remove a receipt from history by index
export const removeReceiptFromHistory = (index: number): void => {
  try {
    const history = getReceiptHistory();
    if (index < 0 || index >= history.length) return;
    
    history.splice(index, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to remove receipt from history:', error);
  }
};

// Clear the entire history
export const clearReceiptHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear receipt history:', error);
  }
}; 