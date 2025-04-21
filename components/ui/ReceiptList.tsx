import React, { useEffect, useState } from 'react';

interface ReceiptItem {
  description: string;
  price: string | number;
  unit_price?: string | number;
  quantity?: string | number;
  date?: string;
  taxable?: boolean; // Flag to indicate if item is taxable
}

interface ReceiptData {
  items: ReceiptItem[];
  total?: string | number;
  vendor?: string;
  date?: string;
  tax?: string | number;
  subtotal?: string | number;
  receiptId?: string;
}

interface ReceiptListProps {
  data: ReceiptData;
  onEdit?: (editedData: ReceiptData) => void;
}

// Tax rate options for different provinces
const TAX_RATES = [
  { label: "Ontario (HST 13%)", value: 0.13 },
  { label: "British Columbia (GST+PST 12%)", value: 0.12 },
  { label: "Alberta (GST 5%)", value: 0.05 },
  { label: "Quebec (GST+QST 14.975%)", value: 0.14975 },
  { label: "Nova Scotia (HST 15%)", value: 0.15 },
  { label: "New Brunswick (HST 15%)", value: 0.15 },
  { label: "PEI (HST 15%)", value: 0.15 },
  { label: "Newfoundland (HST 15%)", value: 0.15 },
  { label: "Saskatchewan (GST+PST 11%)", value: 0.11 },
  { label: "Manitoba (GST+PST 12%)", value: 0.12 },
  { label: "No Tax (0%)", value: 0 },
  { label: "Custom Rate", value: -1 },
  { label: "Custom Amount", value: -2 },
];

