import Head from 'next/head';
import Link from 'next/link';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function History() {
  // This would be replaced with actual data fetching logic
  const receipts = [
    { id: '1', date: '2023-04-15', vendor: 'Starbucks', total: 12.99 },
    { id: '2', date: '2023-04-14', vendor: 'Walmart', total: 67.82 },
    { id: '3', date: '2023-04-12', vendor: 'Amazon', total: 45.33 },
    { id: '4', date: '2023-04-10', vendor: 'Target', total: 28.99 },
    { id: '5', date: '2023-04-08', vendor: 'Whole Foods', total: 89.76 },
  ];

  return (
    <>
      <Head>
        <title>Receipt History | Expense Tracker</title>
        <meta name="description" content="View your expense history" />
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
          
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Receipt History</h1>
            <div className="flex gap-4">
              <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                Filter
              </button>
              <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                Sort
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 text-left">Date</th>
                  <th className="py-3 px-4 text-left">Vendor</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <tr key={receipt.id} className="border-t hover:bg-gray-50">
                    <td className="py-3 px-4">{receipt.date}</td>
                    <td className="py-3 px-4">{receipt.vendor}</td>
                    <td className="py-3 px-4 text-right">${receipt.total.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">
                      <Link 
                        href={`/receipt/${receipt.id}`}
                        className="text-blue-600 hover:underline mx-2"
                      >
                        View
                      </Link>
                      <button className="text-red-600 hover:underline mx-2">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 flex justify-between items-center">
            <div>
              <span className="text-gray-600">Showing 1-5 of 5 receipts</span>
            </div>
            <div className="flex gap-2">
              <button disabled className="px-3 py-1 bg-gray-100 rounded text-gray-400">
                Previous
              </button>
              <button disabled className="px-3 py-1 bg-gray-100 rounded text-gray-400">
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
} 