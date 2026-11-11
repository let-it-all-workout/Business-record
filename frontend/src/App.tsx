import { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Sale, StockHistory, StockBatch, GoodsInventory } from './types';
import { dataService } from './utils/dataService';
import { exportProductsToCSV, exportSalesToCSV, exportInventoryToCSV } from './utils/export';
import { checkInventoryAlerts } from './utils/alerts';
import { formatCurrency, formatNumber } from './utils/format';
import { marginPercent, roundMoney, saleProfit, saleRevenue } from './utils/saleMath';
import ProductForm from './components/ProductForm';
import GoodsInventoryForm from './components/GoodsInventoryForm';
import BulkProductForm from './components/BulkProductForm';
import BulkInventoryForm from './components/BulkInventoryForm';
import GoodsInventorySection from './components/GoodsInventorySection';
import SalesForm from './components/SalesForm';
import AddStockForm from './components/AddStockForm';
import SalesHistory from './components/SalesHistory';
import StockHistoryView from './components/StockHistoryView';
import AlertsPanel from './components/AlertsPanel';
import SalesAnalytics from './components/SalesAnalytics';
import SuccessToast from './components/SuccessToast';
import RevenueCharts from './components/RevenueCharts';
import AdvancedFilters, { FilterState } from './components/AdvancedFilters';
import SettingsPanel, { UserSettings } from './components/SettingsPanel';
import CustomerManagement from './components/CustomerManagement';
import CategoryManager from './components/CategoryManager';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import QRCodeGenerator from './components/QRCodeGenerator';
import InventoryOptimization from './components/InventoryOptimization';
import FinancialManager from './components/FinancialManager';
import MobileInstallPrompt from './components/MobileInstallPrompt';
import BackupManager from './components/BackupManager';
import LoginForm from './components/LoginForm';
import PINVerification from './components/PINVerification';
import RegisterForm from './components/RegisterForm';
import SuperAdminPanel from './components/SuperAdminPanel';
import UserManagement from './components/UserManagement';
import ThemeToggle from './components/ThemeToggle';
import { useAuth } from './contexts/AuthContext';
import { notificationService } from './utils/notifications';
import { generateSalesReport, generateFinancialReport } from './utils/pdfReports';
import { CURRENCIES } from './constants/currencies';

type ViewMode = 'products' | 'sales';


