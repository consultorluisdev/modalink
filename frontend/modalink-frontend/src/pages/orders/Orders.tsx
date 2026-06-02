import { useState, useEffect } from "react";
import { Search, Eye, Package } from "lucide-react";
import { orderService } from "../../services/orderServices";
import type { OrderList } from "../../types/order.types";
import { Badge } from "../../components/uI/Badge";
import { OrderDetailModal } from "../../components/uI/OrderDetailModal";

export function Orders() {
    const [orders, setOrders] = useState<OrderList[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

    useEffect(() => {
        loadOrders();
    }, [search]);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await orderService.getAll(search);
            setOrders(data);
        } catch (error) {
            console.error('Erro ao carregar pedidos:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Carregando pedidos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Pedidos</h1>
                <p className="text-gray-500 text-sm mt-1">Gerencie todas as vendas da sua loja</p>
            </div>

            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar por número do pedido ou cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {orders.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Package size={48} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm mt-1">Quando houver vendas, elas aparecerão aqui</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">N Pedido</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Cliente</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Pagamento</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Total</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Status</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Data</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Itens</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition">
                                        <td className="px-5 py-3 text-sm font-medium text-gray-800">#{order.id}</td>
                                        <td className="px-5 py-3 text-sm text-gray-600">{order.customerName}</td>
                                        <td className="px-5 py-3 text-sm text-gray-600">{order.paymentMethod}</td>
                                        <td className="px-5 py-3 text-sm font-medium text-indigo-600">{formatCurrency(order.total)}</td>
                                        <td className="px-5 py-3"><Badge status={order.status} /></td>
                                        <td className="px-5 py-3 text-sm text-gray-500">{formatDate(order.createdAt)}</td>
                                        <td className="px-5 py-3 text-sm text-gray-500">{order.quantityItems}</td>
                                        <td className="px-5 py-3">
                                            <button onClick={() => setSelectedOrderId(order.id)}
                                                className="p-1 text-gray-400 hover:text-indigo-600 transition"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedOrderId && (
                <OrderDetailModal
                    orderId={selectedOrderId}
                    onClose={() => setSelectedOrderId(null)}
                />
            )}
        </div>
    );
}
