import React, { useState, useEffect } from "react"
import { ExpenseType, HOUSEMATES } from "../../lib/sheetsService"
import { copyReceiptDataToClipboard } from "../../lib/clipboardUtils"

interface ReceiptItem {
  description: string
  price: string | number
  unit_price?: string | number
  quantity?: string | number
  date?: string
  taxable?: boolean
  // Who is involved in this specific item (1 if involved, 0 if not)
  involvedHousemates?: Record<string, number>
}

interface ReceiptData {
  items: ReceiptItem[]
  total?: string | number
  vendor?: string
  date?: string
  tax?: string | number
  subtotal?: string | number
  receiptId?: string
  paidBy?: string
  // Who is involved in the entire receipt (1 if involved, 0 if not)
  involvedHousemates?: Record<string, number>
  expenseType?: number
}

interface EditableReceiptTableProps {
  data: ReceiptData
  onSave: (data: ReceiptData) => void
  onCancel?: () => void
}

// Format currency with 2 decimal places
const formatCurrency = (value: string | number | undefined): string => {
  if (value === undefined || value === "") return "0.00"

  let numericValue: number
  if (typeof value === "string") {
    // Remove any non-numeric characters except decimal point
    const sanitized = value.replace(/[^0-9.]/g, "")
    numericValue = parseFloat(sanitized) || 0
  } else {
    numericValue = value
  }

  // Format with 2 decimal places
  return numericValue.toFixed(2)
}

