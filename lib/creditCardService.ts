/**
 * Credit Card Management Service
 * 
 * Handles storage and retrieval of credit card information using localStorage
 */

// Define credit card interface
export interface CreditCard {
  id: string;
  last4Digits: string;
  name: string;
  provider: string;
  isDefault?: boolean;
}

// Local storage key for credit cards
const STORAGE_KEY = 'receipt-scanner:credit-cards';

/**
 * Get all saved credit cards
 */
export const getCreditCards = (): CreditCard[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return [];
    
    return JSON.parse(storedData);
  } catch (error) {
    console.error('Error loading credit cards:', error);
    return [];
  }
};

/**
 * Save a new credit card
 */
export const saveCreditCard = (card: Omit<CreditCard, 'id'>): CreditCard => {
  const cards = getCreditCards();
  
  // Generate a unique ID
  const newCard: CreditCard = {
    ...card,
    id: Date.now().toString(),
  };
  
  // If this is the first card, make it default
  if (cards.length === 0) {
    newCard.isDefault = true;
  }
  
  // Add the new card to the array
  const updatedCards = [...cards, newCard];
  
  // Save to local storage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCards));
  
  return newCard;
};

/**
 * Delete a credit card
 */
export const deleteCreditCard = (cardId: string): boolean => {
  const cards = getCreditCards();
  const cardToDelete = cards.find(card => card.id === cardId);
  
  if (!cardToDelete) {
    return false;
  }
  
  // Filter out the card to delete
  const updatedCards = cards.filter(card => card.id !== cardId);
  
  // If we're deleting the default card, make the first remaining card default
  if (cardToDelete.isDefault && updatedCards.length > 0) {
    updatedCards[0].isDefault = true;
  }
  
  // Save the updated array
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCards));
  
  return true;
};

/**
 * Set a card as the default
 */
export const setDefaultCreditCard = (cardId: string): boolean => {
  const cards = getCreditCards();
  const cardExists = cards.some(card => card.id === cardId);
  
  if (!cardExists) {
    return false;
  }
  
  // Update default status for all cards
  const updatedCards = cards.map(card => ({
    ...card,
    isDefault: card.id === cardId
  }));
  
  // Save the updated array
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCards));
  
  return true;
};

/**
 * Get the default credit card
 */
export const getDefaultCreditCard = (): CreditCard | undefined => {
  const cards = getCreditCards();
  return cards.find(card => card.isDefault);
};

/**
 * Validate credit card information
 */
export const validateCreditCard = (
  last4Digits: string,
  name: string,
  provider: string
): { valid: boolean; error?: string } => {
  if (!last4Digits || last4Digits.length !== 4 || !/^\d{4}$/.test(last4Digits)) {
    return { valid: false, error: 'Last 4 digits must be exactly 4 numbers' };
  }
  
  if (!name.trim()) {
    return { valid: false, error: 'Card name is required' };
  }
  
  if (!provider.trim()) {
    return { valid: false, error: 'Card provider is required' };
  }
  
  return { valid: true };
}; 