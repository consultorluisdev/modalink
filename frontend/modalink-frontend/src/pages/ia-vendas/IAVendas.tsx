import { useState } from "react";
import {
  Bot, Send, TrendingUp, Sparkles, BarChart3,
  ShoppingCart, Users, Package, Target, Zap, MessageSquare,
  DollarSign, Activity
} from "lucide-react";

interface Message {
  role: "ai" | "user";
  text: string;
}

const mockResponses: Record<string, string> = {
  "quais produtos mais vendem?":
    "📊 **TOP 3 Produtos mais vendidos esse mês:**\n\n1️⃣ **Vestido Preto Elegante** — R$ 129,90 (45 vendas)\n2️⃣ **Blusa Manga Longa** — R$ 79,90 (38 vendas)\n3️⃣ **Calça Jeans Wide Leg** — R$ 189,90 (32 vendas)\n\n💡 *Dica: O Vestido Preto está com estoque baixo, recomendo repor!*",
  "me dê dicas para aumentar vendas":
    "🚀 **3 dicas rápidas para aumentar suas vendas:**\n\n1️⃣ **Produtos em destaque** — Crie promoções relâmpago nos itens parados\n2️⃣ **Atendimento via WhatsApp** — Ofereça suporte direto, aumenta conversão em 40%\n3️⃣ **Fidelidade** — Clientes que compram mais de 3x representam 60% do faturamento\n\n📈 *Quer que eu detalhe alguma dessas estratégias?*",
  "analise meu desempenho esse mês":
    "📈 **Desempenho do Mês:**\n\n• **Faturamento:** R$ 24.680,00 📊\n• **Pedidos:** 128 🛍️\n• **Ticket Médio:** R$ 192,81 💰\n• **Produtos Vendidos:** 342 📦\n\n✅ *Comparado ao mês passado, você teve um crescimento de 12,5%!*",
  "qual cliente compra mais?":
    "🏆 **Ranking de Clientes:**\n\n1️⃣ **Maria Silva** — R$ 1.249,50 (5 pedidos)\n2️⃣ **João Santos** — R$ 879,90 (3 pedidos)\n3️⃣ **Ana Costa** — R$ 2.340,00 (8 pedidos)\n\n💡 *Ana Costa é sua melhor cliente! Que tal enviar um desconto fidelidade para ela?*",
  "gerar relatório de vendas":
    "📄 **Relatório de Vendas — Maio 2026**\n\n• **Faturamento Total:** R$ 24.680,00\n• **Total de Pedidos:** 128\n• **Produtos Vendidos:** 342\n• **Clientes Atendidos:** 89\n• **Taxa de Conversão:** 68%\n\n📎 *Relatório gerado com sucesso! Você pode exportar em PDF ou CSV.*",
  "estoque baixo":
    "⚠️ **Produtos com Estoque Baixo:**\n\n1️⃣ **Vestido Preto Elegante** — 3 unidades\n2️⃣ **Jaqueta Puffer** — 2 unidades\n3️⃣ **Saia Midi Plissada** — 5 unidades\n\n🔄 *Sugiro fazer um pedido ao fornecedor esta semana!*",
  "metas do mês":
    "🎯 **Metas do Mês:**\n\n• **Meta de Vendas:** R$ 30.000 — 🟡 82% atingido\n• **Meta de Pedidos:** 150 — 🟢 85% atingido\n• **Meta de Clientes:** 100 — 🟡 89% atingido\n\n💪 *Falta pouco! Com mais alguns dias dá pra bater todas as metas!*",
};

const defaultMessage: Message = {
  role: "ai",
  text: "Olá! 👋 Sou o assistente de vendas da **ModaLink**. Pergunte sobre produtos, vendas, clientes ou peça dicas para aumentar seus resultados!",
};

const quickActions = [
  {
    label: "Produtos Top",
    question: "Quais produtos mais vendem?",
    icon: Package,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Dicas Vendas",
    question: "Me dê dicas para aumentar vendas",
    icon: Zap,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
  },
  {
    label: "Desempenho",
    question: "Analise meu desempenho esse mês",
    icon: Activity,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    label: "Top Clientes",
    question: "Qual cliente compra mais?",
    icon: Users,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    label: "Relatórios",
    question: "Gerar relatório de vendas",
    icon: BarChart3,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    label: "Estoque Baixo",
    question: "Estoque baixo",
    icon: ShoppingCart,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    label: "Metas",
    question: "Metas do mês",
    icon: Target,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    label: "Fidelidade",
    question: "Me dê dicas para aumentar vendas",
    icon: MessageSquare,
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
];

export default function IAVendas() {
  const [messages, setMessages] = useState<Message[]>([defaultMessage]);
  const [input, setInput] = useState("");

  function getReply(text: string): string {
    const key = text.toLowerCase().trim();
    const allKeys = Object.keys(mockResponses);
    const match = allKeys.find((k) => key.includes(k)) ||
                  allKeys.find((k) => k.split(" ").some((w) => key.includes(w)));
    return match ? mockResponses[match] : "🤔 Entendi! Ainda estou aprendendo. Tente perguntar sobre:\n\n• Produtos mais vendidos\n• Dicas para aumentar vendas\n• Desempenho do mês\n• Clientes\n• Estoque\n• Metas";
  }

  function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg) return;

    const userMsg: Message = { role: "user", text: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setTimeout(() => {
      const aiMsg: Message = { role: "ai", text: getReply(msg) };
      setMessages((prev) => [...prev, aiMsg]);
    }, 600);
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">IA de Vendas</h1>
        <p className="text-gray-500 text-sm mt-1">Assistente inteligente para impulsionar suas vendas</p>
      </div>

      <div className="flex-1 grid grid-cols-5 gap-4 min-h-0">
        <div className="col-span-3 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden min-h-0">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Assistente ModaLink</h3>
              <p className="text-xs text-indigo-200">Online • IA treinada com dados da sua loja</p>
            </div>
            <Sparkles size={18} className="text-yellow-300 ml-auto" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "ai" && (
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={16} className="text-indigo-600" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-xl px-4 py-3 whitespace-pre-line leading-relaxed ${
                  msg.role === "ai"
                    ? "bg-gray-50 text-gray-700 rounded-tl-none text-sm"
                    : "bg-indigo-600 text-white rounded-tr-none text-sm"
                }`}>
                  {msg.text}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs font-bold">V</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-200 shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Digite sua mensagem..."
                className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => handleSend()}
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="col-span-2 flex flex-col gap-3 overflow-y-auto shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Ações Rápidas</h3>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(action.question)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl ${action.bg} hover:shadow transition-all`}
                >
                  <action.icon size={18} className={action.color} />
                  <span className="text-xs font-medium text-gray-700 text-center leading-tight">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Métricas</h3>
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-3 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-indigo-200">Vendas (mês)</p>
                    <p className="text-lg font-bold">R$ 24.680</p>
                  </div>
                  <DollarSign size={24} className="opacity-60" />
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp size={12} className="text-green-300" />
                  <span className="text-xs text-green-200">+12,5%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-3 text-white">
                  <ShoppingCart size={16} className="opacity-60 mb-1" />
                  <p className="text-sm font-bold">128</p>
                  <p className="text-xs text-purple-200">Pedidos</p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-3 text-white">
                  <Users size={16} className="opacity-60 mb-1" />
                  <p className="text-sm font-bold">89</p>
                  <p className="text-xs text-green-200">Clientes</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-3 text-white">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-amber-200">Meta do mês</p>
                  <p className="text-sm font-bold">82%</p>
                </div>
                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: "82%" }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
