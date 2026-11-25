import { useAuth } from "../hooks/useAuth";
import { NavLink } from "react-router-dom";

import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  BarChart3,
  X,
  LogOut,
  PlusCircle,
  Bot,
  ChevronLeft,
  ChevronRight,
  Store,
  DollarSign,
  Banknote,
} from 'lucide-react';

interface SideBarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const menuItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/vendas/nova", label: "PDV", icon: PlusCircle },
  { path: "/produtos", label: "Estoque", icon: Package },
  { path: "/gestor-loja-online", label: "Gestor da Loja On-line", icon: Store },
  { path: "/loja-online", label: "Loja Online", icon: Store },
  { path: "/pedidos", label: "Pedidos", icon: ShoppingCart },
  { path: "/clientes", label: "Clientes", icon: Users },
  { path: "/financeiro", label: "Financeiro", icon: DollarSign },
  { path: "/caixa", label: "Caixa", icon: Banknote },
  { path: "/ia-vendas", label: "IA de Vendas", icon: Bot },
  { path: "/configuracoes", label: "Configurações", icon: Settings },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3 },
]

export default function SideBar({ isOpen, setIsOpen, collapsed, onToggleCollapse }: SideBarProps) {
  const { logout } = useAuth();

  return (
    <>
      {isOpen && (
        <button aria-label="Fechar menu" className="fixed inset-0 z-20 bg-[#1d1028]/55 backdrop-blur-[2px] lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30
        ${collapsed ? 'w-20' : 'w-64'} bg-[#29113d] border-r border-white/[0.08] shadow-[12px_0_32px_rgba(33,14,48,0.08)] lg:shadow-none
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.08] shrink-0">
            <div className={`flex items-center ${collapsed ? 'justify-center w-full' : 'gap-2'}`}>
              <div className="w-8 h-8 bg-gradient-to-br from-[#a52bea] to-[#7628bd] rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              {!collapsed && <div>
                <span className="block font-bold text-lg leading-5 tracking-tight text-white">ModaLink</span>
                <span className="block text-[10px] tracking-wide text-purple-200/65">GESTÃO PARA MODA</span>
              </div>}
            </div>
            <button onClick={() => setIsOpen(false)} className="lg:hidden text-gray-500 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {!collapsed && <p className="px-5 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-purple-200/45">Menu principal</p>}
          <nav className={`flex-1 px-3 ${collapsed ? "py-4" : "pb-4"} space-y-1 overflow-y-auto`}>
            {menuItems.map((item) => (
              <NavLink
                to={item.path}
                key={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `
                  flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 ${collapsed ? 'rounded-full w-12 h-12 mx-auto' : 'rounded-lg'} text-sm font-medium
                    transition-colors duration-200
                    ${isActive
                    ? 'bg-gradient-to-r from-[#8b28cc] to-[#7022ad] text-white shadow-[0_5px_16px_rgba(147,51,234,0.22)]'
                    : 'text-purple-100/65 hover:bg-white/[0.08] hover:text-white'
                  }
                  `}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="p-3 border-t border-white/[0.08] shrink-0 space-y-2">
            <button
              onClick={onToggleCollapse}
              className={`hidden lg:flex items-center ${collapsed ? 'justify-center mx-auto' : 'gap-3'} px-3 py-2 rounded-xl text-sm font-medium text-purple-100/55 hover:bg-white/[0.08] hover:text-white w-full transition-colors`}
            >
              {collapsed ? <ChevronRight size={20} /> : <><ChevronLeft size={20} /> Recolher</>}
            </button>
            <button
              onClick={logout}
              className={`flex items-center ${collapsed ? 'justify-center mx-auto w-12 h-12' : 'gap-3'} px-3 py-2.5 rounded-xl text-sm font-medium text-rose-300/80 hover:bg-rose-500/15 hover:text-rose-200 w-full transition-colors`}
              title={collapsed ? "Sair" : undefined}
            >
              <LogOut size={20} className="shrink-0" />
              {!collapsed && <span>Sair</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