function App() {
  const { isAuthenticated, loading, user, logout, hasPermission, business, isSuperAdmin, canSeeFinancialData } = useAuth();
  const isBusinessAdmin = user?.role === 'admin' || isSuperAdmin;
  
  // Debug logging removed for security
  const [showRegister, setShowRegister] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    localStorage.getItem('selected_business_id')
  );
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [goodsInventories, setGoodsInventories] = useState<GoodsInventory[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingInventory, setEditingInventory] = useState<GoodsInventory | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showBulkProductForm, setShowBulkProductForm] = useState(false);
  const [showGoodsInventoryForm, setShowGoodsInventoryForm] = useState(false);
  const [showBulkInventoryForm, setShowBulkInventoryForm] = useState(false);
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [showAddStockForm, setShowAddStockForm] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('products');
  const [viewingStockHistory, setViewingStockHistory] = useState<Product | null>(null);
  const [_selectedProductForSale, _setSelectedProductForSale] = useState<Product | null>(null);
  const [_selectedProductForStock, _setSelectedProductForStock] = useState<Product | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [globalCurrency, setGlobalCurrency] = useState<string>('USD');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [showMobileSearch, setShowMobileSearch] = useState<boolean>(false);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const [revenueViewMode, setRevenueViewMode] = useState<'overall' | 'yearly'>('overall');
  const [showSettings, setShowSettings] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showCustomers, setShowCustomers] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [_salesFilters, setSalesFilters] = useState<FilterState>({});
  const [_userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [showPINVerification, setShowPINVerification] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    // Request notification permission on mount
    notificationService.requestPermission();
    
    // Load settings
    const savedSettings = localStorage.getItem('business-record-settings');
    if (savedSettings) {
      try {
        // Check if it's valid JSON
        if (savedSettings.trim().startsWith('{') || savedSettings.trim().startsWith('[')) {
          const parsed = JSON.parse(savedSettings);
          setUserSettings(parsed);
          if (parsed.currency) {
            setGlobalCurrency(parsed.currency);
          }
          // Apply theme immediately on load
          if (parsed.theme) {
            const root = document.documentElement;
            if (parsed.theme === 'dark') {
              root.classList.add('dark');
            } else if (parsed.theme === 'light') {
              root.classList.remove('dark');
            } else if (parsed.theme === 'auto') {
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (prefersDark) {
                root.classList.add('dark');
              } else {
                root.classList.remove('dark');
              }
            }
          }
        } else {
          console.warn('Invalid settings format in localStorage, clearing...');
          localStorage.removeItem('business-record-settings');
        }
      } catch (e) {
        console.error('Error loading settings:', e);
        // Clear corrupted settings
        localStorage.removeItem('business-record-settings');
      }
    }
  }, []);

  // Load businesses for super admin
  useEffect(() => {
    if (isSuperAdmin && isAuthenticated) {
      const loadBusinesses = async () => {
        try {
          const token = localStorage.getItem('auth_token');
          // Use API_BASE_URL from environment
          const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : '/api');
          const API_BASE_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
          const response = await fetch(`${API_BASE_URL}/auth/businesses`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const data = await response.json();
              setBusinesses(data);
            }
          }
        } catch (error) {
          console.error('Error loading businesses:', error);
        }
      };
      loadBusinesses();
    }
  }, [isSuperAdmin, isAuthenticated]);

  // Close mobile search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
        // Check if the click is not on the search button
        const searchButton = (event.target as HTMLElement).closest('button[title="Search"]');
        if (!searchButton) {
          setShowMobileSearch(false);
        }
      }
    };

    if (showMobileSearch) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMobileSearch]);

  useEffect(() => {
    // Wait for auth to finish loading first
    if (loading) {
      return;
    }

    // Don't load if not authenticated
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    // If super admin and no business selected, show business list (no data loading needed)
    if (isSuperAdmin && !selectedBusinessId) {
      setIsLoading(false);
      return;
    }

    // Load data from API (SQLite database)
    const loadData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        console.log('Starting to load data...');
        
        // Load currency
        // Debug logging removed
        const currency = await dataService.getCurrency();
        setGlobalCurrency(currency);
        console.log('Currency loaded:', currency);
        
        // Load products
        console.log('Loading products...');
        const loadedProducts = await dataService.getProducts();
        setProducts(loadedProducts);
        console.log('Products loaded:', loadedProducts.length);
        
        // Load sales
        console.log('Loading sales...');
        const loadedSales = await dataService.getSales();
        setSales(loadedSales);
        console.log('Sales loaded:', loadedSales.length);
        
        // Load inventories
        console.log('Loading inventories...');
        const loadedInventories = await dataService.getInventories();
        setGoodsInventories(loadedInventories);
        console.log('Inventories loaded:', loadedInventories.length);
        
        console.log('All data loaded successfully!');
      } catch (error) {
        console.error('Error loading data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
        const apiUrl = import.meta.env.VITE_API_URL || 'backend server';
        setLoadError(`Error: ${errorMessage}\n\nPlease check your VITE_API_URL environment variable (currently: ${apiUrl}) and ensure the backend is running.`);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [loading, isAuthenticated, selectedBusinessId, isSuperAdmin]);

  // Check for inventory alerts
  const inventoryAlerts = useMemo(() => {
    const alerts = checkInventoryAlerts(products, goodsInventories, globalCurrency);
    return alerts.filter(alert => !dismissedAlerts.has(alert.id));
  }, [products, goodsInventories, globalCurrency, dismissedAlerts]);

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const handleAddProduct = async (productData: Omit<Product, 'id' | 'stockHistory' | 'batches'> & { stockHistory?: Product['stockHistory']; batches?: Product['batches']; inventoryId?: string }) => {
    // Require inventoryId for new products
    if (!productData.inventoryId) {
      alert('Error: All products must be added to an inventory. Please select an inventory.');
      return;
    }

    // Add as a "good" to the selected inventory
    const inventory = goodsInventories.find(inv => inv.id === productData.inventoryId);
    if (!inventory) {
      alert('Error: Selected inventory not found. Please try again.');
      return;
    }

    try {
      const updatedInventory: GoodsInventory = {
        ...inventory,
        goods: [
          ...inventory.goods,
          {
            id: `good-${Date.now()}-${Math.random()}`,
            name: productData.name,
            quantity: productData.quantity,
            remainingQuantity: productData.quantity,
            unitPrice: productData.price,
            currency: globalCurrency,
          },
        ],
      };
      await dataService.updateInventory(inventory.id, updatedInventory);
      
      const updatedInventories = await dataService.getInventories();
      setGoodsInventories(updatedInventories);
      setShowProductForm(false);
      setSuccessMessage(`Product "${productData.name}" added to inventory "${inventory.name}" successfully!`);
    } catch (error) {
      console.error('Error adding product to inventory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add product to inventory';
      alert(`Error: ${errorMessage}\n\nPlease ensure the server is running and the database is accessible.`);
    }

    // Legacy product creation removed - all products must be in an inventory
    const initialQuantity = productData.quantity;
    const purchaseDate = new Date().toISOString().split('T')[0];
    
    // Create initial batch if quantity > 0
    const batches: StockBatch[] = initialQuantity > 0 ? [{
      id: `batch-${Date.now()}`,
      purchaseDate,
      quantity: initialQuantity,
      remainingQuantity: initialQuantity,
      purchasePrice: productData.price, // Use base price as initial purchase price
    }] : [];
    
    const stockHistory: StockHistory[] = initialQuantity > 0 ? [{
      id: `history-${Date.now()}`,
      date: new Date().toISOString(),
      quantity: initialQuantity,
      type: 'added',
      batchId: batches[0]?.id,
    }] : [];
    
    try {
      await dataService.createProduct({
        ...productData,
        batches,
        stockHistory,
      });
      
      // Reload products to get the latest data
      const updatedProducts = await dataService.getProducts();
      setProducts(updatedProducts);
      setShowProductForm(false);
      setSuccessMessage(`Product "${productData.name}" created successfully!`);
    } catch (error) {
      console.error('Error creating product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create product';
      alert(`Error: ${errorMessage}\n\nPlease ensure the server is running and the database is accessible.`);
    }
  };

  const handleBulkAddProducts = async (productsData: Array<Omit<Product, 'id' | 'stockHistory' | 'batches'> & { inventoryId?: string }>) => {
    try {
      let successCount = 0;
      let errorCount = 0;

      // Require inventoryId for all products
      const firstProduct = productsData[0];
      if (!firstProduct?.inventoryId) {
        alert('Error: All products must be added to an inventory. Please select an inventory.');
        return;
      }

      const inventory = goodsInventories.find(inv => inv.id === firstProduct.inventoryId);
      if (!inventory) {
        alert('Error: Selected inventory not found. Please try again.');
        return;
      }

      for (const productData of productsData) {
        try {
          // All products must have the same inventoryId
          if (!productData.inventoryId || productData.inventoryId !== firstProduct.inventoryId) {
            console.warn(`Product "${productData.name}" missing or mismatched inventoryId. Skipping.`);
            errorCount++;
            continue;
          }

          // Add as a "good" to the selected inventory
          const updatedInventory: GoodsInventory = {
            ...inventory,
            goods: [
              ...inventory.goods,
              {
                id: `good-${Date.now()}-${Math.random()}`,
                name: productData.name,
                quantity: productData.quantity,
                remainingQuantity: productData.quantity,
                unitPrice: productData.price,
                currency: globalCurrency,
              },
            ],
          };
          await dataService.updateInventory(inventory.id, updatedInventory);
          
          // Reload inventory to get updated state for next iteration
          const updatedInventories = await dataService.getInventories();
          const updatedInv = updatedInventories.find(inv => inv.id === inventory.id);
          if (updatedInv) {
            Object.assign(inventory, updatedInv);
          }
          
          successCount++;
        } catch (error) {
          console.error(`Error adding product "${productData.name}":`, error);
          errorCount++;
        }
      }

      // Reload inventories to get latest state
      const updatedInventories = await dataService.getInventories();
      setGoodsInventories(updatedInventories);
      
      setShowBulkProductForm(false);
      if (successCount > 0) {
        setSuccessMessage(`Successfully added ${successCount} product(s) to inventory "${inventory.name}"${errorCount > 0 ? ` (${errorCount} failed)` : ''}!`);
      } else {
        alert(`Failed to add products. ${errorCount} error(s) occurred.`);
      }
    } catch (error) {
      console.error('Error in bulk add:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add products';
      alert(`Error: ${errorMessage}\n\nPlease ensure the server is running and the database is accessible.`);
    }
  };

  const handleBulkCreateInventories = async (inventoriesData: Array<Omit<GoodsInventory, 'id' | 'createdAt'>>) => {
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const inventoryData of inventoriesData) {
        try {
          await dataService.createInventory(inventoryData);
          successCount++;
        } catch (error) {
          console.error(`Error creating inventory "${inventoryData.name}":`, error);
          errorCount++;
        }
      }

      // Reload inventories
      const updatedInventories = await dataService.getInventories();
      setGoodsInventories(updatedInventories);
      setShowBulkInventoryForm(false);
      
      if (errorCount > 0) {
        setSuccessMessage(`Bulk create completed: ${successCount} inventories created, ${errorCount} failed.`);
      } else {
        setSuccessMessage(`Successfully created ${successCount} inventory/inventories!`);
      }
    } catch (error) {
      console.error('Error in bulk create:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create inventories';
      alert(`Error: ${errorMessage}\n\nPlease ensure the server is running and the database is accessible.`);
    }
  };

  const handleUpdateProduct = async (productData: Omit<Product, 'id' | 'stockHistory' | 'batches'> & { stockHistory?: Product['stockHistory']; batches?: Product['batches'] }) => {
    if (!editingProduct) return;
    
    try {
      await dataService.updateProduct(editingProduct.id, {
        name: productData.name,
        category: productData.category,
        price: productData.price,
      });
      
      // Reload products
      const updatedProducts = await dataService.getProducts();
      setProducts(updatedProducts);
      setEditingProduct(null);
      setShowProductForm(false);
      setSuccessMessage(`Product "${productData.name}" updated successfully!`);
    } catch (error) {
      console.error('Error updating product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update product';
      alert(`Error: ${errorMessage}\n\nPlease ensure the server is running and the database is accessible.`);
    }
  };

  const handleRecordSale = async (productId: string, quantity: number, sellingPrice: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (quantity > product.quantity) {
      alert(`Insufficient stock! Only ${product.quantity} available.`);
      return;
    }

    // FIFO: Sell from oldest batches first
    let remainingToSell = quantity;
    const batchDetails: Array<{ batchId: string; quantity: number; purchasePrice: number }> = [];
    product.batches.forEach((batch) => {
      if (remainingToSell <= 0 || batch.remainingQuantity === 0) {
        return;
      }
      
      const sellFromBatch = Math.min(remainingToSell, batch.remainingQuantity);
      remainingToSell -= sellFromBatch;
      
      batchDetails.push({
        batchId: batch.id,
        quantity: sellFromBatch,
        purchasePrice: batch.purchasePrice,
      });
    });

    if (remainingToSell > 0 || batchDetails.length === 0) {
      alert('Stock batches do not cover this quantity. Add stock before selling.');
      return;
    }

    const totalPurchaseCost = batchDetails.reduce((sum, batch) =>
      sum + (batch.quantity * batch.purchasePrice), 0
    );
    const purchasePrice = roundMoney(totalPurchaseCost / quantity);
    const profit = roundMoney((sellingPrice * quantity) - totalPurchaseCost);

    const newSale: Omit<Sale, 'id' | 'date'> = {
      productId,
      productName: product.name,
      quantity,
      sellingPrice,
      purchasePrice,
      profit,
      currency: globalCurrency,
      refunded: false,
      refundedQuantity: 0,
      batchDetails,
    };

    try {
      // Save sale to database
      await dataService.createSale(newSale);
      
      // Reload data from database to get updated state
      const updatedProducts = await dataService.getProducts();
      const updatedSales = await dataService.getSales();
      setProducts(updatedProducts);
      setSales(updatedSales);
      setShowSalesForm(false);
      _setSelectedProductForSale(null);
      
      // Show success message
      setSuccessMessage(`Sale recorded. ${quantity} units of ${product.name} sold for ${formatCurrency(quantity * sellingPrice, globalCurrency)} (profit ${formatCurrency(profit, globalCurrency)}).`);
    } catch (error) {
      console.error('Error recording sale:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to record sale';
      alert(`Error: ${errorMessage}\n\nPlease ensure the server is running and the database is accessible.`);
    }
  };

  const handleAddStock = async (productId: string, quantity: number, purchasePrice: number, purchaseDate: string, batchId?: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    try {
      // Save stock to database
      await dataService.addStock(productId, quantity, purchasePrice, purchaseDate, batchId);
      
      // Reload products from database to get updated state
      const updatedProducts = await dataService.getProducts();
      setProducts(updatedProducts);
      setShowAddStockForm(false);
      _setSelectedProductForStock(null);
      
      setSuccessMessage(`Stock added successfully! ${quantity} units added to ${product.name}`);
    } catch (error) {
      console.error('Error adding stock:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add stock';
      alert(`Error: ${errorMessage}\n\nPlease ensure the server is running and the database is accessible.`);
    }
  };

  // Legacy handlers - may be used in future updates
  // const _handleEdit = (product: Product) => {
  //   setEditingProduct(product);
  //   setShowProductForm(true);
  // };

  // const _handleDelete = async (id: string) => {
  //   try {
  //     await dataService.deleteProduct(id);
  //     
  //     // Reload data
  //     const updatedProducts = await dataService.getProducts();
  //     const updatedSales = await dataService.getSales();
  //     setProducts(updatedProducts);
  //     setSales(updatedSales);
  //   } catch (error) {
  //     console.error('Error deleting product:', error);
  //     const errorMessage = error instanceof Error ? error.message : 'Failed to delete product';
  //     alert(`Error: ${errorMessage}\n\nPlease ensure the server is running and the database is accessible.`);
  //   }
  // };

  const handleCreateGoodsInventory = async (inventoryData: Omit<GoodsInventory, 'id' | 'createdAt'>) => {
    try {
      await dataService.createInventory(inventoryData);
      
      // Reload inventories from database
      const updatedInventories = await dataService.getInventories();
      setGoodsInventories(updatedInventories);
      setShowGoodsInventoryForm(false);
      setEditingInventory(null);
      setSuccessMessage(`Inventory "${inventoryData.name}" created successfully!`);
    } catch (error) {
      console.error('Error creating inventory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create inventory';
      alert(`Error: ${errorMessage}\n\nPlease ensure the server is running and the database is accessible.`);
    }
  };

  const handleUpdateGoodsInventory = async (inventoryData: Omit<GoodsInventory, 'id' | 'createdAt'>) => {
    if (!editingInventory) return;
    
    try {
      await dataService.updateInventory(editingInventory.id, inventoryData);
      
      // Reload inventories from database
      const updatedInventories = await dataService.getInventories();
      setGoodsInventories(updatedInventories);
      setEditingInventory(null);
      setShowGoodsInventoryForm(false);
      setSuccessMessage(`Inventory "${inventoryData.name}" updated successfully!`);
    } catch (error) {
      console.error('Error updating inventory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update inventory';
      alert(`Error: ${errorMessage}\n\nPlease ensure the server is running and the database is accessible.`);
    }
  };

  const handleUpdateInventory = async (updatedInventory: GoodsInventory) => {
    try {
      await dataService.updateInventory(updatedInventory.id, updatedInventory);
      
      // Reload inventories from database
      const updatedInventories = await dataService.getInventories();
      setGoodsInventories(updatedInventories);
    } catch (error) {
      console.error('Error updating inventory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update inventory';
      alert(`Error: ${errorMessage}\n\nPlease ensure the server is running and the database is accessible.`);
    }
  };

  const handleDeleteInventory = async (id: string) => {
    try {
      await dataService.deleteInventory(id);
      
      // Reload inventories from database
      const updatedInventories = await dataService.getInventories();
      setGoodsInventories(updatedInventories);
    } catch (error) {
      console.error('Error deleting inventory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete inventory';
      alert(`Error: ${errorMessage}\n\nPlease ensure the server is running and the database is accessible.`);
    }
  };

  const handleCancel = () => {
    setShowProductForm(false);
    setShowBulkProductForm(false);
    setShowGoodsInventoryForm(false);
    setShowBulkInventoryForm(false);
    setShowSalesForm(false);
    setShowAddStockForm(false);
    setEditingProduct(null);
    setEditingInventory(null);
    _setSelectedProductForSale(null);
    _setSelectedProductForStock(null);
  };

  // Helper function to filter sales by year
  const getFilteredSales = useMemo(() => {
    if (revenueViewMode === 'yearly') {
      const currentYear = new Date().getFullYear();
      return sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate.getFullYear() === currentYear;
      });
    }
    return sales;
  }, [sales, revenueViewMode]);

  // Calculate statistics - count products from all inventories
  const goodsCount = goodsInventories.reduce((sum, inv) => sum + inv.goods.length, 0);
  const goodsStock = goodsInventories.reduce((sum, inv) =>
    sum + inv.goods.reduce((goodSum, good) => goodSum + (Number(good.remainingQuantity) || 0), 0), 0
  );
  const totalProducts = products.length + goodsCount;
  const totalStock = products.reduce((sum, product) => sum + (Number(product.quantity) || 0), 0) + goodsStock;
  const totalInventories = goodsInventories.length;

  // Add only sales in the business currency. Mixing currencies would make the total meaningless.
  const moneySales = getFilteredSales.filter((sale) => (sale.currency || globalCurrency) === globalCurrency);
  const otherCurrencyCount = getFilteredSales.length - moneySales.length;
  const totalRevenue = moneySales.reduce((sum, sale) => sum + saleRevenue(sale), 0);
  const totalProfit = moneySales.reduce((sum, sale) => sum + saleProfit(sale), 0);
  const profitMargin = marginPercent(totalProfit, totalRevenue);

  // Show loading state
  // Skip loading screen if: auth is loading OR super admin viewing business list
  const shouldShowLoading = loading || (isLoading && !(isSuperAdmin && !selectedBusinessId));
  
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center card p-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-900 mb-6"></div>
          <p className="text-lg font-semibold text-slate-900 mb-2">Loading Business Record</p>
          <p className="text-sm text-slate-500">Preparing your inventory dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full card p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Connection Error</h2>
          </div>
          <p className="text-sm text-slate-600 whitespace-pre-line mb-6">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary w-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated && !loading) {
    if (showRegister) {
      return <RegisterForm onSwitchToLogin={() => setShowRegister(false)} />;
    }
    return <LoginForm onSwitchToRegister={() => setShowRegister(true)} />;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen safe-top safe-bottom">
      {successMessage && (
        <SuccessToast
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}
      
      {/* Professional Header Bar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm safe-top">
        <div className="h-0.5 bg-teal-700" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
            <div className="min-w-0 flex-1 basis-48 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-700 text-white grid place-items-center font-bold shrink-0">BR</div>
              <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight truncate">
                Business Record
              </h1>
              <p className="text-xs text-slate-500 font-medium truncate">
                {user ? `${user.fullName} · ${user.role}` : 'Inventory Management'}
                {business ? ` · ${business.name}` : ''}
                {isSuperAdmin && selectedBusinessId
                  ? ` · ${businesses.find(b => b.id === selectedBusinessId)?.name || 'Selected business'}`
                  : ''}
              </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 ml-auto">
              {/* Super Admin: Switch Business Button */}
              {isSuperAdmin && selectedBusinessId && (
                <button
                  onClick={() => {
                    setSelectedBusinessId(null);
                    localStorage.removeItem('selected_business_id');
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                  title="Switch Business"
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Switch Business
                </button>
              )}

              <ThemeToggle />

              {/* Currency Selector */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <select
                  id="currency-select"
                  value={globalCurrency}
                  onChange={async (e) => {
                    const newCurrency = e.target.value;
                    setGlobalCurrency(newCurrency);
                    await dataService.setCurrency(newCurrency);
                  }}
                  className="bg-transparent border-0 text-slate-700 font-medium text-sm focus:ring-0 cursor-pointer"
                >
                  {CURRENCIES.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} - {curr.symbol}
                    </option>
                  ))}
                </select>
              </div>

              {/* Export Buttons */}
              {viewMode === 'products' && (
                <div className="hidden md:flex gap-2">
                  <button
                    onClick={() => exportProductsToCSV(products, globalCurrency)}
                    className="btn-icon"
                    title="Export Products"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => exportInventoryToCSV(goodsInventories, globalCurrency)}
                    className="btn-icon"
                    title="Export Inventory"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </div>
              )}
              {viewMode === 'sales' && (
                <>
                  <button
                    onClick={() => exportSalesToCSV(sales, globalCurrency)}
                    className="btn-icon hidden md:flex"
                    title="Export Sales to CSV"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => generateSalesReport(sales, { title: 'Sales Report', currency: globalCurrency })}
                    className="btn-icon hidden md:flex"
                    title="Generate PDF Sales Report"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => generateFinancialReport(sales, { title: 'Financial Report', currency: globalCurrency })}
                    className="btn-icon hidden md:flex"
                    title="Generate PDF Financial Report"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </button>
                </>
              )}

              {/* Mobile Search Button */}
              <button
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="md:hidden btn-icon"
                title="Search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Mobile Search Bar (shown when button is clicked) */}
              {showMobileSearch && (
                <div ref={mobileSearchRef} className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 p-4 z-50 shadow-lg">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={globalSearchQuery}
                      onChange={(e) => setGlobalSearchQuery(e.target.value)}
                      className="pl-10 pr-10 py-2 w-full bg-white border border-slate-300 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <button
                      onClick={() => {
                        setGlobalSearchQuery('');
                        setShowMobileSearch(false);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Desktop Search Bar */}
              <div className="hidden md:flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={globalSearchQuery}
                    onChange={(e) => setGlobalSearchQuery(e.target.value)}
                    className="pl-10 pr-8 py-2 w-36 lg:w-56 bg-white border border-slate-300 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {globalSearchQuery && (
                    <button
                      onClick={() => setGlobalSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* System Status */}
              <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-emerald-700">Online</span>
              </div>

              {/* User Actions */}
              <button
                onClick={() => {
                  console.log('[App] Settings button clicked');
                  setShowSettings(true);
                }}
                className="btn-icon"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {hasPermission('users:read') && (
                <button
                  onClick={() => {
                    console.log('[App] User Management button clicked, current state:', showUserManagement);
                    setShowUserManagement(!showUserManagement);
                  }}
                  className="btn-icon"
                  title="User Management"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </button>
              )}
              <button
                onClick={logout}
                className="btn-icon text-red-600"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto pb-3">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('products')}
                className={`shrink-0 px-3 sm:px-5 py-2 font-semibold text-sm rounded-lg transition-colors duration-200 ${
                  viewMode === 'products'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Products & Inventory
              </button>
              <button
                onClick={() => setViewMode('sales')}
                className={`shrink-0 px-3 sm:px-5 py-2 font-semibold text-sm rounded-lg transition-colors duration-200 ${
                  viewMode === 'sales'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sales & Analytics
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Super Admin: Show business list if no business selected */}
      {isSuperAdmin && !selectedBusinessId && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
          <SuperAdminPanel
            onSelectBusiness={(businessId) => {
              if (businessId) {
                setSelectedBusinessId(businessId);
                localStorage.setItem('selected_business_id', businessId);
                // Trigger data reload
                window.location.reload();
              }
            }}
            selectedBusinessId={selectedBusinessId}
            showBusinessList={true}
          />
        </div>
      )}

      {/* Super Admin: Show business details when business is selected */}
      {isSuperAdmin && selectedBusinessId && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-6">
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-blue-900 break-words">
                  Viewing: {businesses.find(b => b.id === selectedBusinessId)?.name || 'Selected Business'}
                </h2>
                <p className="text-sm text-blue-700 mt-1">
                  All data below is filtered for this business. Use this to help clients with issues.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedBusinessId(null);
                  localStorage.removeItem('selected_business_id');
                  window.location.reload();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Switch Business
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Only show if not super admin or business is selected */}
      {(!isSuperAdmin || selectedBusinessId) && (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Statistics Dashboard */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="stat-label">Total Products</p>
                <p className="stat-value">{totalProducts}</p>
                <p className="text-sm text-slate-500 mt-1">{formatNumber(totalStock)} units in stock</p>
              </div>
              <div className="p-3 bg-teal-50 text-teal-700 rounded-xl shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="stat-label">Inventories</p>
                <p className="stat-value">{totalInventories}</p>
                <p className="text-sm text-slate-500 mt-1">Active inventory sections</p>
              </div>
              <div className="p-3 bg-sky-50 text-sky-700 rounded-xl shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="stat-label">
                    {revenueViewMode === 'yearly' ? `${new Date().getFullYear()} Revenue` : 'Total Revenue'}
                  </p>
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setRevenueViewMode('overall')}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        revenueViewMode === 'overall'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Overall Revenue"
                    >
                      Overall
                    </button>
                    <button
                      onClick={() => setRevenueViewMode('yearly')}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        revenueViewMode === 'yearly'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title={`${new Date().getFullYear()} Revenue`}
                    >
                      Yearly
                    </button>
                  </div>
                </div>
                <p className="stat-value break-words min-w-0">{formatCurrency(totalRevenue, globalCurrency)}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {revenueViewMode === 'yearly'
                    ? `${moneySales.length} transactions this year`
                    : `${moneySales.length} transactions`}
                  {otherCurrencyCount > 0 ? ` · ${otherCurrencyCount} in another currency not included` : ''}
                </p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-700 rounded-xl shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {canSeeFinancialData() && (
            <div className="stat-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="stat-label">Total Profit</p>
                  <p className={`stat-value flex items-center gap-1 flex-wrap ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {totalProfit >= 0 ? (
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                    )}
                    <span className="break-words min-w-0">{formatCurrency(totalProfit, globalCurrency)}</span>
                  </p>
                  <p className={`text-sm mt-1 flex items-center gap-1 ${totalRevenue > 0 && profitMargin >= 0 ? 'text-emerald-600' : totalRevenue > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                    {totalRevenue > 0 ? (
                      <>
                        {profitMargin >= 0 ? (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          </svg>
                        )}
                        {profitMargin.toFixed(1)}% margin
                      </>
                    ) : (
                      'No sales yet'
                    )}
                  </p>
                </div>
                <div className={`p-3 rounded-xl shrink-0 ${totalProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {totalProfit >= 0 ? (
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {viewMode === 'products' && (
          <>
            {/* Inventory Alerts */}
            {inventoryAlerts.length > 0 && (
              <AlertsPanel alerts={inventoryAlerts} onDismiss={handleDismissAlert} />
            )}

            <div className="mb-6">
              {showProductForm ? (
                <ProductForm
                  product={editingProduct}
                  inventories={goodsInventories}
                  onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct}
                  onCancel={handleCancel}
                  onSuccess={() => {
                    setShowProductForm(false);
                    setEditingProduct(null);
                  }}
                />
              ) : showBulkProductForm ? (
                <BulkProductForm
                  inventories={goodsInventories}
                  onSubmit={handleBulkAddProducts}
                  onCancel={handleCancel}
                  onSuccess={() => {
                    setShowBulkProductForm(false);
                  }}
                />
              ) : showGoodsInventoryForm ? (
                <GoodsInventoryForm
                  inventory={editingInventory}
                  onSubmit={editingInventory ? handleUpdateGoodsInventory : handleCreateGoodsInventory}
                  onCancel={handleCancel}
                />
              ) : showBulkInventoryForm ? (
                <BulkInventoryForm
                  onSubmit={handleBulkCreateInventories}
                  onCancel={handleCancel}
                  onSuccess={() => {
                    setShowBulkInventoryForm(false);
                  }}
                />
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setShowProductForm(true);
                    }}
                    className="btn-primary"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Product
                  </button>
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setShowBulkProductForm(true);
                    }}
                    className="btn-secondary"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    Bulk Add
                  </button>
                  <button
                    onClick={() => {
                      if (isBusinessAdmin) {
                        setPendingAction(() => () => {
                          setEditingInventory(null);
                          setShowGoodsInventoryForm(true);
                        });
                        setShowPINVerification(true);
                      } else {
                        setEditingInventory(null);
                        setShowGoodsInventoryForm(true);
                      }
                    }}
                    className="btn-success"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    New Inventory
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkInventoryForm(true);
                    }}
                    className="btn-secondary"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    Bulk Inventories
                  </button>
                  {products.length > 0 && (
                    <button
                      onClick={() => {
                        setShowSalesForm(true);
                      }}
                      className="btn-success"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Record Sale
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Display Goods Inventories - Each inventory has its own section with products inside */}
            {goodsInventories.length > 0 ? (
              <div className="mb-8 space-y-6">
                {goodsInventories
                  .filter(inventory => {
                    // If no search query, show all inventories
                    if (!globalSearchQuery.trim()) return true;
                    // Show inventory if name matches or if any good matches
                    const query = globalSearchQuery.toLowerCase();
                    return inventory.name.toLowerCase().includes(query) ||
                      inventory.goods.some(good => good.name.toLowerCase().includes(query));
                  })
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((inventory) => (
                    <GoodsInventorySection
                      key={inventory.id}
                      inventory={inventory}
                      onUpdate={handleUpdateInventory}
                      onDelete={handleDeleteInventory}
                      onEditInventory={(inv) => {
                        setEditingInventory(inv);
                        setShowGoodsInventoryForm(true);
                      }}
                      globalCurrency={globalCurrency}
                      searchQuery={globalSearchQuery}
                      sales={sales.filter(s => s.goodId && s.inventoryId === inventory.id)}
                      onRecordSale={async (inventoryId, goodId, quantity, sellingPrice, purchasePrice, _profit) => {
                        // Create sale record
                        const inventory = goodsInventories.find(inv => inv.id === inventoryId);
                        const good = inventory?.goods.find(g => g.id === goodId);
                        if (inventory && good) {
                          const newSale: Omit<Sale, 'id' | 'date'> = {
                            productId: goodId,
                            productName: `${good.name} (${inventory.name})`,
                            inventoryId,
                            goodId,
                            quantity,
                            sellingPrice,
                            purchasePrice,
                            profit: roundMoney((sellingPrice - purchasePrice) * quantity),
                            currency: good.currency || globalCurrency,
                            refunded: false,
                            refundedQuantity: 0,
                            batchDetails: [],
                          };
                          
                          try {
                            // Save sale to database
                            await dataService.createSale(newSale);
                            
                            // Reload data from database
                            const updatedSales = await dataService.getSales();
                            const updatedInventories = await dataService.getInventories();
                            setSales(updatedSales);
                            setGoodsInventories(updatedInventories);
                            
                            setSuccessMessage(`Sale recorded. ${quantity} units of ${good.name} sold for ${formatCurrency(quantity * sellingPrice, good.currency || globalCurrency)}.`);
                          } catch (error) {
                            console.error('Error recording goods inventory sale:', error);
                            const errorMessage = error instanceof Error ? error.message : 'Failed to record sale';
                            alert(`Error: ${errorMessage}\n\nPlease ensure the server is running and the database is accessible.`);
                          }
                        }
                      }}
                    />
                  ))}
              </div>
            ) : (
              <div className="card p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Inventories Yet</h3>
                <p className="text-slate-500 mb-6">Create your first inventory to start organizing your products. Each inventory will have its own section where you can add and manage products.</p>
                <button
                  onClick={() => {
                    if (isBusinessAdmin) {
                      setPendingAction(() => () => {
                        setEditingInventory(null);
                        setShowGoodsInventoryForm(true);
                      });
                      setShowPINVerification(true);
                    } else {
                      setEditingInventory(null);
                      setShowGoodsInventoryForm(true);
                    }
                  }}
                  className="btn-primary"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Your First Inventory
                </button>
              </div>
            )}


            {showSalesForm && (
              <div className="mb-6">
                <SalesForm
                  products={products.filter(p => p.quantity > 0)}
                  currency={globalCurrency}
                  onSubmit={handleRecordSale}
                  onCancel={handleCancel}
                />
              </div>
            )}

            {showAddStockForm && (
              <div className="mb-6">
                <AddStockForm
                  products={products}
                  currency={globalCurrency}
                  onSubmit={handleAddStock}
                  onCancel={handleCancel}
                />
              </div>
            )}

            {/* Stock History Modal */}
            {viewingStockHistory && (
              <StockHistoryView
                product={viewingStockHistory}
                onClose={() => setViewingStockHistory(null)}
                globalCurrency={globalCurrency}
              />
            )}

            {/* Category Manager */}
            <CategoryManager
              products={products}
              onCategoryChange={async (productId, category) => {
                const product = products.find(p => p.id === productId);
                if (product) {
                  // Update product category - would need API endpoint for this
                  // For now, just update local state
                  setProducts(products.map(p => 
                    p.id === productId ? { ...p, category } : p
                  ));
                }
              }}
              onTagChange={async (productId, tags) => {
                const product = products.find(p => p.id === productId);
                if (product) {
                  // Update product tags - would need API endpoint for this
                  setProducts(products.map(p => 
                    p.id === productId ? { ...p, tags } : p
                  ));
                }
              }}
            />

            {/* Inventory Optimization */}
            <InventoryOptimization
              products={products}
              onUpdateProduct={async (productId, updates) => {
                // Update product - would need API endpoint
                setProducts(products.map(p => 
                  p.id === productId ? { ...p, ...updates } : p
                ));
              }}
              globalCurrency={globalCurrency}
            />

            {/* QR Code Generator */}
            <QRCodeGenerator products={products} />
          </>
        )}

        {viewMode === 'sales' && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Sales & Analytics</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCustomers(!showCustomers)}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {showCustomers ? 'Hide' : 'Show'} Customers
                </button>
              </div>
            </div>
            
            {showCustomers && (
              <div className="mb-6">
                <CustomerManagement
                  customers={customers}
                  onAdd={(customer) => {
                    const newCustomer = {
                      ...customer,
                      id: `customer-${Date.now()}`,
                      totalPurchases: 0,
                      totalSpent: 0,
                      createdAt: new Date().toISOString(),
                    };
                    setCustomers([...customers, newCustomer]);
                  }}
                  onEdit={(id, updates) => {
                    setCustomers(customers.map(c => c.id === id ? { ...c, ...updates } : c));
                  }}
                  onDelete={(id) => {
                    setCustomers(customers.filter(c => c.id !== id));
                  }}
                  globalCurrency={globalCurrency}
                />
              </div>
            )}

            <AdvancedFilters
              type="sales"
              onFilterChange={setSalesFilters}
              sales={sales}
            />

            <RevenueCharts sales={getFilteredSales} globalCurrency={globalCurrency} revenueViewMode={revenueViewMode} />
            
            <AdvancedAnalytics sales={getFilteredSales} products={products} globalCurrency={globalCurrency} />
            
            <FinancialManager sales={getFilteredSales} products={products} globalCurrency={globalCurrency} />
            
            {/* Backup Manager - Super Admin Only */}
            {isSuperAdmin && <BackupManager />}
            
            <SalesAnalytics sales={getFilteredSales} globalCurrency={globalCurrency} revenueViewMode={revenueViewMode} />
            <SalesHistory 
            sales={getFilteredSales}
            globalCurrency={globalCurrency}
            onUpdateSale={async (updatedSale) => {
              try {
                await dataService.updateSale(updatedSale.id, updatedSale);
                
                // Reload sales from database
                const updatedSales = await dataService.getSales();
                setSales(updatedSales);
              } catch (error) {
                console.error('Error updating sale:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to update sale';
                alert(`Error: ${errorMessage}\n\nPlease ensure the server is running and the database is accessible.`);
              }
            }}
            onRefundSale={async (sale, refundQuantity) => {
              try {
                console.log('🔄 Processing refund:', { 
                  saleId: sale.id, 
                  refundQuantity,
                  goodId: sale.goodId,
                  productId: sale.productId
                });
                
                // Process refund through API (this will update the database and restore stock)
                const refundResult = await dataService.refundSale(sale.id, refundQuantity);
                console.log('✅ Refund API call completed:', refundResult);
                
                // Verify stock was restored from API response
                if (refundResult?.stockRestored && refundResult?.updatedStock) {
                  console.log('📦 Stock restoration confirmed:', refundResult.updatedStock);
                } else {
                  console.warn('⚠️ Stock restoration status unknown from API response');
                }
                
                // Wait a bit longer to ensure database transaction is fully committed
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Reload all data from database to get updated state
                console.log('📥 Reloading data after refund...');
                const [updatedSales, updatedProducts, updatedInventories] = await Promise.all([
                  dataService.getSales(),
                  dataService.getProducts(),
                  dataService.getInventories()
                ]);
                
                console.log('✅ Data reloaded:', {
                  sales: updatedSales.length,
                  products: updatedProducts.length,
                  inventories: updatedInventories.length
                });
                
                // Find and verify the updated good/product
                if (sale.goodId) {
                  const inventory = updatedInventories.find(inv => 
                    inv.goods.some(g => g.id === sale.goodId)
                  );
                  if (inventory) {
                    const good = inventory.goods.find(g => g.id === sale.goodId);
                    if (good) {
                      console.log('📦 Good after refund:', {
                        name: good.name,
                        totalQuantity: good.quantity,
                        remainingQuantity: good.remainingQuantity,
                        expectedRemaining: good.quantity - (updatedSales
                          .filter(s => s.goodId === sale.goodId)
                          .reduce((sum, s) => sum + (s.quantity - (s.refundedQuantity || 0)), 0))
                      });
                    } else {
                      console.warn('⚠️ Good not found in updated inventories:', sale.goodId);
                    }
                  } else {
                    console.warn('⚠️ Inventory not found for good:', sale.goodId);
                  }
                } else if (sale.productId) {
                  const product = updatedProducts.find(p => p.id === sale.productId);
                  if (product) {
                    console.log('📦 Product after refund:', {
                      name: product.name,
                      quantity: product.quantity
                    });
                  } else {
                    console.warn('⚠️ Product not found in updated products:', sale.productId);
                  }
                }
                
                // Update state - use functional updates to ensure we get the latest state
                setSales(() => updatedSales);
                setProducts(() => updatedProducts);
                setGoodsInventories(() => updatedInventories);
                
                // Force a small delay to ensure React has processed the state updates
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Show success message with details
                const currentRefunded = sale.refundedQuantity || 0;
                const newRefundedQuantity = currentRefunded + refundQuantity;
                const isFullyRefunded = newRefundedQuantity >= sale.quantity;
                const status = isFullyRefunded ? 'fully refunded' : 'partially refunded';
                
                let successMsg = `Sale ${status} successfully! ${refundQuantity} units of ${sale.productName} have been restored to inventory.`;
                if (refundResult?.updatedStock) {
                  const stock = refundResult.updatedStock;
                  if (stock.type === 'good') {
                    successMsg += ` Stock updated: ${stock.oldRemaining} → ${stock.newRemaining} units.`;
                  } else if (stock.type === 'product') {
                    successMsg += ` Stock updated: ${stock.oldQuantity || 'N/A'} → ${stock.newQuantity} units.`;
                  }
                }
                
                setSuccessMessage(successMsg);
                
                console.log('✅ Refund process completed successfully');
                console.log('📊 Final state after refund:', {
                  salesCount: updatedSales.length,
                  inventoriesCount: updatedInventories.length,
                  productsCount: updatedProducts.length
                });
              } catch (error) {
                console.error('❌ Error processing refund:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to process refund';
                alert(`Error: ${errorMessage}\n\nPlease ensure the server is running and the database is accessible.`);
              }
            }}
          />
          </>
        )}

        <SettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          currentCurrency={globalCurrency}
          onCurrencyChange={setGlobalCurrency}
          onSave={(settings) => {
            setUserSettings(settings);
            setGlobalCurrency(settings.currency);
          }}
        />

        {showUserManagement && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowUserManagement(false);
              }
            }}
          >
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-slate-900">User Management</h2>
                <button
                  onClick={() => setShowUserManagement(false)}
                  className="btn-icon"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <UserManagement />
              </div>
            </div>
          </div>
        )}

        {/* Mobile Install Prompt */}
        <MobileInstallPrompt />

        {/* PIN Verification Modal */}
        <PINVerification
          isOpen={showPINVerification}
          onClose={() => {
            setShowPINVerification(false);
            setPendingAction(null);
            setPinError('');
          }}
          onVerify={async (pin) => {
            try {
              const token = localStorage.getItem('auth_token');
              const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : '/api');
              const API_BASE_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
              
              const response = await fetch(`${API_BASE_URL}/auth/verify-pin`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ pin }),
              });

              if (response.ok) {
                setShowPINVerification(false);
                setPinError('');
                if (pendingAction) {
                  pendingAction();
                  setPendingAction(null);
                }
              } else {
                const error = await response.json().catch(() => ({ error: 'Invalid PIN' }));
                setPinError(error.error || 'Invalid PIN');
              }
            } catch (error) {
              console.error('PIN verification error:', error);
              if (error instanceof TypeError && error.message.includes('fetch')) {
                setPinError('Network error: Cannot connect to server. Please check your connection.');
              } else {
                setPinError('Failed to verify PIN. Please try again.');
              }
            }
          }}
          title="Enter PIN to Continue"
          message="Please enter your PIN to create a new inventory"
          error={pinError}
        />
      </div>
      )}
    </div>
  );
}

export default App;

