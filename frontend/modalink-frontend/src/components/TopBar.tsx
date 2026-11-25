import { ArrowLeft, Menu, User, Sparkles } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

interface TopBarProps {
    onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
    const { user } = useAuth();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const historyIndex = (window.history.state as { idx?: unknown } | null)?.idx;
    const hasPreviousPage = typeof historyIndex === "number" && historyIndex > 0;
    const canGoBack = hasPreviousPage || pathname !== "/dashboard";
    const currentPage = [
        ["/dashboard", "Dashboard"],
        ["/vendas/nova", "Ponto de venda"],
        ["/produtos", "Estoque"],
        ["/gestor-loja-online", "Gestor da loja"],
        ["/loja-online", "Loja online"],
        ["/pedidos", "Pedidos"],
        ["/clientes", "Clientes"],
        ["/financeiro", "Financeiro"],
        ["/caixa", "Caixa"],
        ["/ia-vendas", "IA de vendas"],
        ["/configuracoes", "Configurações"],
        ["/relatorios", "Relatórios"],
    ].find(([path]) => pathname === path)?.[1] ?? "ModaLink";

    return (
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-purple-100 bg-white/95 px-4 shadow-[0_2px_12px_rgba(47,20,68,0.04)] backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                <button onClick={onMenuClick}
                    aria-label="Abrir menu"
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-purple-50 hover:text-indigo-700 lg:hidden"
                >
                    <Menu size={20} />
                </button>
                <button
                    type="button"
                    onClick={() => hasPreviousPage ? navigate(-1) : navigate("/dashboard", { replace: true })}
                    disabled={!canGoBack}
                    aria-label="Voltar à página anterior"
                    title={hasPreviousPage ? "Voltar à página anterior" : "Início do ERP"}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-purple-100 bg-white text-slate-500 transition hover:border-purple-200 hover:bg-purple-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="hidden lg:flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#a52bea] to-[#7628bd] rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <span className="font-bold text-lg text-[#542080]">ModaLink</span>
                </div>
                <div className="hidden h-9 w-px bg-purple-100 lg:block" />
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#321647] sm:text-[15px]">{currentPage}</p>
                    <p className="hidden text-[11px] text-slate-400 sm:block">Gestão da sua loja em um só lugar</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <span className="hidden items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-[11px] font-semibold text-[#7628bd] sm:flex">
                    <Sparkles size={13} /> ModaLink Pro
                </span>
                <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-fuchsia-100 ring-2 ring-white shadow-sm">
                        <User size={16} className="text-indigo-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 hidden sm:block">
                        {user?.name || user?.email?.split('@')[0] || 'Usuário'}
                    </span>
                </div>

            </div>
        </header>
    )
}