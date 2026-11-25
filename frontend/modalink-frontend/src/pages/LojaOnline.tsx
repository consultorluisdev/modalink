import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CreditCard,
  Gem,
  Heart,
  Layers,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Sparkles,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import {
  publicCatalogService,
  type PublicProduct,
} from "../services/publicCatalogService";

interface CartItem {
  product: PublicProduct;
  quantity: number;
}

const featuredCategories = [
  { name: "Vestidos", icon: Shirt },
  { name: "Blusas", icon: Shirt },
  { name: "Calças", icon: Layers },
  { name: "Conjuntos", icon: Sparkles },
  { name: "Jaquetas", icon: Shirt },
  { name: "Lingerie", icon: Heart },
  { name: "Acessórios", icon: Gem },
];

export default function LojaOnline() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentCategory, setCurrentCategory] = useState("");
  const [error, setError] = useState("");
  const [storeName, setStoreName] = useState("ModaLink");
  const [storePhone, setStorePhone] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await publicCatalogService.getProducts({
        search: search || undefined,
        category: currentCategory || undefined,
        page: 1,
        pageSize: 24,
      });
      setProducts(Array.isArray(data.items) ? data.items : []);
      setCategories(Array.isArray(data.categories) ? data.categories : []);
      setError("");
    } catch (requestError) {
      console.error("Erro ao carregar catálogo público:", requestError);
      setProducts([]);
      setError("Não foi possível carregar os produtos agora.");
    } finally {
      setLoading(false);
    }
  }, [currentCategory, search]);

  useEffect(() => {
    void publicCatalogService.getStoreSettings()
      .then((data) => {
        setStoreName(data.storeName || "ModaLink");
        setStorePhone(data.phone);
      })
      .catch((requestError: unknown) => {
        console.error("Erro ao carregar dados da loja:", requestError);
      });
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadProducts(), 250);
    return () => window.clearTimeout(timeout);
  }, [loadProducts]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );
  const whatsappNumber = storePhone?.replace(/\D/g, "");
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.startsWith("55") ? whatsappNumber : `55${whatsappNumber}`}`
    : "https://wa.me/";

  function addToCart(product: PublicProduct) {
    setCart((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        );
      }
      return [...items, { product, quantity: 1 }];
    });
  }

  function changeQuantity(productId: number, quantity: number) {
    if (quantity < 1) {
      setCart((items) => items.filter((item) => item.product.id !== productId));
      return;
    }
    setCart((items) =>
      items.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(quantity, item.product.stock) }
          : item
      )
    );
  }

  function checkout() {
    const lines = [
      `Olá! Gostaria de fazer um pedido na ${storeName}:`,
      "",
      ...cart.map(
        (item) =>
          `${item.quantity}x ${item.product.title} - ${(item.product.price * item.quantity).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
      ),
      "",
      `Total: ${cartTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
    ];
    const base = whatsappNumber
      ? `https://wa.me/${whatsappNumber.startsWith("55") ? whatsappNumber : `55${whatsappNumber}`}`
      : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
  }

  function toggleFavorite(productId: number) {
    setFavorites((items) =>
      items.includes(productId)
        ? items.filter((id) => id !== productId)
        : [...items, productId]
    );
  }

  function selectCategory(category: string) {
    setCurrentCategory((selected) => selected === category ? "" : category);
    document.getElementById("destaques")?.scrollIntoView({ behavior: "smooth" });
  }

  const visibleCategories = categories.length > 0
    ? categories.map((name) => ({
        name,
        icon: featuredCategories.find((category) => category.name === name)?.icon ?? Sparkles,
      }))
    : featuredCategories;

  return (
    <div className="min-h-screen bg-[#faf8fc] text-[#21132e]">
      <header className="sticky top-0 z-30 shadow-sm">
        <div className="bg-[#29113d] text-white">
          <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:gap-8 lg:px-10">
            <a href="/loja-online" className="flex shrink-0 items-center gap-2.5" aria-label={`${storeName} início`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-300">
                <ShoppingBag size={23} strokeWidth={2.2} />
              </span>
              <span className="hidden sm:block">
                <span className="block text-[19px] font-extrabold leading-5 tracking-tight">{storeName}</span>
                <span className="block text-[10px] tracking-wide text-purple-200">Moda Feminina</span>
              </span>
            </a>

            <label className="relative hidden min-w-0 flex-1 md:block">
              <span className="sr-only">Buscar produtos</span>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b5b76]" size={18} />
              <input
                type="search"
                placeholder="Buscar produtos, categorias..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full rounded-xl border-0 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-fuchsia-400"
              />
            </label>

            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-4">
              <a href="/login" className="hidden items-center gap-2 px-2 text-xs font-semibold hover:text-fuchsia-300 sm:flex">
                <UserRound size={17} /> Entrar
              </a>
              <button
                type="button"
                onClick={() => document.getElementById("destaques")?.scrollIntoView({ behavior: "smooth" })}
                className="hidden items-center gap-2 px-2 text-xs font-semibold hover:text-fuchsia-300 sm:flex"
              >
                <Heart size={17} /> Favoritos
                {favorites.length > 0 && <span className="rounded-full bg-fuchsia-500 px-1.5 py-0.5 text-[10px]">{favorites.length}</span>}
              </button>
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="relative flex h-10 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold hover:bg-white/10"
                aria-label="Abrir carrinho"
              >
                <ShoppingBag size={18} /> <span className="hidden sm:inline">Carrinho</span>
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[10px]">
                    {cartCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10 md:hidden"
                aria-label="Abrir menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          <div className="px-4 pb-3 md:hidden">
            <label className="relative block">
              <span className="sr-only">Buscar produtos</span>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b5b76]" size={17} />
              <input
                type="search"
                placeholder="Buscar produtos, categorias..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-xl border-0 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>
        </div>

        <nav className="border-b border-purple-100 bg-white">
          <div className="mx-auto flex h-12 max-w-[1440px] items-center gap-1 overflow-x-auto px-4 text-[12px] font-semibold sm:px-6 lg:gap-5 lg:px-10">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="flex h-9 shrink-0 items-center gap-2 rounded-lg bg-[#6525a5] px-3 text-white"
            >
              <Menu size={16} /> Categorias
            </button>
            {["Novidades", ...visibleCategories.slice(0, 5).map((category) => category.name), "Promoções"].map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => item !== "Novidades" && item !== "Promoções" && selectCategory(item)}
                className="h-10 shrink-0 px-2 text-slate-700 transition hover:text-[#7628bd]"
              >
                {item}
              </button>
            ))}
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="ml-auto hidden shrink-0 items-center gap-2 text-emerald-700 hover:text-emerald-800 lg:flex">
              <MessageCircle size={17} /> Atendimento no WhatsApp
            </a>
          </div>
          {mobileMenuOpen && (
            <div className="absolute left-0 right-0 z-40 grid grid-cols-2 gap-2 border-t border-purple-100 bg-white p-4 shadow-lg sm:grid-cols-3 md:hidden">
              {visibleCategories.map(({ name, icon: Icon }) => (
                <button key={name} onClick={() => { selectCategory(name); setMobileMenuOpen(false); }} className="flex items-center gap-2 rounded-xl bg-purple-50 p-3 text-left text-sm font-semibold text-[#542080]">
                  <Icon size={18} /> {name}
                </button>
              ))}
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="col-span-2 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 sm:col-span-3">
                <MessageCircle size={18} /> Atendimento no WhatsApp
              </a>
            </div>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-[1440px] px-3 pt-3 sm:px-6 sm:pt-5 lg:px-10">
          <div className="relative isolate min-h-[330px] overflow-hidden rounded-2xl bg-[#3a1557] sm:min-h-[380px] lg:min-h-[420px]">
            <img
              src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1800&q=85"
              alt="Nova coleção de moda feminina"
              fetchPriority="high"
              className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_35%]"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#29113d]/95 via-[#49156e]/80 to-[#4a1766]/10" />
            <div className="flex min-h-[330px] items-center px-6 py-10 sm:min-h-[380px] sm:px-10 lg:min-h-[420px] lg:px-16">
              <div className="max-w-[510px] text-white">
                <span className="inline-flex rounded-full bg-[#a22ee9] px-4 py-1.5 text-[11px] font-bold tracking-wide shadow-lg">
                  Nova coleção
                </span>
                <h1 className="mt-4 text-[34px] font-black leading-[1.02] tracking-tight sm:text-5xl lg:text-[58px]">
                  Moda feminina<br />com estilo e<br />
                  <span className="text-[#ff65cf]">personalidade</span>
                </h1>
                <p className="mt-4 max-w-[340px] text-sm leading-6 text-purple-50 sm:text-base">
                  Looks modernos para o seu dia a dia, trabalho e ocasiões especiais.
                </p>
                <a href="#destaques" className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-[#a52bea] to-[#7923c7] px-5 text-sm font-bold text-white shadow-lg transition hover:brightness-110">
                  <ShoppingBag size={16} /> Ver coleção <ArrowRight size={16} />
                </a>
              </div>
            </div>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
              {[0, 1, 2, 3].map((dot) => (
                <span key={dot} className={`h-1.5 rounded-full ${dot === 0 ? "w-6 bg-white" : "w-1.5 bg-white/60"}`} />
              ))}
            </div>
          </div>
        </section>

        <section aria-label="Categorias de produtos" className="mx-auto max-w-[1440px] px-3 pt-5 sm:px-6 sm:pt-7 lg:px-10">
          <div className="flex snap-x gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 sm:gap-3 lg:grid-cols-7">
            {visibleCategories.map(({ name, icon: Icon }) => (
              <button
                type="button"
                key={name}
                onClick={() => selectCategory(name)}
                className={`flex min-w-[92px] snap-start flex-col items-center justify-center gap-2 rounded-xl border px-3 py-3.5 transition hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md sm:min-w-0 ${currentCategory === name ? "border-purple-400 bg-purple-100" : "border-purple-100 bg-gradient-to-br from-[#f6eafd] to-white"}`}
              >
                <Icon size={26} strokeWidth={1.8} className="text-[#8b28cc]" />
                <span className="text-[11px] font-bold text-[#321647]">{name}</span>
              </button>
            ))}
          </div>
        </section>

        <section id="destaques" className="mx-auto max-w-[1440px] px-4 pb-12 pt-7 sm:px-6 sm:pb-16 sm:pt-10 lg:px-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b28cc]">Escolhas para você</p>
              <h2 className="border-l-[3px] border-[#9d2be2] pl-3 text-xl font-extrabold tracking-tight sm:text-2xl">
                {currentCategory || "Destaques da semana"}
              </h2>
            </div>
            {products.length > 0 && (
              <button type="button" onClick={() => { setCurrentCategory(""); setSearch(""); }} className="flex items-center gap-1 text-xs font-bold text-[#7122ac] hover:text-[#a32bdd]">
                Ver todos <ArrowRight size={14} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="aspect-[4/5] rounded-xl bg-purple-100" />
                  <div className="mt-3 h-4 w-3/4 rounded bg-purple-100" />
                  <div className="mt-2 h-5 w-1/2 rounded bg-purple-100" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-100 bg-white px-5 py-10 text-center">
              <Package className="mx-auto mb-3 text-red-300" size={40} />
              <p className="font-semibold text-slate-800">{error}</p>
              <button onClick={() => void loadProducts()} className="mt-4 text-sm font-bold text-[#7628bd] underline">Tentar novamente</button>
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-purple-100 bg-white px-5 py-12 text-center shadow-sm">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 text-[#8b28cc]">
                <ShoppingBag size={25} />
              </span>
              <p className="font-bold text-slate-800">{search || currentCategory ? "Não encontramos produtos com esse filtro" : "A nova coleção está chegando"}</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {search || currentCategory ? "Experimente buscar por outro termo ou escolha uma categoria diferente." : "Estamos preparando novidades para você. Volte em breve para conhecer as peças."}
              </p>
              {(search || currentCategory) && (
                <button onClick={() => { setSearch(""); setCurrentCategory(""); }} className="mt-4 rounded-full bg-[#7628bd] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#5f1c99]">
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-4">
              {products.map((product) => (
                <article key={product.id} className="group min-w-0 overflow-hidden rounded-xl border border-[#eee8f2] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-[#f8e9f4] to-[#eee3fa]">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#bd91d7]"><Package size={54} strokeWidth={1.3} /></div>
                    )}
                    {product.stock <= 3 && product.stock > 0 && (
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-[#9e2dd0] px-2.5 py-1 text-[10px] font-extrabold text-white">Últimas peças</span>
                    )}
                    <button type="button" onClick={() => toggleFavorite(product.id)} aria-label={favorites.includes(product.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"} className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#50236d] shadow-sm transition hover:text-fuchsia-600">
                      <Heart size={16} fill={favorites.includes(product.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                  <div className="p-3 sm:p-4">
                    {product.category && <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#9b71af]">{product.category}</p>}
                    <h3 className="truncate text-[13px] font-bold text-[#29113d] sm:text-sm">{product.title}</h3>
                    {product.description && <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{product.description}</p>}
                    <p className="mt-2 text-base font-black text-[#29113d] sm:text-lg">{product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                    <button type="button" onClick={() => addToCart(product)} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#8d26ca] to-[#6420a9] text-xs font-bold text-white shadow-sm transition hover:brightness-110">
                      <ShoppingBag size={15} /> Adicionar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="border-y border-purple-100 bg-white">
          <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-4 gap-y-6 px-5 py-7 sm:grid-cols-4 sm:gap-8 sm:px-8">
            {[
              { icon: Truck, title: "Frete rápido", detail: "Consulte sua região" },
              { icon: CreditCard, title: "Pagamento facilitado", detail: "Consulte condições" },
              { icon: ShieldCheck, title: "Compra segura", detail: "Atendimento próximo" },
              { icon: RefreshCw, title: "Troca fácil", detail: "Fale com a gente" },
            ].map(({ icon: Icon, title, detail }) => (
              <div key={title} className="flex items-center gap-3">
                <Icon size={25} className="shrink-0 text-[#8527c1]" strokeWidth={1.8} />
                <div><p className="text-xs font-extrabold text-[#321647]">{title}</p><p className="mt-0.5 text-[10px] text-slate-500">{detail}</p></div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-[#29113d] text-white">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-9 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-12">
          <div>
            <a href="/loja-online" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-500/20 text-fuchsia-300"><ShoppingBag size={20} /></span>
              <span><span className="block text-base font-extrabold leading-5">{storeName}</span><span className="text-[10px] text-purple-200">Moda Feminina</span></span>
            </a>
            <p className="mt-3 max-w-xs text-xs leading-5 text-purple-200">Seu estilo, em seu lugar. Moda, qualidade e praticidade para você.</p>
            <div className="mt-4 flex gap-3 text-purple-200">
              <a href={whatsappUrl} aria-label="WhatsApp" className="hover:text-white"><MessageCircle size={17} /></a>
              <a href={whatsappUrl} aria-label="Instagram" className="hover:text-white"><Sparkles size={17} /></a>
              <a href={whatsappUrl} aria-label="Contato" className="hover:text-white"><Mail size={17} /></a>
            </div>
          </div>
          <div>
            <h2 className="mb-3 text-xs font-extrabold">Institucional</h2>
            <ul className="space-y-2 text-xs text-purple-200">
              <li><a href="#destaques" className="hover:text-white">Sobre a loja</a></li>
              <li><a href={whatsappUrl} className="hover:text-white">Política de privacidade</a></li>
              <li><a href={whatsappUrl} className="hover:text-white">Trocas e devoluções</a></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xs font-extrabold">Categorias</h2>
            <ul className="space-y-2 text-xs text-purple-200">
              {visibleCategories.slice(0, 5).map(({ name }) => <li key={name}><button onClick={() => selectCategory(name)} className="hover:text-white">{name}</button></li>)}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xs font-extrabold">Atendimento</h2>
            <ul className="space-y-3 text-xs text-purple-200">
              <li><a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white"><MessageCircle size={15} /> Fale conosco pelo WhatsApp</a></li>
              {storePhone && <li><a href={whatsappUrl} className="flex items-center gap-2 hover:text-white"><UserRound size={15} /> {storePhone}</a></li>}
              <li><MapPin size={15} /> {storeName}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center text-[10px] text-purple-300">
          © {new Date().getFullYear()} {storeName}. Todos os direitos reservados.
        </div>
      </footer>

      {cartOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Carrinho">
          <button type="button" className="absolute inset-0 bg-[#21132e]/50 backdrop-blur-sm" onClick={() => setCartOpen(false)} aria-label="Fechar carrinho" />
          <aside className="absolute bottom-0 right-0 flex max-h-[88vh] w-full flex-col rounded-t-[24px] bg-white shadow-2xl sm:top-0 sm:max-h-none sm:w-[420px] sm:rounded-none">
            <div className="flex h-16 items-center justify-between border-b border-purple-100 px-5">
              <div><p className="font-bold text-[#29113d]">Seu carrinho</p><p className="text-xs text-slate-500">{cartCount} {cartCount === 1 ? "item" : "itens"}</p></div>
              <button onClick={() => setCartOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 text-[#542080]" aria-label="Fechar"><X size={19} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {cart.length === 0 ? (
                <div className="py-16 text-center"><ShoppingBag className="mx-auto mb-3 text-purple-200" size={44} /><p className="font-bold text-[#29113d]">Seu carrinho está vazio</p><p className="mt-1 text-sm text-slate-500">Adicione seus produtos favoritos para continuar.</p></div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex gap-3">
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-purple-50">
                        {item.product.imageUrl ? <img src={item.product.imageUrl} alt="" className="h-full w-full object-cover" /> : <Package className="mx-auto mt-6 text-purple-200" size={28} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#29113d]">{item.product.title}</p>
                        <p className="mt-1 text-sm font-semibold">{(item.product.price * item.quantity).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                        <div className="mt-2 flex h-8 w-24 items-center justify-between rounded-full border border-purple-100 px-2 text-[#542080]">
                          <button onClick={() => changeQuantity(item.product.id, item.quantity - 1)} className="w-6" aria-label="Diminuir quantidade">-</button>
                          <span className="text-xs font-bold">{item.quantity}</span>
                          <button onClick={() => changeQuantity(item.product.id, item.quantity + 1)} className="w-6" aria-label="Aumentar quantidade">+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t border-purple-100 p-5 pb-7">
                <div className="mb-4 flex items-center justify-between"><span className="text-sm text-slate-500">Total</span><span className="text-xl font-black text-[#29113d]">{cartTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div>
                <button onClick={checkout} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700">
                  <Check size={19} /> Finalizar pelo WhatsApp <ChevronRight size={17} />
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
