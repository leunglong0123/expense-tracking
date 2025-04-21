import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function ReceiptDetail() {
  const router = useRouter();
  const { id } = router.query;

  // This would be replaced with actual data fetching logic
  const receipt = {
    id: id,
    date: '2023-04-15',
    vendor: 'Starbucks',
    total: 12.99,
    items: [
      { name: 'Caffè Latte', price: 5.99, quantity: 1 },
      { name: 'Croissant', price: 3.50, quantity: 2 },
    ]
  };

  return (
    <>
      <Head>
        <title>Receipt Details | Expense Tracker</title>
        <meta name="description" content="View receipt details" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={`min-h-screen p-8 ${inter.className}`}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/" className="text-blue-600 hover:underline">
              ← Back to Home
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold mb-6">Receipt #{id}</h1>
          
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-gray-600">Date</p>
                <p className="font-medium">{receipt.date}</p>
              </div>
              <div>
                <p className="text-gray-600">Vendor</p>
                <p className="font-medium">{receipt.vendor}</p>
              </div>
              <div>
                <p className="text-gray-600">Total</p>
                <p className="font-medium">${receipt.total.toFixed(2)}</p>
              </div>
            </div>
            
            <h2 className="text-xl font-bold mb-4">Items</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2">Item</th>
                  <th className="text-right pb-2">Qty</th>
                  <th className="text-right pb-2">Price</th>
                  <th className="text-right pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{item.name}</td>
                    <td className="text-right py-2">{item.quantity}</td>
                    <td className="text-right py-2">${item.price.toFixed(2)}</td>
                    <td className="text-right py-2">${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-right pt-4 font-bold">Total:</td>
                  <td className="text-right pt-4 font-bold">${receipt.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Edit Receipt
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Delete Receipt
            </button>
          </div>
        </div>
      </main>
    </>
  );
} 