import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  TrendingUp,
  ShoppingBag,
  Users,
  Package,
  PlusCircle,
  Store,
} from "lucide-react";
import { Badge } from "../components/uI/Badge";
import { getDashboardStats } from "../services/dashboardService";
import type { DashboardStats } from "../services/dashboardService";
import { useAuth } from "../hooks/useAuth";

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
  const { user } = useAuth();
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
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-100 border-t-indigo-600"></div>
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
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      path: "/vendas/nova",
    },
    {
      title: "Total de Pedidos",
      value: String(data.totalOrders),
      icon: ShoppingBag,
      color: "text-indigo-700",
      bg: "bg-indigo-50",
      path: "/pedidos",
    },
    {
      title: "Clientes",
      value: String(data.totalCustomers),
      icon: Users,
      color: "text-fuchsia-700",
      bg: "bg-fuchsia-50",
      path: "/clientes",
    },
    {
      title: "Produtos",
      value: String(data.totalProducts),
      icon: Package,
      color: "text-amber-700",
      bg: "bg-amber-50",
      path: "/produtos",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">Visão geral</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#29113d] sm:text-3xl">
            Olá, {user?.name?.split(" ")[0] || "bem-vindo"}!
          </h1>
          <p className="mt-1 text-sm text-slate-500">Acompanhe o desempenho e a rotina da sua loja.</p>
        </div>
        <button
          onClick={() => navigate("/vendas/nova")}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8b28cc] to-[#7022ad] px-4 text-sm font-bold text-white shadow-[0_6px_18px_rgba(118,40,189,0.2)] transition hover:-translate-y-0.5 hover:shadow-lg sm:w-auto"
        >
          <PlusCircle size={18} />
          Nova Venda
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {statsCards.map((stat, index) => (
          <button
            key={index}
            onClick={() => navigate(stat.path)}
            className="group rounded-2xl border border-purple-100 bg-white p-4 text-left shadow-[0_2px_12px_rgba(47,20,68,0.035)] transition-all hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-[0_10px_28px_rgba(47,20,68,0.08)] sm:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold leading-4 text-slate-500 sm:text-sm">{stat.title}</p>
                <p className="mt-2 break-words text-lg font-extrabold tracking-tight text-[#29113d] sm:text-2xl">{stat.value}</p>
              </div>
              <div className={`rounded-xl p-2.5 transition-transform group-hover:scale-105 sm:p-3 ${stat.bg}`}>
                <stat.icon size={19} className={stat.color} />
              </div>
            </div>
            <p className="mt-3 hidden text-[11px] font-semibold text-indigo-700 sm:block">Ver detalhes <ArrowUpRight className="ml-1 inline" size={13} /></p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-[0_2px_12px_rgba(47,20,68,0.035)] lg:col-span-2">
          <div className="flex items-center justify-between border-b border-purple-50 px-4 py-4 sm:px-5">
            <div>
              <h3 className="font-bold text-[#29113d]">Pedidos recentes</h3>
              <p className="mt-0.5 text-xs text-slate-400">Acompanhe as últimas movimentações</p>
            </div>
            <button
              onClick={() => navigate("/pedidos")}
              className="rounded-lg px-2 py-1 text-xs font-bold text-indigo-700 transition hover:bg-purple-50"
            >
              Ver todos
            </button>
          </div>
          {data.recentOrders.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <ShoppingBag className="mx-auto mb-3 text-purple-200" size={34} />
              <p className="text-sm font-semibold text-slate-600">Nenhum pedido ainda</p>
              <p className="mt-1 text-xs text-slate-400">Os pedidos recentes aparecerão aqui.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-[#faf8fc]">
                  <tr>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">#</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Cliente</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Valor</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Data</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50">
                  {data.recentOrders.map((order) => (
                    <tr key={order.id} className="transition hover:bg-purple-50/50">
                      <td className="px-5 py-3.5 text-sm font-bold text-[#542080]">#{order.id}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{order.customerName}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-[#29113d]">{formatCurrency(order.total)}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">{formatDate(order.createdAt)}</td>
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

        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-[0_2px_12px_rgba(47,20,68,0.035)]">
          <div className="mb-4">
            <h3 className="font-bold text-[#29113d]">Produtos mais vendidos</h3>
            <p className="mt-0.5 text-xs text-slate-400">Destaques do seu catálogo</p>
          </div>
          {data.topProducts.length === 0 ? (
            <div className="py-8 text-center">
              <Package className="mx-auto mb-3 text-purple-200" size={32} />
              <p className="text-sm text-slate-500">Nenhuma venda ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.topProducts.map((product, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50">
                    <Package size={18} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-[#321647]">{product.productName}</p>
                    <p className="text-xs text-gray-400">{product.sales} vendas</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{formatCurrency(product.unitPrice)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#35134c] via-[#542080] to-[#8128bd] p-5 text-white shadow-[0_12px_30px_rgba(84,32,128,0.18)] sm:p-7">
        <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full border-[28px] border-white/[0.06]" />
        <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-purple-200">Sua vitrine digital</p>
            <h3 className="mb-2 text-xl font-extrabold sm:text-2xl">Sua loja online, pronta para compartilhar</h3>
            <p className="mb-5 max-w-xl text-sm leading-6 text-purple-100/80">Mostre seus produtos e receba pedidos diretamente pelo WhatsApp.</p>
            <a href="/loja-online" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#542080] transition hover:-translate-y-0.5 hover:bg-purple-50">
              <Store size={17} /> Abrir loja online <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 sm:flex">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <Store size={28} className="text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
