import { useAuth } from "../hooks/useAuth";

export default function Dashboard(){
  const { user } = useAuth();

  return(
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Bem vindo, {user?.name} 👋 Dashboard
      </h1>
      <p className="text-gray-500 mb-6">
        Aqui está a resumo de sua loja
      </p>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-gray-500">Produtos</h2>
          <p className="text-xl font-bold">0</p>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white shadow rounded-xl p-4">
          <h2 className="text-sm text-gray-500">Clientes</h2>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>

    </div>

  );
}