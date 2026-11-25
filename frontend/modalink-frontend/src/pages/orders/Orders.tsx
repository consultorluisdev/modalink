import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, Eye, Package, ShoppingBag, CalendarDays, CreditCard, CircleDollarSign, Plus, RefreshCw } from "lucide-react";
import { orderService } from "../../services/orderServices";
import type { OrderList } from "../../types/order.types";
import { Badge } from "../../components/uI/Badge";
import { OrderDetailModal } from "../../components/uI/OrderDetailModal";

function formatCurrency(value: number): string {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function Orders() {
    const [orders, setOrders] = useState<OrderList[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const closeOrderDetails = useCallback(() => setSelectedOrderId(null), []);
    const handleOrderCancelled = useCallback(() => {
        setSelectedOrderId(null);
        setRefreshKey((key) => key + 1);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const loadOrders = async () => {
            try {
                setLoading(true);
                setError("");
                const data = await orderService.getAll(search);
                if (!cancelled) setOrders(data);
            } catch {
                if (!cancelled) setError("Não foi possível carregar os pedidos. Tente novamente.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void loadOrders();
        return () => { cancelled = true; };
    }, [search, refreshKey]);

    return (
        <div className="space-y-6">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-indigo-700">
                        <ShoppingBag size={22} />
                    </span>
                    <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">Vendas da loja</p>
                        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
                        <p className="mt-1 text-sm text-gray-500">Acompanhe pagamentos e detalhes de cada venda.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setRefreshKey((key) => key + 1)}
                        disabled={loading}
                        aria-label="Atualizar pedidos"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-white px-3 text-sm font-semibold text-indigo-800 transition hover:bg-purple-50 disabled:opacity-50 sm:px-4"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        <span className="hidden sm:inline">Atualizar</span>
                    </button>
                    <Link
                        to="/vendas/nova"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800"
                    >
                        <Plus size={17} />
                        Nova venda
                    </Link>
                </div>
            </header>

            <section className="overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-purple-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-indigo-700">
                            <Package size={19} />
                        </span>
                        <div>
                            <h2 className="font-semibold text-slate-900">Histórico de pedidos</h2>
                            <p className="text-xs text-slate-500">
                                {loading ? "Buscando pedidos..." : `${orders.length} ${orders.length === 1 ? "pedido listado" : "pedidos listados"}`}
                            </p>
                        </div>
                    </div>
                    <label className="relative block w-full sm:max-w-sm">
                        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="search"
                            aria-label="Buscar pedidos"
                            placeholder="Buscar por número ou cliente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full border border-purple-100 bg-slate-50 py-2.5 pl-10 pr-3 text-sm focus:bg-white"
                        />
                    </label>
                </div>

                {error && (
                    <div role="alert" className="m-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:m-5 sm:flex-row sm:items-center sm:justify-between">
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={() => setRefreshKey((key) => key + 1)}
                            className="self-start font-semibold underline underline-offset-2 sm:self-auto"
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="space-y-3 p-4 sm:p-5" aria-label="Carregando pedidos">
                        {[0, 1, 2].map((item) => (
                            <div key={item} className="h-16 animate-pulse rounded-xl bg-purple-50" />
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="px-6 py-12 text-center sm:py-16">
                        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-300">
                            <Package size={27} />
                        </span>
                        <h3 className="font-semibold text-slate-800">
                            {search ? "Nenhum pedido encontrado" : "Ainda não há pedidos"}
                        </h3>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                            {search ? "Experimente buscar por outro nome ou número de pedido." : "As vendas registradas no PDV vão aparecer aqui."}
                        </p>
                        {search ? (
                            <button type="button" onClick={() => setSearch("")} className="mt-4 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                                Limpar busca
                            </button>
                        ) : (
                            <Link to="/vendas/nova" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800">
                                <Plus size={17} />
                                Registrar primeira venda
                            </Link>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="space-y-3 p-3 sm:hidden">
                            {orders.map((order) => (
                                <article key={order.id} className="rounded-xl border border-purple-100 bg-white p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Pedido #{order.id}</p>
                                            <h3 className="mt-1 truncate font-semibold text-slate-900">{order.customerName}</h3>
                                        </div>
                                        <Badge status={order.status} />
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        <div className="min-w-0">
                                            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400"><CircleDollarSign size={13} /> Total</p>
                                            <p className="mt-1 font-bold text-indigo-800">{formatCurrency(order.total)}</p>
                                        </div>
                                        <div>
                                            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400"><CreditCard size={13} /> Pagamento</p>
                                            <p className="mt-1 truncate text-sm font-medium text-slate-700">{order.paymentMethod}</p>
                                        </div>
                                        <div>
                                            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400"><CalendarDays size={13} /> Data</p>
                                            <p className="mt-1 text-sm text-slate-600">{formatDate(order.createdAt)}</p>
                                        </div>
                                        <div>
                                            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400"><Package size={13} /> Itens</p>
                                            <p className="mt-1 text-sm text-slate-600">{order.quantityItems}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedOrderId(order.id)}
                                        className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50 text-sm font-semibold text-indigo-800 transition hover:bg-purple-100"
                                    >
                                        <Eye size={16} />
                                        Ver detalhes
                                    </button>
                                </article>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto sm:block">
                            <table className="w-full min-w-[780px]">
                                <thead className="border-b border-purple-100 bg-purple-50/60">
                                    <tr>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pedido</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pagamento</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Total</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Data</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Itens</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-purple-50">
                                    {orders.map((order) => (
                                        <tr key={order.id} className="transition hover:bg-purple-50/40">
                                            <td className="px-5 py-4 text-sm font-semibold text-indigo-800">#{order.id}</td>
                                            <td className="max-w-48 truncate px-5 py-4 text-sm font-medium text-slate-800">{order.customerName}</td>
                                            <td className="px-5 py-4 text-sm text-slate-600">{order.paymentMethod}</td>
                                            <td className="px-5 py-4 text-right text-sm font-bold text-slate-800">{formatCurrency(order.total)}</td>
                                            <td className="px-5 py-4"><Badge status={order.status} /></td>
                                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">{formatDate(order.createdAt)}</td>
                                            <td className="px-5 py-4 text-right text-sm text-slate-600">{order.quantityItems}</td>
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedOrderId(order.id)}
                                                    aria-label={`Ver detalhes do pedido ${order.id}`}
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-purple-100 hover:text-indigo-700"
                                                >
                                                    <Eye size={17} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>

            {selectedOrderId !== null && (
                <OrderDetailModal
                    orderId={selectedOrderId}
                    onClose={closeOrderDetails}
                    onCancelled={handleOrderCancelled}
                />
            )}
        </div>
    );
}
