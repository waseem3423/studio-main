

export type Product = {
  id: string;
  name: string;
  sku: string;
  piecesPerBox: number;
  stock: number;
  costPrice: number;
  salePrice: number;
  expiryDate?: string;
};

export type SaleProduct = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type Sale = {
    id: string;
    date: { seconds: number; nanoseconds: number; } | Date | string;
    salesmanId: string;
    salesmanName?: string; 
    customer: string; // This will now hold customerId
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    products: SaleProduct[];
    discount?: number;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    createdAt: { seconds: number; nanoseconds: number; } | string | Date;
};

export type Expense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  createdAt: { seconds: number; nanoseconds: number; } | string | Date;
};

export type Customer = {
    id: string;
    name: string;
    phone: string;
    address: string;
    salesmanId: string;
    totalDue: number;
    createdAt: { seconds: number; nanoseconds: number; } | string | Date;
};

export type Payment = {
    id: string;
    saleId: string;
    customerId: string;
    salesmanId: string;
    amount: number;
    date: { seconds: number; nanoseconds: number; } | string | Date;
    createdAt: { seconds: number; nanoseconds: number; } | string | Date;
};


export const products: Product[] = [];

export const salesmen: string[] = [];

export const recentSales: {
  id: string;
  name: string;
  email: string;
  amount: number;
  avatar: string;
}[] = [];

export const salesData: { month: string; sales: number }[] = [];

export const roles = ["admin", "manager", "cashier", "salesman", "worker"] as const;
export type Role = (typeof roles)[number];

export type User = {
  id: string;
  name: string;
  role: Role;
  email: string;
};

export type SalesmanPlan = {
  location: string;
  itemsToCarry?: string;
  updatedAt?: { seconds: number; nanoseconds: number; } | Date;
  assignedBy?: string;
  assignedByName?: string;
};

export type WorkerTask = {
    task: string;
    progress?: string;
    assignedAt?: { seconds: number; nanoseconds: number; } | Date;
    updatedAt?: { seconds: number; nanoseconds: number; } | Date;
};


    