import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export type UserRole = 'bar' | 'food' | 'admin' | null;
export type ServiceType = 'service' | 'togo';
export type PaymentMethod = 'cash' | 'card';

export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  sortOrder: number;
  hasDeposit?: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  type: 'drinks' | 'food';
  printerId?: string;
  sortOrder: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface DepositInfo {
  newDeposits: number;
  returnedDeposits: number;
  depositValue: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  deposit: DepositInfo;
  serviceType: ServiceType;
  paymentMethod: PaymentMethod;
  total: number;
  depositTotal: number;
  grandTotal: number;
  amountPaid?: number;
  change?: number;
  timestamp: Date;
  role: UserRole;
  tableId?: string;
  tableName?: string;
  isPaid: boolean;
}

export interface TableTab {
  tableId: string;
  tableName: string;
  orders: Order[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Printer {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface Table {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

interface AppState {
  // User & Auth
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
  logout: () => void;

  // Categories & Products
  categories: Category[];
  products: Product[];
  setCategories: (categories: Category[]) => void;
  setProducts: (products: Product[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  // Deposit
  deposit: DepositInfo;
  setNewDeposits: (count: number) => void;
  setReturnedDeposits: (count: number) => void;
  setDepositValue: (value: number) => void;
  resetDeposit: () => void;

  // Service Type
  serviceType: ServiceType;
  setServiceType: (type: ServiceType) => void;

  // Orders
  orders: Order[];
  addOrder: (order: Order) => void;
  markOrderPaid: (orderId: string, paymentMethod: PaymentMethod, amountPaid?: number, change?: number) => void;
  clearOrders: () => void;

  // Printers
  printers: Printer[];
  setPrinters: (printers: Printer[]) => void;
  addPrinter: (printer: Printer) => void;
  updatePrinter: (id: string, updates: Partial<Printer>) => void;
  deletePrinter: (id: string) => void;

  // Tables
  tables: Table[];
  setTables: (tables: Table[]) => void;
  addTable: (table: Table) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  deleteTable: (id: string) => void;

  // Current Order State
  selectedTableId: string | null;
  setSelectedTableId: (id: string | null) => void;

  // Table Tabs (open orders)
  tableTabs: TableTab[];
  addToTableTab: (tableId: string, tableName: string, order: Order) => void;
  settleTableTab: (tableId: string, paymentMethod: PaymentMethod, amountPaid?: number) => void;
  getTableTab: (tableId: string) => TableTab | undefined;
  clearTableTab: (tableId: string) => void;

  // Settings
  depositPerGlass: number;
  setDepositPerGlass: (value: number) => void;
}

// Initial demo data
const initialCategories: Category[] = [
  { id: 'cat-1', name: 'Weißwein', color: 'white-wine', type: 'drinks', sortOrder: 1 },
  { id: 'cat-2', name: 'Rotwein', color: 'red-wine', type: 'drinks', sortOrder: 2 },
  { id: 'cat-3', name: 'Saftschorlen', color: 'juice', type: 'drinks', sortOrder: 3 },
  { id: 'cat-4', name: 'Wasser & Softdrinks', color: 'water', type: 'drinks', sortOrder: 4 },
  { id: 'cat-5', name: 'Bier', color: 'beer', type: 'drinks', sortOrder: 5 },
  { id: 'cat-6', name: 'Grill', color: 'grill', type: 'food', sortOrder: 6 },
  { id: 'cat-7', name: 'Beilagen', color: 'sides', type: 'food', sortOrder: 7 },
];

const initialProducts: Product[] = [
  // Weißwein
  { id: 'prod-1', name: 'Riesling 0,25l', price: 5.50, categoryId: 'cat-1', sortOrder: 1 },
  { id: 'prod-2', name: 'Riesling 0,125l', price: 3.00, categoryId: 'cat-1', sortOrder: 2 },
  { id: 'prod-3', name: 'Kleine Weinschorle', price: 3.50, categoryId: 'cat-1', sortOrder: 3 },
  { id: 'prod-4', name: 'Große Weinschorle', price: 5.00, categoryId: 'cat-1', sortOrder: 4 },
  // Rotwein
  { id: 'prod-5', name: 'Spätburgunder 0,25l', price: 6.00, categoryId: 'cat-2', sortOrder: 1 },
  { id: 'prod-6', name: 'Spätburgunder 0,125l', price: 3.50, categoryId: 'cat-2', sortOrder: 2 },
  { id: 'prod-7', name: 'Kleine Weinschorle Rot', price: 4.00, categoryId: 'cat-2', sortOrder: 3 },
  { id: 'prod-8', name: 'Große Weinschorle Rot', price: 5.50, categoryId: 'cat-2', sortOrder: 4 },
  // Saftschorlen
  { id: 'prod-9', name: 'Apfelschorle klein', price: 2.50, categoryId: 'cat-3', sortOrder: 1 },
  { id: 'prod-10', name: 'Apfelschorle groß', price: 3.50, categoryId: 'cat-3', sortOrder: 2 },
  { id: 'prod-11', name: 'Traubensaftschorle klein', price: 2.50, categoryId: 'cat-3', sortOrder: 3 },
  { id: 'prod-12', name: 'Traubensaftschorle groß', price: 3.50, categoryId: 'cat-3', sortOrder: 4 },
  // Wasser & Softdrinks
  { id: 'prod-13', name: 'Mineralwasser 0,25l', price: 2.00, categoryId: 'cat-4', sortOrder: 1 },
  { id: 'prod-14', name: 'Mineralwasser 0,5l', price: 3.00, categoryId: 'cat-4', sortOrder: 2 },
  { id: 'prod-15', name: 'Cola 0,33l', price: 3.00, categoryId: 'cat-4', sortOrder: 3 },
  { id: 'prod-16', name: 'Fanta 0,33l', price: 3.00, categoryId: 'cat-4', sortOrder: 4 },
  // Bier
  { id: 'prod-17', name: 'Pils 0,3l', price: 3.50, categoryId: 'cat-5', sortOrder: 1 },
  { id: 'prod-18', name: 'Pils 0,5l', price: 4.50, categoryId: 'cat-5', sortOrder: 2 },
  { id: 'prod-19', name: 'Radler 0,3l', price: 3.50, categoryId: 'cat-5', sortOrder: 3 },
  { id: 'prod-20', name: 'Radler 0,5l', price: 4.50, categoryId: 'cat-5', sortOrder: 4 },
  // Grill
  { id: 'prod-21', name: 'Bratwurst', price: 4.00, categoryId: 'cat-6', sortOrder: 1 },
  { id: 'prod-22', name: 'Steak', price: 8.00, categoryId: 'cat-6', sortOrder: 2 },
  { id: 'prod-23', name: 'Grillkäse', price: 5.00, categoryId: 'cat-6', sortOrder: 3 },
  // Beilagen
  { id: 'prod-24', name: 'Pommes', price: 3.00, categoryId: 'cat-7', sortOrder: 1 },
  { id: 'prod-25', name: 'Brot', price: 1.50, categoryId: 'cat-7', sortOrder: 2 },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User & Auth
      currentRole: null,
      setRole: (role) => set({ currentRole: role }),
      logout: () => set({ currentRole: null, cart: [], deposit: { newDeposits: 0, returnedDeposits: 0, depositValue: 2 }, serviceType: 'service' }),

      // Categories & Products
      categories: initialCategories,
      products: initialProducts,
      setCategories: (categories) => set({ categories }),
      setProducts: (products) => set({ products }),
      addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
      updateCategory: (id, updates) => set((state) => ({
        categories: state.categories.map((c) => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteCategory: (id) => set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
        products: state.products.filter((p) => p.categoryId !== id)
      })),
      addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
      updateProduct: (id, updates) => set((state) => ({
        products: state.products.map((p) => p.id === id ? { ...p, ...updates } : p)
      })),
      deleteProduct: (id) => set((state) => ({
        products: state.products.filter((p) => p.id !== id)
      })),

      // Cart
      cart: [],
      addToCart: (product) => set((state) => {
        const existing = state.cart.find((item) => item.product.id === product.id);
        const depositIncrement = product.hasDeposit ? 1 : 0;
        if (existing) {
          return {
            cart: state.cart.map((item) =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
            deposit: {
              ...state.deposit,
              newDeposits: state.deposit.newDeposits + depositIncrement,
            },
          };
        }
        return {
          cart: [...state.cart, { product, quantity: 1 }],
          deposit: {
            ...state.deposit,
            newDeposits: state.deposit.newDeposits + depositIncrement,
          },
        };
      }),
      removeFromCart: (productId) => set((state) => ({
        cart: state.cart.filter((item) => item.product.id !== productId)
      })),
      updateCartQuantity: (productId, quantity) => set((state) => {
        if (quantity <= 0) {
          return { cart: state.cart.filter((item) => item.product.id !== productId) };
        }
        return {
          cart: state.cart.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        };
      }),
      clearCart: () => set({ cart: [], deposit: { newDeposits: 0, returnedDeposits: 0, depositValue: get().depositPerGlass } }),

      // Deposit
      deposit: { newDeposits: 0, returnedDeposits: 0, depositValue: 2 },
      setNewDeposits: (count) => set((state) => ({ deposit: { ...state.deposit, newDeposits: count } })),
      setReturnedDeposits: (count) => set((state) => ({ deposit: { ...state.deposit, returnedDeposits: count } })),
      setDepositValue: (value) => set((state) => ({ deposit: { ...state.deposit, depositValue: value } })),
      resetDeposit: () => set((state) => ({ deposit: { newDeposits: 0, returnedDeposits: 0, depositValue: state.depositPerGlass } })),

      // Service Type
      serviceType: 'service',
      setServiceType: (type) => set({ serviceType: type }),

      // Orders
      orders: [],
      addOrder: (order) => set((state) => ({ orders: [order, ...state.orders] })),
      markOrderPaid: (orderId, paymentMethod, amountPaid, change) => set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId
            ? { ...o, isPaid: true, paymentMethod, amountPaid, change }
            : o
        ),
      })),
      clearOrders: () => set({ orders: [] }),

      // Printers
      printers: [],
      setPrinters: (printers) => set({ printers }),
      addPrinter: (printer) => set((state) => ({ printers: [...state.printers, printer] })),
      updatePrinter: (id, updates) => set((state) => ({
        printers: state.printers.map((p) => p.id === id ? { ...p, ...updates } : p)
      })),
      deletePrinter: (id) => set((state) => ({
        printers: state.printers.filter((p) => p.id !== id)
      })),

      // Tables
      tables: [],
      setTables: (tables) => set({ tables }),
      addTable: (table) => set((state) => ({ tables: [...state.tables, table] })),
      updateTable: (id, updates) => set((state) => ({
        tables: state.tables.map((t) => t.id === id ? { ...t, ...updates } : t)
      })),
      deleteTable: (id) => set((state) => ({
        tables: state.tables.filter((t) => t.id !== id)
      })),

      // Current Order State
      selectedTableId: null,
      setSelectedTableId: (id) => set({ selectedTableId: id }),

      // Table Tabs (open orders)
      tableTabs: [],
      addToTableTab: (tableId, tableName, order) => set((state) => {
        const existingTab = state.tableTabs.find((t) => t.tableId === tableId);
        if (existingTab) {
          return {
            tableTabs: state.tableTabs.map((t) =>
              t.tableId === tableId
                ? {
                    ...t,
                    orders: [...t.orders, order],
                    totalAmount: t.totalAmount + order.grandTotal,
                    updatedAt: new Date(),
                  }
                : t
            ),
          };
        }
        return {
          tableTabs: [
            ...state.tableTabs,
            {
              tableId,
              tableName,
              orders: [order],
              totalAmount: order.grandTotal,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        };
      }),
      settleTableTab: (tableId, paymentMethod, amountPaid) => set((state) => {
        const tab = state.tableTabs.find((t) => t.tableId === tableId);
        if (!tab) return state;
        
        const change = amountPaid ? amountPaid - tab.totalAmount : undefined;
        
        // Mark all orders in the tab as paid
        const updatedOrders = state.orders.map((o) => {
          const isInTab = tab.orders.some((tabOrder) => tabOrder.id === o.id);
          return isInTab ? { ...o, isPaid: true, paymentMethod, amountPaid, change } : o;
        });
        
        return {
          orders: updatedOrders,
          tableTabs: state.tableTabs.filter((t) => t.tableId !== tableId),
        };
      }),
      getTableTab: (tableId) => get().tableTabs.find((t) => t.tableId === tableId),
      clearTableTab: (tableId) => set((state) => ({
        tableTabs: state.tableTabs.filter((t) => t.tableId !== tableId),
      })),

      // Settings
      depositPerGlass: 2,
      setDepositPerGlass: (value) => set({ depositPerGlass: value }),
    }),
    {
      name: 'gutshof-weinfest-pos',
      partialize: (state) => ({
        categories: state.categories,
        products: state.products,
        orders: state.orders,
        printers: state.printers,
        tables: state.tables,
        tableTabs: state.tableTabs,
        depositPerGlass: state.depositPerGlass,
      }),
    }
  )
);
