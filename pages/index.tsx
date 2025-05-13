import { useState, useEffect } from "react"
import { useSession, signIn } from "next-auth/react"
import Head from "next/head"
import { useRouter } from "next/router"
import UploadComponent from "../components/ui/UploadComponent"
import EditableReceiptTable from "../components/ui/EditableReceiptTable"
import { ExpenseType, HOUSEMATES } from "../lib/sheetsService"
import { CreditCard, getCreditCards, getDefaultCreditCard } from "../lib/creditCardService"
import Layout from "../components/Layout"

// Define interface for receipt items
interface ReceiptItem {
  description: string
  price: string | number
  quantity?: string | number
  date?: string
}

// Define interface for receipt data
interface ReceiptData {
  items: ReceiptItem[]
  total?: string | number
  vendor?: string
  date?: string
  tax?: string | number
  subtotal?: string | number
  receiptId?: string
}

// Interface for OCR API response
interface OcrResponse {
  ocrResult?: ReceiptData
  success: boolean
  originalFile: File
}

export default function Home() {
  const [ocrResult, setOcrResult] = useState<ReceiptData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null)
  const [expenseType, setExpenseType] = useState<ExpenseType>(ExpenseType.Food)
  const [selectedHousemates, setSelectedHousemates] = useState<string[]>(HOUSEMATES)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isEditing, setIsEditing] = useState(false)


  // Handle OCR completion
  const handleOcrComplete = (result: OcrResponse) => {
    // Extract the ocrResult if it's nested
    const receiptData = result.ocrResult ? result.ocrResult : (result as unknown as ReceiptData)
    setOcrResult(receiptData)
    setReceiptFile(result.originalFile)
    setIsEditing(true)
  }

  // Handle OCR error
  const handleOcrError = (errorMsg: string) => {
    setError(errorMsg)
    setTimeout(() => setError(null), 5000)
  }

  // Handle receipt edit
  const handleEditReceipt = (editedData: ReceiptData) => {
    setOcrResult(editedData)
    setIsEditing(false)
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  // Toggle housemate selection
  const toggleHousemate = (name: string) => {
    setSelectedHousemates((prev) => {
      if (prev.includes(name)) {
        return prev.filter((h) => h !== name)
      } else {
        return [...prev, name]
      }
    })
  }

  // Select all housemates
  const selectAllHousemates = () => {
    setSelectedHousemates([...HOUSEMATES])
  }

  // Deselect all housemates
  const deselectAllHousemates = () => {
    setSelectedHousemates([])
  }

  return (
    <Layout>
      <Head>
        <title>Receipt Scanner</title>
        <meta name="description" content="Scan and track your receipts" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Add existing authenticated content here */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Receipt</h2>
              {!ocrResult && (
                <UploadComponent
                  onUploadComplete={handleOcrComplete}
                  onError={handleOcrError}
                  maxFileSize={10}
                  acceptedFileTypes={["image/jpeg", "image/png", "image/gif"]}
                />
              )}

              {/* Show EditableReceiptTable when in editing mode */}
              {ocrResult && isEditing && (
                <div className="mt-6">
                  <EditableReceiptTable data={ocrResult} onSave={handleEditReceipt} onCancel={handleCancelEdit} />
                </div>
              )}

              {/* Error and Success Messages */}
              {error && <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">{error}</div>}

              {success && <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-md">{success}</div>}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
