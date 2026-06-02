import api from "./api";

export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  recentOrders: {
    id: number;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }[];
  topProducts: {
    productName: string;
    sales: number;
    total: number;
    unitPrice: number;
  }[];
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const res = await api.get("/orders/stats");
  return res.data;
};
