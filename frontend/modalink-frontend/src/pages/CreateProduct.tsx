import { useState } from "react";
import { createProduct } from "../services/productService";
import { useNavigate } from "react-router-dom";

export default function CreateProduct() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(e: any) {
    e.preventDefault();

    await createProduct({
      name,
      price: Number(price),
      description,
    });


    alert("Produto criado com sucesso!");
    navigate("/produtos");
  }
  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-md">
      <h1 className="text-xl font-bold mb-4">Novo Produto</h1>

      <input
        placeholder="Nome"
        onChange={(e) => setName(e.target.value)}
      />

      <input
        placeholder="Preço"
        onChange={(e) => setPrice(e.target.value)}
        />

      <textarea
        placeholder="Descrição"
        onChange={(e) => setDescription(e.target.value)}
      />

      <button className="bg-black text-white px-4 py-2 rounded">
        Salvar
        </button>
      </form>  
    );
}
