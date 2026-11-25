import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Minus, Trash2, ShoppingCart, DollarSign, BadgePercent, QrCode, Banknote, CreditCard, Calendar, Package, ClipboardList } from "lucide-react";
import type { AxiosError } from "axios";
import { getProducts } from "../../services/productService";
import { orderService } from "../../services/orderServices";
import { cashRegisterService } from "../../services/cashRegisterService";

interface Product {
  id: number;
  title: string;
  price: number;
  imageUrl: string;
}

interface CartItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export default function NovaVenda() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [downPaymentMethod, setDownPaymentMethod] = useState("Pix");
  const [installmentCount, setInstallmentCount] = useState(6);
  const [downPayment, setDownPayment] = useState(0);
  const [interestRate, setInterestRate] = useState(3);
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [cashOpen, setCashOpen] = useState<boolean | null>(null);

  async function loadProducts() {
    try {
      setError("");
      const data = await getProducts();
      setProducts(data);
    } catch {
      setError("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    cashRegisterService.getCurrent()
      .then((register) => setCashOpen(register !== null))
      .catch(() => setCashOpen(false));
  }, []);

  const filteredProducts = products.filter((p) =>
    p.title.toLocaleLowerCase("pt-BR").includes(productSearch.trim().toLocaleLowerCase("pt-BR"))
  );

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.title,
          quantity: 1,
          unitPrice: product.price,
        },
      ];
    });
  }

  function updateQuantity(productId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId: number) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }

  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const appliedDiscount = Math.min(discount, subtotal);
  const total = Math.max(0, subtotal - appliedDiscount);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const isCrediario = paymentMethod === "Crediário";
  const appliedDownPayment = Math.min(downPayment, total);
  const amountToFinance = Math.max(0, total - appliedDownPayment);
  const totalWithInterest = amountToFinance * (1 + interestRate * installmentCount / 100);
  const installmentAmount = installmentCount > 0 ? totalWithInterest / installmentCount : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!customerName) {
      setError("Nome do cliente é obrigatório");
      return;
    }
    if (cart.length === 0) {
      setError("Adicione pelo menos um produto");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await orderService.create({
        customerName,
        customerEmail,
        customerPhone,
        paymentMethod,
        discount: appliedDiscount,
        installmentCount: isCrediario ? installmentCount : undefined,
        downPayment: isCrediario && appliedDownPayment > 0 ? appliedDownPayment : undefined,
        downPaymentMethod: isCrediario && appliedDownPayment > 0 ? downPaymentMethod : undefined,
        interestRate: isCrediario && interestRate > 0 ? interestRate : undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });

      navigate("/pedidos");
    } catch (requestError: unknown) {
      const axiosError = requestError as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? "Erro ao finalizar venda");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">Ponto de venda</p>
            <h1 className="text-2xl font-bold text-gray-900">Nova venda</h1>
            <p className="mt-1 text-sm text-gray-500">Selecione produtos e conclua a venda.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/pedidos")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-800 transition hover:bg-purple-50"
        >
          <ClipboardList size={17} />
          Ver pedidos
        </button>
      </header>

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
          {error}
          {error === "Erro ao carregar produtos" && (
            <button type="button" onClick={() => void loadProducts()} className="self-start font-semibold underline underline-offset-2 sm:self-auto">
              Tentar novamente
            </button>
          )}
          {cashOpen === false && (
            <div role="status" className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <span>Abra o caixa para começar a registrar vendas e manter as movimentações conciliadas.</span>
              <Link to="/caixa" className="w-fit rounded-lg bg-amber-800 px-3 py-2 font-semibold text-white hover:bg-amber-900">Abrir caixa</Link>
            </div>
          )}
          {cashOpen === null && <p className="text-xs text-slate-500">Verificando situação do caixa…</p>}
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <section className="overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-purple-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-indigo-700">
                <Package size={19} />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900">Produtos</h2>
                <p className="text-xs text-slate-500">{products.length} disponíveis</p>
              </div>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Buscar produto..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full border border-purple-100 bg-slate-50 py-2.5 pl-10 pr-3 text-sm focus:bg-white"
              />
            </div>
          </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-purple-100 bg-white">
            <div className="text-center">
              <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-purple-100 border-t-indigo-700" />
              <p className="text-sm text-slate-500">Carregando produtos...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-purple-100 bg-white px-6 py-12 text-center shadow-sm">
            <Package size={36} className="mx-auto mb-3 text-purple-300" />
            <p className="font-semibold text-slate-800">Nenhum produto cadastrado</p>
            <p className="mt-1 text-sm text-slate-500">Cadastre produtos para começar a registrar vendas.</p>
            <button type="button" onClick={() => navigate("/produtos/novo")} className="mt-4 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800">
              Cadastrar produto
            </button>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            {filteredProducts.length === 0 ? (
              <div className="py-12 text-center">
                <Search size={32} className="mx-auto mb-3 text-purple-300" />
                <p className="font-medium text-slate-700">Nenhum produto encontrado</p>
                <p className="mt-1 text-sm text-slate-500">Tente outro termo de busca.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p)}
                    className="group min-w-0 overflow-hidden rounded-xl border border-purple-100 bg-white text-left transition hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-purple-50">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-purple-300"><Package size={28} /></div>
                      )}
                      <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-indigo-700 shadow-sm">
                        <Plus size={17} />
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-medium text-slate-800">{p.title}</p>
                      <p className="mt-1 text-sm font-bold text-indigo-700">
                        {p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        </section>
      </div>

      <div className="min-w-0 lg:col-span-1">
        <form onSubmit={handleSubmit} className="sticky top-6 space-y-4 rounded-2xl border border-purple-100 bg-white p-4 shadow-sm sm:p-5 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
            <ShoppingCart size={18} className="text-indigo-600" />
            <h2 className="font-semibold text-gray-800">Carrinho</h2>
            <span className="ml-auto rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-indigo-800">{cartItemCount} {cartItemCount === 1 ? "item" : "itens"}</span>
          </div>

          {cart.length === 0 ? (
            <div className="rounded-xl border border-dashed border-purple-200 bg-purple-50/50 px-4 py-8 text-center">
              <ShoppingCart size={26} className="mx-auto mb-2 text-purple-300" />
              <p className="text-sm font-medium text-slate-700">Seu carrinho está vazio</p>
              <p className="mt-1 text-xs text-slate-500">Toque em um produto para adicioná-lo.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center gap-2 rounded-xl border border-purple-50 bg-slate-50 p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{item.productName}</p>
                    <p className="text-xs text-indigo-600 font-medium">
                      {item.unitPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label={`Diminuir ${item.productName}`} onClick={() => updateQuantity(item.productId, -1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-purple-100 bg-white text-slate-500 hover:text-indigo-700">
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <button type="button" aria-label={`Aumentar ${item.productName}`} onClick={() => updateQuantity(item.productId, 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-purple-100 bg-white text-slate-500 hover:text-indigo-700">
                      <Plus size={14} />
                    </button>
                  </div>
                  <button type="button" aria-label={`Remover ${item.productName}`} onClick={() => removeFromCart(item.productId)} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-200 pt-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-700">{subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Desconto</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={appliedDiscount}
                onChange={(e) => setDiscount(Math.min(subtotal, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="w-24 text-right px-2 py-0.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex items-center justify-between font-bold">
              <span className="text-gray-800">Total</span>
              <span className="text-lg text-indigo-700">
                {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nome do cliente *"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              className="w-full border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="email"
              placeholder="Email do cliente"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="Telefone do cliente"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Forma de Pagamento</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    { value: "Pix", label: "Pix", icon: QrCode, color: "emerald" },
                    { value: "Cartão", label: "Cartão", icon: CreditCard, color: "blue" },
                    { value: "Débito", label: "Débito", icon: CreditCard, color: "violet" },
                    { value: "Dinheiro", label: "Dinheiro", icon: Banknote, color: "amber" },
                    { value: "Crediário", label: "Crediário", icon: Calendar, color: "orange" },
                  ].map((metodo) => {
                    const colors = {
                      emerald: { bg: "bg-emerald-50", border: "border-emerald-400", text: "text-emerald-700", icon: "text-emerald-600" },
                      blue: { bg: "bg-blue-50", border: "border-blue-400", text: "text-blue-700", icon: "text-blue-600" },
                      violet: { bg: "bg-violet-50", border: "border-violet-400", text: "text-violet-700", icon: "text-violet-600" },
                      amber: { bg: "bg-amber-50", border: "border-amber-400", text: "text-amber-700", icon: "text-amber-600" },
                      orange: { bg: "bg-orange-50", border: "border-orange-400", text: "text-orange-700", icon: "text-orange-600" },
                    }[metodo.color]!;
                    const isActive = paymentMethod === metodo.value;
                    return (
                      <button
                        key={metodo.value}
                        type="button"
                        onClick={() => setPaymentMethod(metodo.value)}
                        className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2.5 text-xs font-medium transition ${
                          isActive
                            ? `${colors.bg} ${colors.border} ${colors.text}`
                            : "bg-white border-purple-100 text-gray-500 hover:border-purple-300"
                        }`}
                      >
                        <metodo.icon size={18} className={isActive ? colors.icon : "text-gray-400"} />
                        {metodo.label}
                      </button>
                    );
                  })
                }</div>
            </div>

            {isCrediario && (
              <div className="space-y-3 rounded-xl border border-purple-100 bg-purple-50/70 p-3">
                <p className="flex items-center gap-1 text-xs font-semibold text-indigo-800">
                  <BadgePercent size={14} />
                  Crediário
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-600">Parcelas</label>
                    <select
                      value={installmentCount}
                      onChange={(e) => setInstallmentCount(parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-yellow-300 rounded text-sm focus:ring-1 focus:ring-yellow-500 outline-none bg-white"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <option key={n} value={n}>{n}x</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Juros (% mês)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={interestRate}
                      onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border border-yellow-300 rounded text-sm focus:ring-1 focus:ring-yellow-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Entrada (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={downPayment}
                    onChange={(e) => setDownPayment(Math.min(total, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full px-2 py-1.5 border border-yellow-300 rounded text-sm focus:ring-1 focus:ring-yellow-500 outline-none"
                  />
                </div>
                {appliedDownPayment > 0 && (
                  <div>
                    <label className="text-xs text-slate-600" htmlFor="down-payment-method">Forma de recebimento da entrada</label>
                    <select
                      id="down-payment-method"
                      value={downPaymentMethod}
                      onChange={(e) => setDownPaymentMethod(e.target.value)}
                      className="w-full border border-purple-100 bg-white px-2 py-2 text-sm"
                    >
                      <option value="Pix">Pix</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão">Cartão</option>
                      <option value="Débito">Débito</option>
                    </select>
                  </div>
                )}
                {amountToFinance > 0 && (
                  <div className="space-y-1 rounded-lg bg-white/80 p-2 text-xs text-indigo-900">
                    <p>Valor financiado: <strong>{amountToFinance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></p>
                    <p>Total c/ juros: <strong>{totalWithInterest.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></p>
                    <p>{installmentCount}x de <strong>{installmentAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></p>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || cart.length === 0 || cashOpen !== true}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DollarSign size={16} />
            {submitting ? "Finalizando..." : "Finalizar Venda"}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
