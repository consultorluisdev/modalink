import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, AlertTriangle, CalendarCheck, CheckCircle, RotateCcw } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { financeiroService } from "../../services/financeiroService";
import type { ReceivableData } from "../../services/financeiroService";

export default function Financeiro() {
  useAuth();
  const [data, setData] = useState<ReceivableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingId, setPayingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const result = await financeiroService.getReceivable();
      setData(result);
    } catch {
      setError("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  }

  async function handlePay(id: number) {
    setPayingId(id);
    try {
      await financeiroService.payInstallment(id);
      await loadData();
    } catch {
      setError("Erro ao baixar parcela");
    } finally {
      setPayingId(null);
    }
  }

  async function handleUnpay(id: number) {
    setPayingId(id);
    try {
      await financeiroService.unpayInstallment(id);
      await loadData();
    } catch {
      setError("Erro ao reabrir parcela");
    } finally {
      setPayingId(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const summaryCards = data ? [
    { label: "Total a Receber", value: data.totalReceivable, color: "text-indigo-600", bg: "bg-indigo-50", icon: DollarSign },
    { label: "Recebido no Mês", value: data.totalPaidThisMonth, color: "text-green-600", bg: "bg-green-50", icon: TrendingUp },
    { label: "A Vencer", value: data.dueSoon, color: "text-blue-600", bg: "bg-blue-50", icon: CalendarCheck },
    { label: "Vencidos", value: data.overdue, color: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Financeiro</h1>
        <p className="text-gray-500 text-sm mt-1">Controle de contas a receber</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className={`${card.bg} rounded-xl p-5`}>
            <div className="flex items-center justify-between mb-2">
              <card.icon size={20} className={card.color} />
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>
              {card.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Parcelas</h2>
          <span className="text-xs text-gray-400">{data?.items.length ?? 0} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Cliente</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Parcela</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Vencimento</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Valor</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data && data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    <DollarSign size={40} className="mx-auto mb-2 text-gray-300" />
                    Nenhuma parcela encontrada
                  </td>
                </tr>
              ) : (
                data?.items.map((item) => {
                  const overdue = !item.isPaid && new Date(item.dueDate) < new Date();
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 transition ${item.isPaid ? "bg-green-50/30" : overdue ? "bg-red-50/30" : ""}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 text-xs font-bold">{item.customerName.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{item.customerName}</p>
                            <p className="text-xs text-gray-400">Pedido #{item.orderId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-800">{item.installmentNumber}ª</td>
                      <td className="px-5 py-3">
                        <span className={`text-sm ${overdue ? "text-red-600 font-medium" : "text-gray-600"}`}>
                          {formatDate(item.dueDate)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-medium text-gray-800">
                        {item.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {item.isPaid ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                            <CheckCircle size={12} />
                            Recebido
                          </span>
                        ) : overdue ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-1 rounded-full">
                            <AlertTriangle size={12} />
                            Vencida
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                            <CalendarCheck size={12} />
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {item.isPaid ? (
                          <button
                            onClick={() => handleUnpay(item.id)}
                            disabled={payingId === item.id}
                            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition"
                          >
                            <RotateCcw size={12} />
                            Reabrir
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePay(item.id)}
                            disabled={payingId === item.id}
                            className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-white bg-green-50 hover:bg-green-600 border border-green-300 hover:border-green-600 px-2 py-1 rounded transition"
                          >
                            {payingId === item.id ? "..." : <><CheckCircle size={12} /> Baixar</>}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
