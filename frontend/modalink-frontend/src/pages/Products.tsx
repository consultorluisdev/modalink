import { useEffect, useState } from "react";
import { getProducts } from "../services/productService";
import { Link } from "react-router-dom";


export default function Products(){
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const data = await getProducts();
    setProducts(data);
  }

  return(
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Link to="/produtos/novo" 
        className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800">
          Novo Produto
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {products.map((p) => (
          <div key={p.id} className="bg-white shadow hover:shadow-lg rounded-xl p-4">

            {/* imagem (placeholder)*/}
            <div className="w-full h-40 bg-gray-200 rounded-lg mb-3" />

            <h2 className="font-semibold">{p.name}</h2>
            <p className="text-gray-500 text-sm">R$:{p.price}</p>
          </div>
        ))}
      </div>
    </div>
  )
}