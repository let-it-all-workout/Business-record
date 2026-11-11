import { useState, useMemo } from 'react';
import { Sale, Product } from '../types';
import { formatCurrency } from '../utils/format';
import { roundMoney, saleProfit, saleRevenue } from '../utils/saleMath';
import { useAuth } from '../contexts/AuthContext';

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  currency: string;
}

interface FinancialManagerProps {
  sales: Sale[];
  products?: Product[];
  globalCurrency: string;
}

export default function FinancialManager({ sales, globalCurrency }: FinancialManagerProps) {
  const { canSeeFinancialData } = useAuth();
  const canSeeFinancial = canSeeFinancialData();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'operating',
    date: new Date().toISOString().split('T')[0],
  });

  const validSales = sales.filter(s => s && s !== null);
  const moneySales = validSales.filter((s) => (s.currency || globalCurrency) === globalCurrency);
  const otherCurrencyCount = validSales.length - moneySales.length;

  const revenue = roundMoney(moneySales.reduce((sum, s) => sum + saleRevenue(s), 0));
  const grossProfit = roundMoney(moneySales.reduce((sum, s) => sum + saleProfit(s), 0));
  const cogs = roundMoney(revenue - grossProfit);

  // Calculate Total Expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate Net Profit
  const netProfit = grossProfit - totalExpenses;

  // Planning estimate only. This is not a tax filing calculation.
  const taxRate = 0.20;
  const tax = netProfit > 0 ? roundMoney(netProfit * taxRate) : 0;
  const profitAfterTax = netProfit - tax;

  const handleAddExpense = () => {
    const amount = Number(expenseForm.amount);
    if (!expenseForm.description || !Number.isFinite(amount) || amount < 0) return;

    const newExpense: Expense = {
      id: `expense-${Date.now()}`,
      date: expenseForm.date,
      description: expenseForm.description,
      amount: roundMoney(amount),
      category: expenseForm.category,
      currency: globalCurrency,
    };

    setExpenses([...expenses, newExpense]);
    setExpenseForm({
      description: '',
      amount: '',
      category: 'operating',
      date: new Date().toISOString().split('T')[0],
    });
    setShowExpenseForm(false);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  // Expense categories
  const expenseCategories = [
    { value: 'operating', label: 'Operating Expenses' },
    { value: 'rent', label: 'Rent' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'salaries', label: 'Salaries' },
    { value: 'other', label: 'Other' },
  ];

  // Expenses by category
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    expenses.forEach(e => {
      grouped[e.category] = (grouped[e.category] || 0) + e.amount;
    });
    return grouped;
  }, [expenses]);

  return (
    <div className="space-y-6">
      {otherCurrencyCount > 0 && (
        <p className="text-sm text-slate-500">
          {otherCurrencyCount} sale{otherCurrencyCount === 1 ? '' : 's'} in another currency {otherCurrencyCount === 1 ? 'is' : 'are'} not included in these totals.
        </p>
      )}
      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-slate-600 mb-1">Revenue</p>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(revenue, globalCurrency)}
          </p>
        </div>
        {canSeeFinancial && (
        <>
        <div className="card p-4">
          <p className="text-sm text-slate-600 mb-1">COGS</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(cogs, globalCurrency)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-600 mb-1">Gross Profit</p>
          <p className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(grossProfit, globalCurrency)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-600 mb-1">Net Profit</p>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(netProfit, globalCurrency)}
          </p>
        </div>
        </>
        )}
      </div>
      {!canSeeFinancial && (
        <p className="text-sm text-slate-500">Cost, profit, and the tax estimate are visible to managers.</p>
      )}

      {canSeeFinancial && (
      <>
      {/* Financial Breakdown */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Financial Breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-700">Total Revenue</span>
            <span className="font-semibold text-slate-900">{formatCurrency(revenue, globalCurrency)}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-700">Cost of Goods Sold (COGS)</span>
            <span className="font-semibold text-red-600">-{formatCurrency(cogs, globalCurrency)}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <span className="text-emerald-900 font-medium">Gross Profit</span>
            <span className="font-bold text-emerald-700">{formatCurrency(grossProfit, globalCurrency)}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-700">Operating Expenses</span>
            <span className="font-semibold text-red-600">-{formatCurrency(totalExpenses, globalCurrency)}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-blue-900 font-medium">Net Profit (Before Tax)</span>
            <span className={`font-bold ${netProfit >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
              {formatCurrency(netProfit, globalCurrency)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-700">Estimated tax ({taxRate * 100}%)</span>
            <span className="font-semibold text-red-600">-{formatCurrency(tax, globalCurrency)}</span>
          </div>
          <p className="text-xs text-slate-500 px-3">Estimated tax (20%) is for planning. It is not a figure for filing.</p>
          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border-2 border-emerald-300">
            <span className="text-emerald-900 font-bold">Profit After Tax</span>
            <span className={`text-2xl font-bold ${profitAfterTax >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatCurrency(profitAfterTax, globalCurrency)}
            </span>
          </div>
        </div>
      </div>

      {/* Expense Management */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Expense Management</h3>
          <button
            onClick={() => setShowExpenseForm(!showExpenseForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showExpenseForm ? 'Cancel' : 'Add Expense'}
          </button>
        </div>

        {showExpenseForm && (
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="e.g., Office rent"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {expenseCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <button
              onClick={handleAddExpense}
              className="mt-4 w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Add Expense
            </button>
          </div>
        )}

        {/* Expenses List */}
        {expenses.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No expenses recorded yet</p>
        ) : (
          <div className="space-y-2">
            {expenses.map(expense => (
              <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{expense.description}</p>
                  <p className="text-xs text-slate-500">
                    {expenseCategories.find(c => c.value === expense.category)?.label} • {new Date(expense.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-red-600">
                    {formatCurrency(expense.amount, globalCurrency)}
                  </span>
                  <button
                    onClick={() => handleDeleteExpense(expense.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expenses by Category */}
        {Object.keys(expensesByCategory).length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-semibold text-slate-900 mb-3">Expenses by Category</h4>
            <div className="space-y-2">
              {Object.entries(expensesByCategory).map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <span className="text-sm text-slate-700">
                    {expenseCategories.find(c => c.value === category)?.label || category}
                  </span>
                  <span className="text-sm font-medium text-red-600">
                    {formatCurrency(amount, globalCurrency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}

