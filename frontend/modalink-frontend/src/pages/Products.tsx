import { useEffect, useState } from "react";
import { getProducts } from "../services/productService";
import { Link } from "react-router-dom";
import { Plus, Package, AlertCircle } from "lucide-react";

interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  imageUrl: string;
  category: string;
  stock: number;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Produtos</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie o catálogo da sua loja</p>
        </div>
        <Link
          to="/produtos/novo"
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800"
        >
          <Plus size={18} />
          Novo Produto
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {products.length === 0 ? (
        <div className="rounded-2xl border border-purple-100 bg-white p-8 text-center shadow-sm sm:p-12">
          <Package size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum produto cadastrado</p>
          <p className="text-gray-400 text-sm mt-1">Clique em "Novo Produto" para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4">
          {products.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="aspect-[4/3] w-full bg-purple-50">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Package size={32} />
                  </div>
                )}
              </div>
              <div className="p-3 sm:p-4">
                <h2 className="truncate text-sm font-semibold text-gray-800 sm:text-base">{p.title}</h2>
                <p className="mt-1 font-bold text-indigo-700">
                  {p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
