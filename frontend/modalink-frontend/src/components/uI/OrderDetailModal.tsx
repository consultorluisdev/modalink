import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { orderService } from "../../services/orderServices";
import type { OrderDetail } from "../../types/order.types";
import { Badge } from "./Badge";

interface OrderDetailModalProps {
    orderId: number;
    onClose: () => void;
}

export function OrderDetailModal({ orderId, onClose }: OrderDetailModalProps) {
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadOrder = async () => {
            try {
                setLoading(true);
                const data = await orderService.getById(orderId);
                setOrder(data);
            } catch (error) {
                console.error('Erro ao carregar detalhes do pedido:', error);
            } finally {
                setLoading(false);
            }
        };
        loadOrder();
    }, [orderId]);

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">
                        Pedido #{orderId}
                    </h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 size={32} className="animate-spin text-indigo-600" />
                    </div>
                ) : order ? (
                    <div className="p-5 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500">Cliente</p>
                                <p className="text-sm font-medium text-gray-800">{order.customerName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Email</p>
                                <p className="text-sm font-medium text-gray-800">{order.customerEmail}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Telefone</p>
                                <p className="text-sm font-medium text-gray-800">{order.customerPhone}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Pagamento</p>
                                <p className="text-sm font-medium text-gray-800">{order.paymentMethod}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Status</p>
                                <Badge status={order.status} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Total</p>
                                <p className="text-sm font-semibold text-indigo-600">{formatCurrency(order.total)}</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Itens do Pedido</h3>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Produto</th>
                                            <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">Qtd</th>
                                            <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Preço Unit.</th>
                                            <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {order.items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2 text-sm text-gray-800">{item.productName}</td>
                                                <td className="px-4 py-2 text-sm text-center text-gray-600">{item.quantity}</td>
                                                <td className="px-4 py-2 text-sm text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                                                <td className="px-4 py-2 text-sm text-right font-medium text-gray-800">{formatCurrency(item.subtotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <p className="text-gray-500">Pedido não encontrado</p>
                    </div>
                )}
            </div>
        </div>
    );
}
