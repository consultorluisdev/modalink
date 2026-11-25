import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, LogOut, Menu, Settings, User, Sparkles } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

interface TopBarProps {
    onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
    const { user, logout } = useAuth();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const profileButtonRef = useRef<HTMLButtonElement>(null);
    const historyIndex = (window.history.state as { idx?: unknown } | null)?.idx;
    const hasPreviousPage = typeof historyIndex === "number" && historyIndex > 0;
    const canGoBack = hasPreviousPage || pathname !== "/dashboard";
    const displayName = user?.name || user?.email?.split("@")[0] || "Usuário";
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

    useEffect(() => {
        if (!profileMenuOpen) return;

        function handlePointerDown(event: PointerEvent) {
            if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target)) {
                setProfileMenuOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setProfileMenuOpen(false);
                profileButtonRef.current?.focus();
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [profileMenuOpen]);

    function openSettings() {
        setProfileMenuOpen(false);
        navigate("/configuracoes");
    }

    function handleLogout() {
        setProfileMenuOpen(false);
        logout();
        navigate("/login", { replace: true });
    }

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
                <div className="relative border-l border-gray-200 pl-3" ref={profileMenuRef}>
                    <button
                        ref={profileButtonRef}
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={profileMenuOpen}
                        aria-controls="profile-menu"
                        aria-label={`Menu do perfil de ${displayName}`}
                        onClick={() => setProfileMenuOpen((isOpen) => !isOpen)}
                        className="flex min-h-10 items-center gap-2 rounded-xl px-1.5 py-1 text-left transition hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                    >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-fuchsia-100 ring-2 ring-white shadow-sm">
                            <User size={16} className="text-indigo-600" />
                        </span>
                        <span className="hidden max-w-36 sm:block">
                            <span className="block truncate text-sm font-medium text-gray-700">{displayName}</span>
                            <span className="block truncate text-[11px] text-slate-400">{user?.role || "Perfil"}</span>
                        </span>
                        <ChevronDown
                            size={15}
                            aria-hidden="true"
                            className={`hidden text-slate-400 transition-transform sm:block ${profileMenuOpen ? "rotate-180" : ""}`}
                        />
                    </button>

                    {profileMenuOpen && (
                        <div
                            id="profile-menu"
                            role="menu"
                            aria-label="Menu do perfil"
                            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-purple-100 bg-white py-2 shadow-xl shadow-purple-950/10"
                        >
                            <div className="border-b border-purple-50 px-4 py-3">
                                <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                                {user?.email && <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>}
                                <span className="mt-2 inline-flex rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-800">
                                    {user?.role || "Perfil"}
                                </span>
                            </div>
                            <button
                                type="button"
                                role="menuitem"
                                onClick={openSettings}
                                className="flex min-h-11 w-full items-center gap-3 px-4 text-sm text-slate-700 transition hover:bg-purple-50 hover:text-purple-800"
                            >
                                <Settings size={17} />
                                Configurações
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                onClick={handleLogout}
                                className="flex min-h-11 w-full items-center gap-3 px-4 text-sm text-rose-700 transition hover:bg-rose-50"
                            >
                                <LogOut size={17} />
                                Sair da conta
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </header>
    )
}
