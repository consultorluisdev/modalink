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
  }, [period]);

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setPeriod(e.target.value as Periodo);
  };

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando relatorios...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Relatorios</h1>
            <p className="text-sm text-gray-500">Acompanhe as vendas e desempenho do seu negocio</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <BarChart3 size={48} className="mb-4" />
          <p className="text-lg">Nenhum dado disponivel</p>
          <button
            onClick={() => { setPeriod(p => p); }}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Relatorios</h1>
          <p className="text-sm text-gray-500">Acompanhe as vendas e desempenho do seu negocio</p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={handlePeriodChange}
            className="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Semana</option>
            <option value="month">Mes</option>
            <option value="quarter">Trimestre</option>
            <option value="year">Este Ano</option>
          </select>
          <button
            onClick={() => setPeriod(p => p)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <p className="text-sm opacity-80">Total vendido no periodo</p>
        <p className="text-3xl font-bold">
          R$ {data.totalVendido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
        <div className="flex items-center gap-2 mt-2 text-sm">
          <TrendingUp size={16} />
          <span>Total de vendas no periodo</span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Vendas por Periodo</h3>
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
              <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="valor"
                name="Valor Vendido"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#2563eb" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Produtos Mais Vendidos</h3>
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
