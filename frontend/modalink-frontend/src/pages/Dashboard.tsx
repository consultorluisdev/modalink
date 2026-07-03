import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Package,
  PlusCircle,
} from "lucide-react";
import { Badge } from "../components/uI/Badge";
import { getDashboardStats } from "../services/dashboardService";
import type { DashboardStats } from "../services/dashboardService";

const defaultStats: DashboardStats = {
  totalSales: 0,
  totalOrders: 0,
  totalCustomers: 0,
  totalProducts: 0,
  recentOrders: [],
  topProducts: [],
};

export function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStats() {
    try {
      setError("");
      const stats = await getDashboardStats();
      setData(stats);
    } catch {
      setError("Não foi possível conectar ao servidor");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("pt-BR");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: "Vendas (mês)",
      value: formatCurrency(data.totalSales),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
      path: "/vendas/nova",
    },
    {
      title: "Total de Pedidos",
      value: String(data.totalOrders),
      icon: ShoppingBag,
      color: "text-blue-600",
      bg: "bg-blue-50",
      path: "/pedidos",
    },
    {
      title: "Clientes",
      value: String(data.totalCustomers),
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
      path: "/clientes",
    },
    {
      title: "Produtos",
      value: String(data.totalProducts),
      icon: Package,
      color: "text-orange-600",
      bg: "bg-orange-50",
      path: "/produtos",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Aqui está o resumo da sua loja</p>
        </div>
        <button
          onClick={() => navigate("/vendas/nova")}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          <PlusCircle size={18} />
          Nova Venda
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statsCards.map((stat, index) => (
          <button
            key={index}
            onClick={() => navigate(stat.path)}
            className="text-left bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Pedidos recentes</h3>
            <button
              onClick={() => navigate("/pedidos")}
              className="text-xs text-indigo-600 hover:text-indigo-700"
            >
              Ver todos
            </button>
          </div>
          {data.recentOrders.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              Nenhum pedido ainda
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">#</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Cliente</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Valor</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Data</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-medium text-gray-800">#{order.id}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{order.customerName}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-800">{formatCurrency(order.total)}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{formatDate(order.createdAt)}</td>
                      <td className="px-5 py-3">
                        <Badge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Produtos mais vendidos</h3>
          {data.topProducts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Nenhuma venda ainda</p>
          ) : (
            <div className="space-y-4">
              {data.topProducts.map((product, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{product.productName}</p>
                    <p className="text-xs text-gray-400">{product.sales} vendas</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{formatCurrency(product.unitPrice)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-5 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-xl mb-2">Compartilhe sua loja</h3>
            <p className="text-indigo-100 text-sm mb-4">Compartilhe sua loja de forma fácil escaneando o QR Code</p>
            <button className="px-4 py-2 bg-white text-indigo-600 rounded-lg text-sm font-medium hover:bg-gray-100">
              Compartilhar
            </button>
          </div>
          <div className="bg-white p-3 rounded-xl">
            <div className="w-24 h-24 bg-gray-800 rounded flex items-center justify-center">
              <span className="text-white text-xs text-center">QR Code<br />da loja</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
