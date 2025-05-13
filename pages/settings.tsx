import { useState, useEffect } from 'react';
import Head from 'next/head';
import { CreditCard, getCreditCards, saveCreditCard, deleteCreditCard, setDefaultCreditCard, validateCreditCard } from '../lib/creditCardService';

export default function Settings() {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    last4Digits: '',
    name: '',
    provider: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load credit cards on component mount
  useEffect(() => {
    setCreditCards(getCreditCards());
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setFormError(null);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate card data
    const { valid, error } = validateCreditCard(
      formData.last4Digits,
      formData.name,
      formData.provider
    );
    
    if (!valid) {
      setFormError(error || 'Invalid card information');
      return;
    }
    
    // Save the card
    const newCard = saveCreditCard(formData);
    
    // Update state
    setCreditCards(getCreditCards());
    setFormData({
      last4Digits: '',
      name: '',
      provider: '',
    });
    setShowForm(false);
    
    // Show success message
    setSuccessMessage('Credit card added successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Handle card deletion
  const handleDeleteCard = (cardId: string) => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      deleteCreditCard(cardId);
      setCreditCards(getCreditCards());
      setSuccessMessage('Credit card deleted');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Handle setting a card as default
  const handleSetDefault = (cardId: string) => {
    setDefaultCreditCard(cardId);
    setCreditCards(getCreditCards());
    setSuccessMessage('Default card updated');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Settings - Receipt Scanner</title>
      </Head>
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>
        
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6">
            {successMessage}
          </div>
        )}
        
        {/* Credit Card Management Section */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Credit Cards</h2>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Add New Card
              </button>
            )}
          </div>
          
          {/* Add Card Form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-md mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="last4Digits">
                    Last 4 Digits
                  </label>
                  <input
                    type="text"
                    id="last4Digits"
                    name="last4Digits"
                    value={formData.last4Digits}
                    onChange={handleInputChange}
                    maxLength={4}
                    pattern="[0-9]{4}"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1234"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="name">
                    Card Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Personal Visa"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="provider">
                    Card Provider
                  </label>
                  <input
                    type="text"
                    id="provider"
                    name="provider"
                    value={formData.provider}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Visa, Mastercard, AMEX, etc."
                    required
                  />
                </div>
                
                {formError && (
                  <div className="text-red-500 text-sm">{formError}</div>
                )}
                
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Card
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setFormData({
                        last4Digits: '',
                        name: '',
                        provider: '',
                      });
                      setFormError(null);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
          
          {/* Card List */}
          <div className="space-y-4">
            {creditCards.length === 0 ? (
              <p className="text-gray-500">No credit cards saved yet.</p>
            ) : (
              creditCards.map(card => (
                <div
                  key={card.id}
                  className={`border ${card.isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} rounded-md p-4 flex justify-between items-center`}
                >
                  <div>
                    <div className="flex items-center">
                      <span className="font-semibold">{card.name}</span>
                      {card.isDefault && (
                        <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Default</span>
                      )}
                    </div>
                    <div className="text-gray-600">
                      <span>{card.provider}</span>
                      <span className="ml-2">•••• {card.last4Digits}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {!card.isDefault && (
                      <button
                        onClick={() => handleSetDefault(card.id)}
                        className="text-sm px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
} 