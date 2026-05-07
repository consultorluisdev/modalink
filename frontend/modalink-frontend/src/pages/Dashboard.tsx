import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingBag, 
  Users, 
  Package,
  Eye,
} from 'lucide-react';

export function Dashboard() {
  const stats = [
    { 
      title: 'Vendas (mês)', 
      value: 'R$ 24.680,00', 
      change: '+12,5%', 
      trend: 'up',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    { 
      title: 'Total de Pedidos', 
      value: '128', 
      change: '+8%', 
      trend: 'up',
      icon: ShoppingBag,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    { 
      title: 'Clientes', 
      value: '342', 
      change: '+5,2%', 
      trend: 'up',
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    { 
      title: 'Produtos', 
      value: '56', 
      change: '-2%', 
      trend: 'down',
      icon: Package,
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    },
  ];

  const topProducts = [
    { name: 'Vestido Preto Elegante', sales: 45, price: 'R$ 129,90', image: 'https://picsum.photos/40/40?random=1' },
    { name: 'Blusa Manga Longa', sales: 38, price: 'R$ 79,90', image: 'https://picsum.photos/40/40?random=2' },
    { name: 'Calça Jeans Wide Leg', sales: 32, price: 'R$ 189,90', image: 'https://picsum.photos/40/40?random=3' },
    { name: 'Jaqueta Puffer', sales: 28, price: 'R$ 299,90', image: 'https://picsum.photos/40/40?random=4' },
    { name: 'Saia Midi Plissada', sales: 25, price: 'R$ 149,90', image: 'https://picsum.photos/40/40?random=5' },
  ];

  const recentOrders = [
    { id: '#1024', customer: 'Maria Silva', amount: 'R$ 199,90', status: 'Entregue' },
    { id: '#1023', customer: 'João Santos', amount: 'R$ 159,90', status: 'Processando' },
    { id: '#1022', customer: 'Ana Costa', amount: 'R$ 299,90', status: 'Enviado' },
    { id: '#1021', customer: 'Carlos Lima', amount: 'R$ 89,90', status: 'Pendente' },
    { id: '#1020', customer: 'Juliana Alves', amount: 'R$ 189,90', status: 'Entregue' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Aqui está o resumo da sua loja</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  {stat.trend === 'up' ? (
                    <TrendingUp size={14} className="text-green-500" />
                  ) : (
                    <TrendingDown size={14} className="text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-gray-400">vs mês anterior</span>
                </div>
              </div>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Top Products Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">Vendas - Últimos 30 dias</h3>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5">
              <option>Este mês</option>
              <option>Último mês</option>
              <option>Último ano</option>
            </select>
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-400 text-base">Gráfico de vendas será integrado aqui</p>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">Produtos mais vendidos</h3>
            <button className="text-sm text-indigo-600 hover:text-indigo-700">Ver todos</button>
          </div>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center gap-3">
                <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{product.name}</p>
                  <p className="text-xs text-gray-400">{product.sales} vendas</p>
                </div>
                <p className="text-sm font-semibold text-gray-800">{product.price}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders and AI Chat Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Pedidos recentes</h3>
            <button className="text-xs text-indigo-600 hover:text-indigo-700">Ver todos</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">ID</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Cliente</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Valor</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">{order.id}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{order.customer}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-800">{order.amount}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.status === 'Entregue' ? 'bg-green-100 text-green-700' :
                        order.status === 'Processando' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'Enviado' ? 'bg-purple-100 text-purple-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button className="text-gray-400 hover:text-gray-600">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Chat */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-[420px]">
          <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <h3 className="text-sm font-semibold text-gray-800">Assistente de Vendas IA</h3>
            <p className="text-sm text-gray-500 mt-0.5">Atendimento 24/7</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-600 text-xs font-bold">AI</span>
              </div>
              <div className="bg-gray-100 rounded-xl rounded-tl-none px-3 py-2 max-w-[80%]">
                <p className="text-sm text-gray-700">Olá! Como posso ajudar você hoje?</p>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end">
              <div className="bg-indigo-600 rounded-xl rounded-tr-none px-3 py-2 max-w-[80%]">
                <p className="text-sm text-white">Vocês têm vestido preto para festa?</p>
              </div>
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">VC</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-600 text-xs font-bold">AI</span>
              </div>
              <div className="bg-gray-100 rounded-xl rounded-tl-none px-3 py-2 max-w-[80%]">
                <p className="text-sm text-gray-700">Sim! Temos o Vestido Preto Elegante no nosso catálogo. Gostaria de ver?</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Digite sua mensagem..." 
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-5 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-xl mb-2">Compartilhe sua loja</h3>
            <p className="text-indigo-100 text-sm mb-4">Compartilhe sua loja de forma fácil escaneando o QR Code</p>
            <button className="px-4 py-2 bg-white text-indigo-600 rounded-lg text-sm font-medium hover:bg-gray-100">
              Compartilhar
            </button>
          </div>
          <div className="bg-white p-3 rounded-xl">
            <div className="w-24 h-24 bg-gray-800 rounded flex items-center justify-center">
              <span className="text-white text-xs text-center">QR Code<br/>da loja</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}