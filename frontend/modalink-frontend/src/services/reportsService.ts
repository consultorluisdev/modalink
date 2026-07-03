import api from "./api";

export interface RelatorioData {
  totalVendido: number;
  vendasPorPeriodo: { mes: string; valor: number }[];
  produtosMaisVendidos: { nome: string; quantidade: number; valor: number }[];
}

export const reportsService = {
  async getSales(period: string): Promise<RelatorioData> {
    const res = await api.get(`/reports/sales?period=${period}`);
    return res.data;
  },
};
