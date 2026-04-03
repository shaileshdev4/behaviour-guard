export default function HistoryPage() {
  const transactions = [
    { id: 'TXN8821', name: 'Swiggy', amount: '-₹450', date: 'Apr 3, 2026', status: 'Success', icon: '🍔' },
    { id: 'TXN8820', name: 'Salary', amount: '+₹85,000', date: 'Apr 2, 2026', status: 'Success', icon: '💰' },
    { id: 'TXN8819', name: 'Amazon', amount: '-₹2,340', date: 'Apr 2, 2026', status: 'Success', icon: '📦' },
    { id: 'TXN8818', name: 'Netflix', amount: '-₹649', date: 'Apr 1, 2026', status: 'Success', icon: '📺' },
    { id: 'TXN8817', name: 'Zepto', amount: '-₹340', date: 'Mar 31, 2026', status: 'Success', icon: '🛒' },
    { id: 'TXN8816', name: 'UPI Transfer', amount: '-₹5,000', date: 'Mar 30, 2026', status: 'Success', icon: '📱' },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-white text-2xl font-bold">Transaction History</h1>
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-5 py-3 text-slate-400 text-sm font-medium">Transaction</th>
              <th className="text-left px-5 py-3 text-slate-400 text-sm font-medium">Date</th>
              <th className="text-right px-5 py-3 text-slate-400 text-sm font-medium">Amount</th>
              <th className="text-right px-5 py-3 text-slate-400 text-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/30">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span>{tx.icon}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{tx.name}</p>
                      <p className="text-slate-500 text-xs">{tx.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-400 text-sm">{tx.date}</td>
                <td className={`px-5 py-4 text-sm font-semibold text-right ${
                  tx.amount.startsWith('+') ? 'text-green-400' : 'text-slate-300'
                }`}>{tx.amount}</td>
                <td className="px-5 py-4 text-right">
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
