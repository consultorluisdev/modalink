import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Minus, Trash2, ShoppingCart, ArrowLeft, DollarSign, BadgePercent, QrCode, Banknote, CreditCard, Calendar } from "lucide-react";
import { getProducts } from "../../services/productService";
import { orderService } from "../../services/orderServices";

interface CartItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export default function NovaVenda() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [installmentCount, setInstallmentCount] = useState(6);
  const [downPayment, setDownPayment] = useState(0);
  const [interestRate, setInterestRate] = useState(3);
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch {
      setError("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  function addToCart(product: any) {
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
  const total = subtotal - discount;

  const isCrediario = paymentMethod === "Crediário";
  const amountToFinance = Math.max(0, total - downPayment);
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
        discount,
        installmentCount: isCrediario ? installmentCount : undefined,
        downPayment: isCrediario && downPayment > 0 ? downPayment : undefined,
        interestRate: isCrediario && interestRate > 0 ? interestRate : undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });

      navigate("/pedidos");
    } catch {
      setError("Erro ao finalizar venda");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Nova Venda</h1>
            <p className="text-gray-500 text-sm">Selecione os produtos e finalize o pedido</p>
          </div>
        </div>

        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="text-left bg-white border border-gray-200 rounded-xl p-3 hover:border-indigo-300 hover:shadow transition"
              >
                <div className="w-full h-24 bg-gray-100 rounded-lg mb-2 overflow-hidden">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Sem imagem</div>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-800 truncate">{p.title}</p>
                <p className="text-sm font-bold text-indigo-600">
                  {p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 sticky top-6">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
            <ShoppingCart size={18} className="text-indigo-600" />
            <h2 className="font-semibold text-gray-800">Carrinho</h2>
            <span className="text-xs text-gray-400 ml-auto">{cart.length} itens</span>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-xs">
              {error}
            </div>
          )}

          {cart.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Carrinho vazio</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{item.productName}</p>
                    <p className="text-xs text-indigo-600 font-medium">
                      {item.unitPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => updateQuantity(item.productId, -1)} className="p-1 text-gray-400 hover:text-gray-600">
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.productId, 1)} className="p-1 text-gray-400 hover:text-gray-600">
                      <Plus size={14} />
                    </button>
                  </div>
                  <button type="button" onClick={() => removeFromCart(item.productId)} className="p-1 text-red-400 hover:text-red-600">
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
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 text-right px-2 py-0.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex items-center justify-between font-bold">
              <span className="text-gray-800">Total</span>
              <span className="text-lg text-indigo-600">
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <input
              type="email"
              placeholder="Email do cliente"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <input
              type="text"
              placeholder="Telefone do cliente"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Forma de Pagamento</p>
              <div className="grid grid-cols-5 gap-1.5">
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
                        className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg text-xs font-medium border transition ${
                          isActive
                            ? `${colors.bg} ${colors.border} ${colors.text}`
                            : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
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
              <div className="space-y-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-yellow-800 flex items-center gap-1">
                  <BadgePercent size={14} />
                  Crediário
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-yellow-700">Parcelas</label>
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
                    <label className="text-xs text-yellow-700">Juros (% mês)</label>
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
                  <label className="text-xs text-yellow-700">Entrada (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={downPayment}
                    onChange={(e) => setDownPayment(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-2 py-1.5 border border-yellow-300 rounded text-sm focus:ring-1 focus:ring-yellow-500 outline-none"
                  />
                </div>
                {amountToFinance > 0 && (
                  <div className="text-xs text-yellow-800 space-y-1 bg-yellow-100/50 rounded p-2">
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
            disabled={submitting || cart.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DollarSign size={16} />
            {submitting ? "Finalizando..." : "Finalizar Venda"}
          </button>
        </form>
      </div>
    </div>
  );
}