const ReceiptList: React.FC<ReceiptListProps> = ({ data, onEdit }) => {
  // Initialize data with empty items array if undefined
  const safeData: ReceiptData = {
    ...data,
    items: data?.items || []
  };

  const [editing, setEditing] = useState(false);
  const [editedData, setEditedData] = useState<ReceiptData>(safeData);
  const [selectedTaxRate, setSelectedTaxRate] = useState(-1); // Custom by default
  const [customTaxRate, setCustomTaxRate] = useState<number>(0.13); // Default 13%
  const [customTaxAmount, setCustomTaxAmount] = useState<string>('0.00');

  useEffect(() => {
    // Always ensure items is an array when updating editedData and set taxable flag
    setEditedData({
      ...data,
      items: (data?.items || []).map(item => ({
        ...item,
        taxable: item.taxable !== undefined ? item.taxable : true // Default to taxable
      }))
    });
  }, [data]);

  const handleItemChange = (index: number, field: keyof ReceiptItem, value: string) => {
    const newItems = [...(editedData.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    
    setEditedData(prev => ({
      ...prev,
      items: newItems
    }));
    
    // Recalculate totals
    updateTotals(newItems);
  };

  const handleMetadataChange = (field: keyof ReceiptData, value: string) => {
    setEditedData({
      ...editedData,
      [field]: value
    });
  };

  const handleSave = () => {
    setEditing(false);
    if (onEdit) {
      onEdit(editedData);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setEditedData(safeData);
  };

  const handleAddItem = () => {
    const newItems = [
      ...(editedData.items || []),
      { description: '', price: '0.00', unit_price: '0.00', quantity: '1', taxable: true }
    ];
    
    setEditedData(prev => ({
      ...prev,
      items: newItems
    }));
    
    // Recalculate totals
    updateTotals(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...(editedData.items || [])];
    newItems.splice(index, 1);
    
    setEditedData(prev => ({
      ...prev,
      items: newItems
    }));
    
    // Recalculate totals
    updateTotals(newItems);
  };

  // Handle item taxable toggle
  const handleItemTaxableToggle = (index: number) => {
    const newItems = [...(editedData.items || [])];
    newItems[index] = { 
      ...newItems[index], 
      taxable: !newItems[index].taxable 
    };
    
    setEditedData(prev => ({
      ...prev,
      items: newItems
    }));
    
    // Recalculate totals
    updateTotals(newItems);
  };

  // Format the price display to always show 2 decimal places
  const formatCurrency = (value: string | number | undefined): string => {
    if (value === undefined || value === '') return '0.00';
    
    let numericValue: number;
    if (typeof value === 'string') {
      // Remove any non-numeric characters except decimal point
      const sanitized = value.replace(/[^0-9.]/g, '');
      numericValue = parseFloat(sanitized) || 0;
    } else {
      numericValue = value;
    }
    
    // Format with 2 decimal places
    return numericValue.toFixed(2);
  };

  // Handle numeric input for price, unit_price, and quantity fields
  const handleNumericInput = (
    index: number, 
    field: 'price' | 'quantity' | 'unit_price', 
    value: string
  ) => {
    // Remove any non-numeric characters except decimal point
    let sanitizedValue = value.replace(/[^0-9.]/g, '');
    
    // Only allow one decimal point
    const decimalCount = (sanitizedValue.match(/\./g) || []).length;
    if (decimalCount > 1) {
      const parts = sanitizedValue.split('.');
      sanitizedValue = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // For price and unit_price, ensure two decimal places max
    if ((field === 'price' || field === 'unit_price') && sanitizedValue.includes('.')) {
      const parts = sanitizedValue.split('.');
      if (parts[1].length > 2) {
        sanitizedValue = parts[0] + '.' + parts[1].substring(0, 2);
      }
    }

    const newItems = [...(editedData.items || [])];
    newItems[index] = { ...newItems[index], [field]: sanitizedValue };

    // Update related fields based on what changed
    if (field === 'unit_price') {
      // If unit_price changed, update the total price
      const quantity = parseFloat(String(newItems[index].quantity || '1')) || 1;
      const unitPrice = parseFloat(sanitizedValue) || 0;
      newItems[index].price = (quantity * unitPrice).toFixed(2);
    } else if (field === 'quantity') {
      // If quantity changed, update the total price based on unit_price
      const quantity = parseFloat(sanitizedValue) || 1;
      const unitPrice = parseFloat(String(newItems[index].unit_price || '0')) || 0;
      newItems[index].price = (quantity * unitPrice).toFixed(2);
    } else if (field === 'price') {
      // If total price changed, update the unit_price based on quantity
      const totalPrice = parseFloat(sanitizedValue) || 0;
      const quantity = parseFloat(String(newItems[index].quantity || '1')) || 1;
      newItems[index].unit_price = (totalPrice / quantity).toFixed(2);
    }
    
    setEditedData(prev => ({
      ...prev,
      items: newItems
    }));
    
    // Recalculate totals
    updateTotals(newItems);
  };

  // Update totals when items or tax rate changes
  const updateTotals = (items = editedData.items) => {
    // Calculate subtotal of all items
    const totalSubtotal = items.reduce((sum, item) => {
      const price = typeof item.price === 'string' 
        ? parseFloat(item.price.replace(/[^0-9.]/g, '') || '0') || 0
        : item.price || 0;
    
      return sum + (price);
    }, 0);

    console.log('totalSubtotal', totalSubtotal);
    
    // Calculate subtotal of taxable items
    const taxableSubtotal = items.reduce((sum, item) => {
      if (!item.taxable) return sum;
      
      const price = typeof item.price === 'string' 
        ? parseFloat(item.price.replace(/[^0-9.]/g, '') || '0') || 0
        : item.price || 0;
      
      return sum + (price);
    }, 0);
    
    // Calculate tax based on selected method
    let taxAmount = 0;
    if (selectedTaxRate === -2) {
      // Custom amount
      taxAmount = parseFloat(customTaxAmount) || 0;
    } else {
      // Rate-based
      const taxRate = selectedTaxRate === -1 ? customTaxRate : TAX_RATES.find(rate => rate.value === selectedTaxRate)?.value || 0.13;
      taxAmount = parseFloat((taxableSubtotal * taxRate).toFixed(2));
    }
    
    // Calculate total
    const total = parseFloat((totalSubtotal + taxAmount).toFixed(2));
    
    // Update edited data with new calculations
    setEditedData(prev => ({
      ...prev,
      subtotal: totalSubtotal.toFixed(2),
      tax: selectedTaxRate === -2 ? customTaxAmount : taxAmount.toFixed(2),
      total: total.toFixed(2)
    }));
  };

  // Recalculate when tax rate changes
  useEffect(() => {
    if (editing) {
      updateTotals();
    }
  }, [selectedTaxRate, customTaxRate]);

  // Calculate subtotal for display only - considering all items
  const calculateSubtotal = () => {
    if (!editedData.items || !editedData.items.length) return '0.00';
    
    const subtotal = editedData.items.reduce((sum, item) => {
      // Handle price being either string or number
      const price = typeof item.price === 'string' 
        ? parseFloat(item.price.replace(/[^0-9.]/g, '') || '0') || 0
        : item.price || 0;
      
      // Handle quantity being either string or number
      const quantity = item.quantity 
        ? typeof item.quantity === 'string'
          ? parseFloat(item.quantity) || 1
          : item.quantity || 1
        : 1;
        
      return sum + (price * quantity);
    }, 0);
    
    return subtotal.toFixed(2);
  };

  // Calculate taxable subtotal for display - considering only taxable items
  const calculateTaxableSubtotal = () => {
    if (!editedData.items || !editedData.items.length) return '0.00';
    
    const subtotal = editedData.items.reduce((sum, item) => {
      if (!item.taxable) return sum;

      // Handle price being either string or number
      const price = typeof item.price === 'string' 
        ? parseFloat(item.price.replace(/[^0-9.]/g, '') || '0') || 0
        : item.price || 0;
      
      // Handle quantity being either string or number
      const quantity = item.quantity 
        ? typeof item.quantity === 'string'
          ? parseFloat(item.quantity) || 1
          : item.quantity || 1
        : 1;
        
      return sum + (price * quantity);
    }, 0);
    
    return subtotal.toFixed(2);
  };

  // Calculate tax amount
  const calculateTax = () => {
    if (selectedTaxRate === -2) {
      // If using custom tax amount, return it directly
      return customTaxAmount;
    }
    
    // Otherwise calculate based on rate
    const taxableSubtotal = parseFloat(calculateTaxableSubtotal());
    const taxRate = selectedTaxRate === -1 ? customTaxRate : TAX_RATES.find(rate => rate.value === selectedTaxRate)?.value || 0.13;
    return (taxableSubtotal * taxRate).toFixed(2);
  };
  
  // Calculate total from items and tax
  const calculateTotal = () => {
    const subtotal = parseFloat(calculateSubtotal());
    const tax = parseFloat(calculateTax());
    return (subtotal + tax).toFixed(2);
  };

  // Handle tax rate change
  const handleTaxRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rate = parseFloat(e.target.value);
    setSelectedTaxRate(rate);
    
    // Update edited data with new tax amount
    if (rate === -2) {
      // Custom amount - don't calculate based on rate
      const taxAmount = parseFloat(customTaxAmount);
      const subtotal = parseFloat(calculateSubtotal());
      console.log('subtotal', subtotal);
      console.log('taxAmount', taxAmount);
      setEditedData(prev => ({
        ...prev,
        tax: customTaxAmount,
        total: (subtotal + taxAmount).toFixed(2)
      }));
    } else {
      // Rate-based calculation
      const subtotal = parseFloat(calculateSubtotal());
      const taxableSubtotal = parseFloat(calculateTaxableSubtotal());
      const taxAmount = rate === -1 
        ? taxableSubtotal * customTaxRate 
        : taxableSubtotal * rate;
      
      setEditedData(prev => ({
        ...prev,
        tax: taxAmount.toFixed(2),
        total: (subtotal + taxAmount).toFixed(2)
      }));
    }
  };

  // Handle custom tax rate change
  const handleCustomTaxRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = parseFloat(e.target.value) / 100; // Convert percentage to decimal
    setCustomTaxRate(rate);
    
    // Update edited data with new tax amount
    const subtotal = parseFloat(calculateSubtotal());
    const taxAmount = subtotal * rate;
    
    setEditedData({
      ...editedData,
      tax: taxAmount.toFixed(2),
      total: (subtotal + taxAmount).toFixed(2)
    });
  };

  // Handle custom tax amount change
  const handleCustomTaxAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sanitize input to ensure it's a valid number
    let value = e.target.value.replace(/[^0-9.]/g, '');
    
    // Only allow one decimal point
    const decimalCount = (value.match(/\./g) || []).length;
    if (decimalCount > 1) {
      const parts = value.split('.');
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (value.includes('.')) {
      const parts = value.split('.');
      if (parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2);
      }
    }
    
    setCustomTaxAmount(value);
    
    // Update edited data with new tax amount
    const taxAmount = parseFloat(value) || 0;
    const subtotal = parseFloat(calculateSubtotal());
    
    setEditedData(prev => ({
      ...prev,
      tax: value,
      total: (subtotal + taxAmount).toFixed(2)
    }));
  };

  // Initialize tax rate selector based on current tax value
  useEffect(() => {
    if (editedData.tax && editedData.subtotal) {
      const subtotal = typeof editedData.subtotal === 'number' 
        ? editedData.subtotal 
        : parseFloat(editedData.subtotal || '0');
      
      const tax = typeof editedData.tax === 'number' 
        ? editedData.tax 
        : parseFloat(editedData.tax || '0');
      
      if (subtotal > 0) {
        const calculatedRate = tax / subtotal;
        const predefinedRate = TAX_RATES.find(rate => 
          Math.abs(rate.value - calculatedRate) < 0.001
        );
        
        if (predefinedRate) {
          setSelectedTaxRate(predefinedRate.value);
        } else {
          setSelectedTaxRate(-1); // Custom
          setCustomTaxRate(calculatedRate);
        }
      }
    } else {
      // Default to Ontario HST
      setSelectedTaxRate(0.13);
    }
  }, [data]); // Only run when data changes

  // Safely get items array for rendering
  const getItemsToRender = () => {
    return (editing ? (editedData?.items || []) : (safeData?.items || []));
  };

  // Format a price or quantity value for display
  const formatValue = (value: string | number | undefined): string => {
    if (value === undefined) return '';
    return typeof value === 'number' ? value.toString() : value;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Receipt Details</h2>
        {editing ? (
          <div className="space-x-2">
            <button 
              onClick={handleSave}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Save
            </button>
            <button 
              onClick={handleCancel}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setEditing(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
          >
            Edit
          </button>
        )}
      </div>

      {/* Receipt Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-md">
        <div>
          <p className="text-sm text-gray-500 mb-1">Vendor</p>
          {editing ? (
            <input
              type="text"
              value={editedData.vendor || ''}
              onChange={(e) => handleMetadataChange('vendor', e.target.value)}
              className="w-full p-1 border rounded text-sm"
            />
          ) : (
            <p className="font-medium">{safeData.vendor || 'Unknown Vendor'}</p>
          )}
        </div>
        
        <div>
          <p className="text-sm text-gray-500 mb-1">Date</p>
          {editing ? (
            <input
              type="text"
              value={editedData.date || ''}
              onChange={(e) => handleMetadataChange('date', e.target.value)}
              className="w-full p-1 border rounded text-sm"
            />
          ) : (
            <p className="font-medium">{safeData.date || 'Unknown Date'}</p>
          )}
        </div>
        
        <div>
          <p className="text-sm text-gray-500 mb-1">Receipt ID</p>
          {editing ? (
            <input
              type="text"
              value={editedData.receiptId || ''}
              onChange={(e) => handleMetadataChange('receiptId', e.target.value)}
              className="w-full p-1 border rounded text-sm"
            />
          ) : (
            <p className="font-medium">{safeData.receiptId || 'N/A'}</p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Qty
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Price
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              {editing && (
                <>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taxable
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getItemsToRender().map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  {editing ? (
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  ) : (
                    item.description || ''
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-center">
                  {editing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.]?[0-9]+"
                      value={formatValue(item.quantity) || '1'}
                      onChange={(e) => handleNumericInput(index, 'quantity', e.target.value)}
                      className="w-full p-1 border rounded text-center"
                      style={{ maxWidth: '60px' }}
                    />
                  ) : (
                    formatValue(item.quantity) || '1'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right">
                  {editing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.]?[0-9]+"
                      value={formatValue(item.unit_price) || formatCurrency(parseFloat(formatValue(item.price)) / parseFloat(formatValue(item.quantity) || '1'))}
                      onChange={(e) => handleNumericInput(index, 'unit_price', e.target.value)}
                      className="w-full p-1 border rounded text-right"
                      style={{ maxWidth: '100px' }}
                    />
                  ) : (
                    `$${formatCurrency(item.unit_price || parseFloat(formatValue(item.price)) / parseFloat(formatValue(item.quantity) || '1'))}`
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right">
                  {editing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.]?[0-9]+"
                      value={formatValue(item.price)}
                      onChange={(e) => handleNumericInput(index, 'price', e.target.value)}
                      className="w-full p-1 border rounded text-right"
                      style={{ maxWidth: '100px' }}
                    />
                  ) : (
                    `$${formatCurrency(item.price)}`
                  )}
                </td>
                {editing && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <input
                        type="checkbox"
                        checked={item.taxable !== false}
                        onChange={() => handleItemTaxableToggle(index)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <button 
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700"
                        aria-label="Remove item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Item Button (Edit mode only) */}
      {editing && (
        <div className="mt-4">
          <button 
            onClick={handleAddItem}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Item
          </button>
        </div>
      )}

      {/* Total with tax controls */}
      <div className="mt-6 flex justify-end">
        <div className="bg-gray-50 p-4 rounded-md w-72">
          <div className="flex justify-between mb-2">
            <span className="font-medium text-gray-600">Subtotal:</span>
            <span>${formatCurrency(editedData.subtotal || calculateSubtotal())}</span>
          </div>
          
          {editing && (
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-gray-600">Taxable Subtotal:</span>
              <span>${formatCurrency(calculateTaxableSubtotal())}</span>
            </div>
          )}
          
          {editing ? (
            <div className="mb-3">
              <div className="flex justify-between mb-1">
                <label htmlFor="taxRate" className="text-sm text-gray-600">Tax Rate/Amount:</label>
              </div>
              <select
                id="taxRate"
                value={selectedTaxRate}
                onChange={handleTaxRateChange}
                className="w-full p-1 text-sm border rounded mb-2"
              >
                {TAX_RATES.map((rate) => (
                  <option key={rate.value} value={rate.value}>
                    {rate.label}
                  </option>
                ))}
              </select>
              
              {selectedTaxRate === -1 && (
                <div className="flex items-center mb-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={(customTaxRate * 100).toFixed(2)}
                    onChange={handleCustomTaxRateChange}
                    className="w-16 p-1 text-sm border rounded text-right"
                  />
                  <span className="ml-1 text-sm text-gray-600">%</span>
                </div>
              )}
              
              {selectedTaxRate === -2 && (
                <div className="flex items-center mb-2">
                  <span className="text-sm text-gray-600 mr-1">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]+"
                    value={customTaxAmount}
                    onChange={handleCustomTaxAmountChange}
                    className="w-24 p-1 text-sm border rounded text-right"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-between mb-2">
              <span className="font-medium text-gray-600">Tax Rate:</span>
              <span>
                {selectedTaxRate === -2
                  ? 'Custom Amount'
                  : selectedTaxRate === -1
                    ? `${(customTaxRate * 100).toFixed(2)}%`
                    : `${(selectedTaxRate * 100).toFixed(2)}%`}
              </span>
            </div>
          )}
          
          <div className="flex justify-between mb-2">
            <span className="font-medium text-gray-600">Tax:</span>
            <span>${formatCurrency(editedData.tax || calculateTax())}</span>
          </div>
          
          <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
            <span>Total:</span>
            <span>${formatCurrency(editedData.total || calculateTotal())}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptList; 