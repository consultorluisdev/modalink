import { useEffect, useState } from "react";
import { X, Loader2, CalendarDays, CreditCard, UserRound, Phone, Mail, Package, CircleDollarSign, Printer, Ban } from "lucide-react";
import { orderService } from "../../services/orderServices";
import type { OrderDetail } from "../../types/order.types";
import { Badge } from "./Badge";

interface OrderDetailModalProps {
    orderId: number;
    onClose: () => void;
    onCancelled?: () => void;
}

export function OrderDetailModal({ orderId, onClose, onCancelled }: OrderDetailModalProps) {
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const loadOrder = async () => {
            try {
                setLoading(true);
                setError("");
                const data = await orderService.getById(orderId);
                if (!cancelled) setOrder(data);
            } catch {
                if (!cancelled) setError("Não foi possível carregar os detalhes deste pedido.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void loadOrder();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            cancelled = true;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [orderId, onClose]);

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    };
    const createdAt = new Date(order?.createdAt ?? "");
    const saleTotal = order?.totalWithInterest == null
        ? order?.total ?? 0
        : (order.downPayment ?? 0) + order.totalWithInterest;

    async function handleCancelOrder() {
        const reason = window.prompt("Informe o motivo do cancelamento (opcional):");
        if (reason === null) return;
        if (!window.confirm("Confirma cancelar esta venda e devolver os itens ao estoque?")) return;

        setCancelling(true);
        setError("");
        try {
            await orderService.cancel(orderId, reason.trim() || undefined);
            onCancelled?.();
        } catch {
            setError("Não foi possível cancelar o pedido. Verifique se ele já foi cancelado.");
        } finally {
            setCancelling(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
            <button type="button" aria-label="Fechar detalhes do pedido" className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={onClose} />
            <div role="dialog" aria-modal="true" aria-labelledby="order-detail-title" className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-purple-100 bg-white/95 p-4 backdrop-blur sm:p-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">Detalhes da venda</p>
                        <h2 id="order-detail-title" className="mt-1 text-lg font-bold text-slate-900">
                            Pedido #{orderId}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-purple-50 hover:text-indigo-700">
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex h-56 items-center justify-center">
                        <Loader2 size={32} className="animate-spin text-indigo-700" />
                    </div>
                ) : error ? (
                    <div role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                ) : order ? (
                    <div className="space-y-5 p-4 sm:p-5">
                        <div className="rounded-2xl bg-gradient-to-br from-[#35134c] via-[#542080] to-[#7628bd] p-4 text-white sm:p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-medium text-purple-100">Valor total</p>
                                    <p className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{formatCurrency(order.total)}</p>
                                </div>
                                <Badge status={order.status} />
                            </div>
                            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/15 pt-3 text-xs text-purple-100">
                                <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} />{Number.isNaN(createdAt.getTime()) ? "—" : createdAt.toLocaleString("pt-BR")}</span>
                                <span className="inline-flex items-center gap-1.5"><CreditCard size={14} />{order.paymentMethod}</span>
                            </div>
                        </div>

                        <section>
                            <h3 className="mb-3 text-sm font-semibold text-slate-900">Dados do cliente</h3>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="flex min-w-0 items-start gap-3 rounded-xl border border-purple-100 p-3">
                                    <UserRound size={17} className="mt-0.5 shrink-0 text-indigo-700" />
                                    <div className="min-w-0"><p className="text-xs text-slate-500">Cliente</p><p className="mt-0.5 break-words text-sm font-medium text-slate-800">{order.customerName || "—"}</p></div>
                                </div>
                                <div className="flex min-w-0 items-start gap-3 rounded-xl border border-purple-100 p-3">
                                    <Mail size={17} className="mt-0.5 shrink-0 text-indigo-700" />
                                    <div className="min-w-0"><p className="text-xs text-slate-500">Email</p><p className="mt-0.5 break-all text-sm font-medium text-slate-800">{order.customerEmail || "—"}</p></div>
                                </div>
                                <div className="flex min-w-0 items-start gap-3 rounded-xl border border-purple-100 p-3 sm:col-span-2">
                                    <Phone size={17} className="mt-0.5 shrink-0 text-indigo-700" />
                                    <div className="min-w-0"><p className="text-xs text-slate-500">Telefone</p><p className="mt-0.5 text-sm font-medium text-slate-800">{order.customerPhone || "—"}</p></div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-900"><Package size={17} className="text-indigo-700" />Itens do pedido <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-indigo-800">{order.items.length}</span></h3>
                            <div className="overflow-hidden rounded-xl border border-purple-100">
                                <div className="hidden overflow-x-auto sm:block">
                                    <table className="w-full min-w-[480px]">
                                        <thead className="bg-purple-50/70">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Produto</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Qtd</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Preço unit.</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-purple-50">
                                            {order.items.map((item, index) => (
                                                <tr key={`${item.productName}-${index}`}>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{item.productName}</td>
                                                    <td className="px-4 py-3 text-center text-sm text-slate-600">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-right text-sm text-slate-600">{formatCurrency(item.unitPrice)}</td>
                                                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800">{formatCurrency(item.subtotal)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="divide-y divide-purple-50 sm:hidden">
                                    {order.items.map((item, index) => (
                                        <div key={`${item.productName}-${index}`} className="flex items-start justify-between gap-4 p-3">
                                            <div className="min-w-0"><p className="break-words text-sm font-medium text-slate-800">{item.productName}</p><p className="mt-1 text-xs text-slate-500">{item.quantity} × {formatCurrency(item.unitPrice)}</p></div>
                                            <p className="shrink-0 text-sm font-semibold text-slate-800">{formatCurrency(item.subtotal)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between rounded-xl bg-purple-50 px-4 py-3">
                                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><CircleDollarSign size={17} className="text-indigo-700" />Total do pedido</span>
                                <span className="text-base font-bold text-indigo-800">{formatCurrency(order.total)}</span>
                            </div>
                        </section>

                        <div className="flex flex-col gap-2 border-t border-purple-100 pt-4 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-white px-4 text-sm font-semibold text-indigo-800 transition hover:bg-purple-50"
                            >
                                <Printer size={17} />
                                Imprimir comprovante
                            </button>
                            {order.status !== "Cancelled" && (
                                <button
                                    type="button"
                                    onClick={() => void handleCancelOrder()}
                                    disabled={cancelling}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                                >
                                    <Ban size={17} />
                                    {cancelling ? "Cancelando..." : "Cancelar venda"}
                                </button>
                            )}
                        </div>

                        <div className="sales-receipt-print hidden">
                            <div className="text-center">
                                <h1 className="text-xl font-bold">ModaLink</h1>
                                <p className="text-xs">Comprovante de venda (não fiscal)</p>
                            </div>
                            <hr className="my-3 border-dashed border-black" />
                            <p className="text-sm font-bold">Venda #{order.id}</p>
                            <p className="text-xs">{Number.isNaN(createdAt.getTime()) ? "—" : createdAt.toLocaleString("pt-BR")}</p>
                            <p className="mt-2 text-xs">Cliente: {order.customerName || "Consumidor final"}</p>
                            {order.customerPhone && <p className="text-xs">Telefone: {order.customerPhone}</p>}
                            <p className="text-xs">Pagamento: {order.paymentMethod}</p>
                            <hr className="my-3 border-dashed border-black" />
                            {order.items.map((item, index) => (
                                <div key={`${item.productName}-${index}`} className="mb-2 text-xs">
                                    <p className="font-semibold">{item.productName}</p>
                                    <div className="flex justify-between gap-2">
                                        <span>{item.quantity} × {formatCurrency(item.unitPrice)}</span>
                                        <span>{formatCurrency(item.subtotal)}</span>
                                    </div>
                                </div>
                            ))}
                            <hr className="my-3 border-dashed border-black" />
                            <div className="flex justify-between text-xs"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                            <div className="flex justify-between text-xs"><span>Desconto</span><span>{formatCurrency(order.discount)}</span></div>
                            <div className="mt-1 flex justify-between text-sm font-bold"><span>Total</span><span>{formatCurrency(saleTotal)}</span></div>
                            {order.installments.length > 0 && (
                                <p className="mt-2 text-xs">
                                    Crediário: {order.installmentCount} parcelas de {formatCurrency(order.installments[0].amount)}
                                    {order.downPayment ? `; entrada ${formatCurrency(order.downPayment)}` : ""}
                                </p>
                            )}
                            <p className="mt-5 text-center text-xs">Obrigado pela preferência!</p>
                        </div>
                    </div>
                ) : (
                    <div className="p-12 text-center text-sm text-slate-500">
                        Pedido não encontrado
                    </div>
                )}
            </div>
        </div>
    );
}