const EditableReceiptTable: React.FC<EditableReceiptTableProps> = ({ data, onSave, onCancel }) => {
  // Initialize data with default values
  const initialData: ReceiptData = {
    ...data,
    items: (data?.items || []).map((item) => ({
      ...item,
      taxable: item.taxable !== undefined ? item.taxable : true,
      involvedHousemates:
        item.involvedHousemates ||
        // Initialize with all housemates involved (value of 1)
        HOUSEMATES.reduce((acc, housemate) => {
          acc[housemate] = 1
          return acc
        }, {} as Record<string, number>),
    })),
    // Initialize receipt level housemate involvement
    involvedHousemates:
      data?.involvedHousemates ||
      HOUSEMATES.reduce((acc, housemate) => {
        acc[housemate] = 1 // Default all housemates are involved
        return acc
      }, {} as Record<string, number>),
  }

  const [editedData, setEditedData] = useState<ReceiptData>(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({})
  const [copySuccess, setCopySuccess] = useState<boolean>(false)
  const [selectedTaxOption, setSelectedTaxOption] = useState<string>("13%") // Default 13% HST Ontario
  const [customTaxRate, setCustomTaxRate] = useState<string>("13")
  const [customTaxAmount, setCustomTaxAmount] = useState<string>("0.00")
  const [useDirect, setUseDirect] = useState<boolean>(false)

  // Update calculations when data changes
  useEffect(() => {
    updateTotals()
  }, [editedData.items])

  // When receipt-level involvement changes, update all items that aren't individually configured
  useEffect(() => {
    if (!editedData.involvedHousemates) return

    const newItems = editedData.items.map((item) => {
      // Only update items that haven't been individually configured
      return {
        ...item,
        involvedHousemates: item.involvedHousemates || { ...editedData.involvedHousemates },
      }
    })

    setEditedData((prev) => ({
      ...prev,
      items: newItems,
    }))
  }, [editedData.involvedHousemates])

  // Handle changes to basic receipt metadata
  const handleMetadataChange = (field: keyof ReceiptData, value: string) => {
    setEditedData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Handle changes to receipt line items
  const handleItemChange = (index: number, field: keyof ReceiptItem, value: string) => {
    const newItems = [...editedData.items]
    newItems[index] = { ...newItems[index], [field]: value }

    // If changing quantity or price, recalculate the item's total
    if (field === "quantity" || field === "price" || field === "unit_price") {
      const qty = field === "quantity" ? parseFloat(value) || 1 : parseFloat(String(newItems[index].quantity)) || 1

      if (field === "unit_price") {
        // When unit price changes, update the price
        const unitPrice = parseFloat(value) || 0
        newItems[index].price = (unitPrice * qty).toFixed(2)
      } else if (field === "price" && newItems[index].unit_price) {
        // When total price changes, update the unit price if it exists
        const price = parseFloat(value) || 0
        newItems[index].unit_price = (price / qty).toFixed(2)
      } else if (field === "quantity" && newItems[index].unit_price) {
        // When quantity changes, update the price based on unit price
        const unitPrice = parseFloat(String(newItems[index].unit_price)) || 0
        newItems[index].price = (unitPrice * qty).toFixed(2)
      }
    }

    setEditedData((prev) => ({
      ...prev,
      items: newItems,
    }))
  }

  // Toggle receipt-level housemate involvement
  const toggleReceiptHousemateInvolvement = (housemate: string) => {
    setEditedData((prev) => {
      const currentInvolvement = prev.involvedHousemates?.[housemate] || 0
      const newInvolvement = currentInvolvement === 1 ? 0 : 1

      return {
        ...prev,
        involvedHousemates: {
          ...(prev.involvedHousemates || {}),
          [housemate]: newInvolvement,
        },
      }
    })
  }

  // Toggle line item housemate involvement
  const toggleItemHousemateInvolvement = (itemIndex: number, housemate: string) => {
    const newItems = [...editedData.items]
    const currentItem = newItems[itemIndex]
    const currentInvolvement = currentItem.involvedHousemates?.[housemate] || 0
    const newInvolvement = currentInvolvement === 1 ? 0 : 1

    newItems[itemIndex] = {
      ...currentItem,
      involvedHousemates: {
        ...(currentItem.involvedHousemates || {}),
        [housemate]: newInvolvement,
      },
    }

    setEditedData((prev) => ({
      ...prev,
      items: newItems,
    }))
  }

  // Select/deselect all housemates at receipt level
  const toggleAllHousemates = (value: number) => {
    setEditedData((prev) => {
      const updatedInvolvement = HOUSEMATES.reduce((acc, housemate) => {
        acc[housemate] = value
        return acc
      }, {} as Record<string, number>)

      return {
        ...prev,
        involvedHousemates: updatedInvolvement,
      }
    })
  }

  // Apply receipt-level sharing to all line items
  const applyReceiptSharingToAll = () => {
    if (!editedData.involvedHousemates) return

    const newItems = editedData.items.map((item) => ({
      ...item,
      involvedHousemates: { ...editedData.involvedHousemates },
    }))

    setEditedData((prev) => ({
      ...prev,
      items: newItems,
    }))
  }

  // Add a new line item
  const handleAddItem = () => {
    const newItem: ReceiptItem = {
      description: "",
      price: "0.00",
      unit_price: "0.00",
      quantity: "1",
      taxable: true,
      involvedHousemates: { ...editedData.involvedHousemates },
    }

    setEditedData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }))
  }

  // Remove a line item
  const handleRemoveItem = (index: number) => {
    const newItems = [...editedData.items]
    newItems.splice(index, 1)

    setEditedData((prev) => ({
      ...prev,
      items: newItems,
    }))
  }

  // Toggle expanded state for a line item to show/hide housemate involvement
  const toggleItemExpanded = (index: number) => {
    setExpandedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  // Calculate totals based on the current items
  const updateTotals = () => {
    const subtotal = editedData.items.reduce((sum, item) => {
      const price = parseFloat(typeof item.price === "string" ? item.price : String(item.price)) || 0
      return sum + price
    }, 0)

    let tax = 0

    if (useDirect) {
      // Use direct tax amount
      tax = parseFloat(customTaxAmount) || 0
    } else {
      // Use percentage-based calculation
      const taxRate = parseFloat(customTaxRate) / 100 || 0
      tax = subtotal * taxRate
    }

    const total = subtotal + tax

    setEditedData((prev) => ({
      ...prev,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
    }))
  }

  // Calculate per-housemate costs
  const calculateHousemateTotals = () => {
    const total = parseFloat(String(editedData.total)) || 0

    // Calculate involved housemates at receipt level
    const involvedHousemates = editedData.involvedHousemates || {}
    const involvedCount = Object.values(involvedHousemates).filter((v) => v === 1).length || 1

    // Calculate per-person share (receipt level)
    const perPersonAmount = total / involvedCount

    // Calculate each housemate's share
    return HOUSEMATES.reduce((acc, housemate) => {
      if (involvedHousemates[housemate] === 1) {
        acc[housemate] = perPersonAmount
      } else {
        acc[housemate] = 0
      }
      return acc
    }, {} as Record<string, number>)
  }

  // Validate the form before submission
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Check for vendor
    if (!editedData.vendor || editedData.vendor.trim() === "") {
      newErrors.vendor = "Vendor name is required"
    }

    // Check for date
    if (!editedData.date || editedData.date.trim() === "") {
      newErrors.date = "Date is required"
    }

    // Check if we have any items
    if (!editedData.items || editedData.items.length === 0) {
      newErrors.items = "At least one item is required"
    } else {
      // Validate each item
      editedData.items.forEach((item, index) => {
        if (!item.description || item.description.trim() === "") {
          newErrors[`item-${index}-description`] = "Description is required"
        }

        if (parseFloat(String(item.price)) <= 0) {
          newErrors[`item-${index}-price`] = "Price must be greater than 0"
        }

        if (item.quantity && parseFloat(String(item.quantity)) <= 0) {
          newErrors[`item-${index}-quantity`] = "Quantity must be greater than 0"
        }
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      onSave(editedData)
    }
  }

  // Handle copy to clipboard
  const handleCopyToClipboard = () => {
    copyReceiptDataToClipboard(
      editedData,
      () => {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 3000)
      },
      (error) => alert(error)
    )
  }

  // Calculate per-housemate totals for display
  const housemateTotals = calculateHousemateTotals()

  // Add these handlers for tax option changes
  const handleTaxOptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSelectedTaxOption(value)

    if (value === "custom") {
      // Keep current custom rate
    } else if (value === "0%") {
      setCustomTaxRate("0")
    } else {
      // Extract percentage from the option (e.g., "13%" -> "13")
      const rate = value.replace("%", "")
      setCustomTaxRate(rate)
    }
  }

  const handleCustomTaxRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomTaxRate(value)
    setSelectedTaxOption("custom")
  }

  const handleCustomTaxAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d.-]/g, "")
    setCustomTaxAmount(value)
  }

  const handleUseDirect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUseDirect(e.target.checked)
  }

  // Update useEffect to recalculate when tax options change
  useEffect(() => {
    updateTotals()
  }, [editedData.items, customTaxRate, customTaxAmount, useDirect])

  return (
    <div className="bg-white rounded-lg shadow-md p-4 w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Edit Receipt</h2>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={handleCopyToClipboard}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
            Copy for Sheet
          </button>
        </div>
      </div>

      {copySuccess && <div className="mb-4 p-2 bg-green-100 text-green-800 rounded-md text-sm">Receipt data copied to clipboard!</div>}

      <form onSubmit={handleSubmit}>
        {/* Receipt Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <input
              type="text"
              value={editedData.vendor || ""}
              onChange={(e) => handleMetadataChange("vendor", e.target.value)}
              className={`w-full p-2 border rounded-md ${errors.vendor ? "border-red-500" : "border-gray-300"}`}
              placeholder="Store or vendor name"
            />
            {errors.vendor && <p className="text-red-500 text-xs mt-1">{errors.vendor}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={editedData.date || new Date().toISOString().split("T")[0]}
              onChange={(e) => handleMetadataChange("date", e.target.value)}
              className={`w-full p-2 border rounded-md ${errors.date ? "border-red-500" : "border-gray-300"}`}
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
            <select
              value={editedData.expenseType || ExpenseType.Others}
              onChange={(e) => handleMetadataChange("expenseType", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              {Object.entries(ExpenseType)
                .filter(([key]) => isNaN(Number(key))) // Filter out numeric keys
                .map(([key, value]) => (
                  <option key={value} value={value}>
                    {key}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receipt ID</label>
            <input
              type="text"
              value={editedData.receiptId || ""}
              onChange={(e) => handleMetadataChange("receiptId", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Optional receipt ID"
            />
          </div>
        </div>

        {/* Receipt-Level Expense Sharing */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-md font-medium">Receipt-Level Expense Sharing</h3>
            <div className="space-x-2">
              <button
                type="button"
                onClick={() => toggleAllHousemates(1)}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => toggleAllHousemates(0)}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
              >
                Deselect All
              </button>
              <button
                type="button"
                onClick={applyReceiptSharingToAll}
                className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
              >
                Apply to All Items
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {HOUSEMATES.map((housemate) => (
              <div
                key={housemate}
                className={`flex items-center p-2 rounded border ${
                  editedData.involvedHousemates?.[housemate] === 1 ? "border-blue-300 bg-blue-50" : "border-gray-200"
                }`}
              >
                <input
                  type="checkbox"
                  id={`housemate-${housemate}`}
                  checked={editedData.involvedHousemates?.[housemate] === 1}
                  onChange={() => toggleReceiptHousemateInvolvement(housemate)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor={`housemate-${housemate}`} className="ml-2 text-sm font-medium text-gray-700 cursor-pointer">
                  {housemate}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {editedData.items.map((item, index) => (
                <React.Fragment key={index}>
                  <tr className="border-b">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        className={`w-full p-1 border rounded ${errors[`item-${index}-description`] ? "border-red-500" : "border-gray-300"}`}
                        placeholder="Item description"
                      />
                      {errors[`item-${index}-description`] && <p className="text-red-500 text-xs mt-1">{errors[`item-${index}-description`]}</p>}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.quantity || "1"}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                        className={`w-20 p-1 border rounded text-right ${errors[`item-${index}-quantity`] ? "border-red-500" : "border-gray-300"}`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.unit_price || "0.00"}
                        onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                        className={`w-24 p-1 border rounded text-right ${errors[`item-${index}-price`] ? "border-red-500" : "border-gray-300"}`}
                      />  
                    </td>
                    <td className="px-4 py-2">{item.price}</td>
                    <td className="px-4 py-2">
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => toggleItemExpanded(index)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="Toggle sharing options"
                        >
                          {expandedItems[index] ? <span>👥 Hide</span> : <span>👥 Share</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Remove item"
                        >
                          ❌
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded housemate sharing section for this item */}
                  {expandedItems[index] && (
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="px-4 py-2">
                        <div className="p-2 rounded border border-gray-200">
                          <h4 className="text-sm font-medium mb-2">Who's involved in this item?</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {HOUSEMATES.map((housemate) => (
                              <div
                                key={`item-${index}-${housemate}`}
                                className={`flex items-center p-1 rounded border ${
                                  item.involvedHousemates?.[housemate] === 1 ? "border-blue-300 bg-blue-50" : "border-gray-200"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  id={`item-${index}-housemate-${housemate}`}
                                  checked={item.involvedHousemates?.[housemate] === 1}
                                  onChange={() => toggleItemHousemateInvolvement(index, housemate)}
                                  className="h-4 w-4 text-blue-600 rounded"
                                />
                                <label htmlFor={`item-${index}-housemate-${housemate}`} className="ml-2 text-sm text-gray-700 cursor-pointer">
                                  {housemate}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="p-2">
                  <button type="button" onClick={handleAddItem} className="px-4 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200">
                    + Add Item
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>

          {errors.items && <p className="text-red-500 text-sm mt-1">{errors.items}</p>}
        </div>

        {/* Receipt Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-md font-semibold mb-2">Receipt Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${formatCurrency(editedData.subtotal)}</span>
              </div>

              {/* Custom Tax Component */}
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="use-direct"
                    checked={useDirect}
                    onChange={handleUseDirect}
                    className="h-4 w-4 text-blue-600 rounded mr-2"
                  />
                  <label htmlFor="use-direct" className="text-sm font-medium">
                    Enter tax amount directly
                  </label>
                </div>

                {useDirect ? (
                  <div className="flex items-center">
                    <span className="mr-2">Tax amount:</span>
                    <div className="relative mt-1 rounded-md shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="text"
                        value={customTaxAmount}
                        onChange={handleCustomTaxAmountChange}
                        className="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex mb-2">
                      <select
                        value={selectedTaxOption}
                        onChange={handleTaxOptionChange}
                        className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="13%">HST Ontario (13%)</option>
                        <option value="5%">GST Only (5%)</option>
                        <option value="12%">BC PST+GST (12%)</option>
                        <option value="15%">HST Nova Scotia (15%)</option>
                        <option value="0%">No Tax (0%)</option>
                        <option value="custom">Custom Rate</option>
                      </select>
                    </div>

                    {selectedTaxOption === "custom" && (
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={customTaxRate}
                          onChange={handleCustomTaxRateChange}
                          className="block w-20 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          placeholder="Rate"
                        />
                        <span className="ml-2">%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <span>Tax:</span>
                <span className={parseFloat(editedData.tax as string) < 0 ? "text-red-600" : ""}>${formatCurrency(editedData.tax)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>${formatCurrency(editedData.total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-md font-semibold mb-2">Per-Person Breakdown</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {HOUSEMATES.map((housemate) => (
                <div key={`total-${housemate}`} className="flex justify-between">
                  <span className="text-sm">{housemate}:</span>
                  <span className="text-sm font-medium">${housemateTotals[housemate].toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Save Receipt
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditableReceiptTable
