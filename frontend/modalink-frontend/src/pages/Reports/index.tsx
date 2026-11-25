import React, { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp, RefreshCw, BarChart3 } from "lucide-react";
import { reportsService, type RelatorioData } from "../../services/reportsService";

type Periodo = "week" | "month" | "year" | "quarter";

const Reports: React.FC = () => {
  const [period, setPeriod] = useState<Periodo>("month");
  const [data, setData] = useState<RelatorioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const fetchData = async () => {
      try {
        const result = await reportsService.getSales(period);
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setError("Erro ao buscar dados do relatorio");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [period, refreshKey]);

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setPeriod(e.target.value as Periodo);
  };

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Carregando relatorios...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
            <p className="text-sm text-gray-500">Acompanhe as vendas e o desempenho do seu negócio.</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <BarChart3 size={48} className="mb-4" />
          <p className="text-lg">Nenhum dado disponivel</p>
          <button
            onClick={() => setRefreshKey((key) => key + 1)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 font-semibold text-white hover:bg-indigo-800"
          >
            <RefreshCw size={16} />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
        <p className="text-sm text-gray-500">Acompanhe as vendas e o desempenho do seu negócio.</p>
        </div>
      <div className="flex w-full gap-2 sm:w-auto">
          <select
            value={period}
            onChange={handlePeriodChange}
            className="min-w-0 flex-1 border border-purple-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 sm:flex-none"
          >
            <option value="week">Semana</option>
            <option value="month">Mes</option>
            <option value="quarter">Trimestre</option>
            <option value="year">Este Ano</option>
          </select>
          <button
            onClick={() => setRefreshKey((key) => key + 1)}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 font-semibold text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-[#35134c] via-[#542080] to-[#8128bd] p-6 text-white shadow-[0_12px_30px_rgba(84,32,128,0.16)]">
        <p className="text-sm text-purple-100">Total vendido no período</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
          R$ {data.totalVendido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
        <div className="flex items-center gap-2 mt-2 text-sm">
          <TrendingUp size={16} />
          <span>Total de vendas no período</span>
        </div>
      </div>

      <div className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Vendas por período</h3>
        {data.vendasPorPeriodo.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[250px] text-gray-400">
            <BarChart3 size={32} className="mb-2" />
            <p>Nenhuma venda no periodo</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.vendasPorPeriodo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="valor"
                name="Valor Vendido"
                stroke="#8b28cc"
                strokeWidth={2}
                dot={{ fill: "#7628bd" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Produtos mais vendidos</h3>
        {data.produtosMaisVendidos.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>Nenhum produto vendido neste periodo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {data.produtosMaisVendidos.map((produto, index) => (
                  <tr key={index} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{produto.nome}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">{produto.quantidade}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      R$ {produto.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
