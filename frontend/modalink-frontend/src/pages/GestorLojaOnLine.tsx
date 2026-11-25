import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import api from "../services/api";

export default function GestorLojaOnLine() {
  const navigate = useNavigate();
  const [storeData, setStoreData] = useState<StoreData>({
    storeName: "",
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Funções de mensagem (iguais às do Settings)
  const showSuccess = useCallback((msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 3000);
  }, []);

  // Buscar dados da loja ao carregar
  const fetchStoreData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/store-settings");
      setStoreData(res.data);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ message?: string }>;
      showError(axiosError.response?.data?.message ?? "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void fetchStoreData();
  }, [fetchStoreData]);

  // Salvar dados da loja
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.put("/store-settings", storeData);
      showSuccess("Dados da loja atualizados com sucesso!");
      fetchStoreData(); // Atualizar dados após salvar
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ message?: string }>;
      showError(axiosError.response?.data?.message ?? "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  // Simular PDV opening
  const openPDV = () => {
    navigate("/vendas/nova");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">Sua vitrine</p>
        <h1 className="text-2xl font-bold">Gestor da loja online</h1>
        <p className="mt-1 text-sm text-slate-500">Configure as informações exibidas para seus clientes.</p>
      </div>

      {/* Status da loja */}
      <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 font-semibold">Informações da loja</h2>
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <p className="text-slate-500"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Nome</span><span className="font-medium text-slate-800">{storeData.storeName || "Não configurado"}</span></p>
          <p className="text-slate-500"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Telefone</span><span className="font-medium text-slate-800">{storeData.phone || "Não configurado"}</span></p>
          <p className="text-slate-500"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Endereço</span><span className="font-medium text-slate-800">{storeData.address || "Não configurado"}</span></p>
        </div>
      </div>

      {/* Mensagens de sucesso/erro */}
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{success}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {/* Formulário de configurações */}
      <form onSubmit={handleSave} className="max-w-3xl space-y-5 rounded-2xl border border-purple-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Loja
            </label>
            <input
              type="text"
              placeholder="Ex: Minha Loja de Roupas"
              value={storeData.storeName}
              onChange={(e) =>
                setStoreData({ ...storeData, storeName: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone
            </label>
            <input
              type="tel"
              placeholder="(11) 98888-7777"
              value={storeData.phone}
              onChange={(e) =>
                setStoreData({ ...storeData, phone: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endereço
            </label>
            <input
              type="text"
              placeholder="Rua, número, cidade - Estado"
              value={storeData.address}
              onChange={(e) =>
                setStoreData({ ...storeData, address: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          disabled={loading}
        >
          {loading ? "Salvando..." : "Salvar Configurações"}
        </button>
      </form>

      {/* Ações rápidas */}
      <div className="border-t border-purple-100 pt-5">
        <h2 className="mb-4 font-semibold">Atalhos rápidos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            onClick={openPDV}
            className="flex min-h-11 items-center justify-center rounded-xl border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-800 transition-colors hover:bg-purple-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 002-2H6a2 2 0 002-2v6a2 2 0 002 2zm10-11l2.286 6.857L20.571 5H15m2.286 9l-2.286 6.857L5.286 19h6m6.374-6h.008v.008H12v-.008h.008z" />
            </svg>
            PDV
          </button>
          <button
            onClick={() => navigate("/configuracoes")}
            className="flex min-h-11 items-center justify-center rounded-xl border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-800 transition-colors hover:bg-purple-50"
          >
            Configurações
          </button>
          <button type="button" onClick={() => navigate("/pedidos")} className="flex min-h-11 items-center justify-center rounded-xl border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-800 transition-colors hover:bg-purple-50">
            Ver Pedidos
          </button>
          <button type="button" onClick={() => navigate("/catalogo")} className="flex min-h-11 items-center justify-center rounded-xl border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-800 transition-colors hover:bg-purple-50">
            Catálogo
          </button>
        </div>
      </div>
    </div>
  );
}

interface StoreData {
  storeName: string;
  phone: string;
  address: string;
}
