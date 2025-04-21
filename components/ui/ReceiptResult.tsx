import React from 'react';

interface ReceiptItem {
  description: string;
  price: string | number;
  unit_price?: string | number;
  quantity?: string | number;
  taxable?: boolean;
}

interface ReceiptData {
  vendor?: string;
  date?: string;
  total?: string | number;
  subtotal?: string | number;
  tax?: string | number;
  tip?: string | number;
  items?: ReceiptItem[];
}

const formatCurrency = (value: string | number | undefined): string => {
  if (value === undefined) return '0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

const formatValue = (value: string | number | undefined): string => {
  if (value === undefined) return '';
  return typeof value === 'number' ? value.toString() : value;
};

const ReceiptResult: React.FC<{ receipt: ReceiptData; onEdit?: () => void }> = ({ 
  receipt,
  onEdit 
}) => {
  const { vendor, date, total, items, subtotal, tax, tip } = receipt;
  
  // Calculate the subtotal as sum of all item prices
  const calculatedSubtotal = items?.reduce((acc, item) => {
    const itemPrice = parseFloat(formatValue(item.price)) || 0;
    return acc + itemPrice;
  }, 0) || 0;
  
  const adjustedSubtotal = calculatedSubtotal;
  
  // Calculate total from components
  const calculatedTotal = adjustedSubtotal +
    (parseFloat(formatValue(tax)) || 0) +
    (parseFloat(formatValue(tip)) || 0);
  
  // Check if the calculated total matches the total from the receipt (with a small tolerance for floating point issues)
  const originalTotal = parseFloat(formatValue(total)) || 0;
  const totalDifference = Math.abs(calculatedTotal - originalTotal);
  const mismatchDetected = totalDifference > 0.01;
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Receipt Summary</h2>
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Edit
          </button>
        )}
      </div>
      
      {/* Receipt Metadata */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-600">Vendor</p>
          <p className="font-medium text-gray-800">{vendor || 'Unknown'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Date</p>
          <p className="font-medium text-gray-800">{date || 'Unknown'}</p>
        </div>
      </div>
      
      {/* Items Table */}
      <div className="overflow-x-auto mb-6">
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items?.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  {item.description || ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-center">
                  {formatValue(item.quantity) || '1'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right">
                  ${formatCurrency(item.unit_price || (parseFloat(formatValue(item.price)) / parseFloat(formatValue(item.quantity) || '1')))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right">
                  ${formatCurrency(item.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Totals */}
      <div className="border-t pt-4">
        <div className="flex justify-end">
          <div className="w-64">
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">${formatCurrency(adjustedSubtotal)}</span>
            </div>
            
            {/* Display original subtotal if it differs from calculated */}
            {subtotal !== undefined && Math.abs(parseFloat(formatValue(subtotal)) - adjustedSubtotal) > 0.01 && (
              <div className="flex justify-between py-1 text-sm text-amber-600">
                <span>Original Subtotal:</span>
                <span>${formatCurrency(subtotal)}</span>
              </div>
            )}
            
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Tax:</span>
              <span className="font-medium">${formatCurrency(tax)}</span>
            </div>
            
            {tip !== undefined && parseFloat(formatValue(tip)) > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Tip:</span>
                <span className="font-medium">${formatCurrency(tip)}</span>
              </div>
            )}
            
            <div className="flex justify-between py-2 border-t border-gray-200 mt-2">
              <span className="text-gray-700 font-medium">Total:</span>
              <span className="font-bold">${formatCurrency(calculatedTotal)}</span>
            </div>
            
            {/* Display original total if it differs from calculated */}
            {mismatchDetected && (
              <div className="flex justify-between py-1 text-sm text-amber-600">
                <span>Original Total:</span>
                <span>${formatCurrency(total)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Warning for total mismatch */}
      {mismatchDetected && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
          <p>
            <strong>Note:</strong> The calculated total (${formatCurrency(calculatedTotal)})
            does not match the total on the receipt (${formatCurrency(total)}).
            This may indicate missing items or an error in the receipt data.
          </p>
        </div>
      )}
    </div>
  );
};

export default ReceiptResult; 