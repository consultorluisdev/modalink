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
  { path: "/catalogo", label: "Catálogo", icon: Store },
  { path: "/pedidos", label: "Pedidos", icon: ShoppingCart },
  { path: "/clientes", label: "Clientes", icon: Users },
  { path: "/financeiro", label: "Financeiro", icon: DollarSign },
  { path: "/ia-vendas", label: "IA de Vendas", icon: Bot },
  { path: "/configuracoes", label: "Configurações", icon: Settings },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3 },
]

export default function SideBar({ isOpen, setIsOpen, collapsed, onToggleCollapse }: SideBarProps) {
  const { logout } = useAuth();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30
        ${collapsed ? 'w-20' : 'w-64'} bg-gray-950 border-r border-gray-800
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800 shrink-0">
            <div className={`flex items-center ${collapsed ? 'justify-center w-full' : 'gap-2'}`}>
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              {!collapsed && <span className="font-bold text-xl text-white">ModaLink</span>}
            </div>
            <button onClick={() => setIsOpen(false)} className="lg:hidden text-gray-500 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <NavLink
                to={item.path}
                key={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `
                  flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 ${collapsed ? 'rounded-full w-12 h-12 mx-auto' : 'rounded-lg'} text-sm font-medium
                    transition-colors duration-200
                    ${isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  }
                  `}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="p-3 border-t border-gray-800 shrink-0 space-y-2">
            <button
              onClick={onToggleCollapse}
              className={`hidden lg:flex items-center ${collapsed ? 'justify-center mx-auto' : 'gap-3'} px-3 py-2 rounded-full text-sm font-medium text-gray-500 hover:bg-white/10 hover:text-white w-full transition-colors`}
            >
              {collapsed ? <ChevronRight size={20} /> : <><ChevronLeft size={20} /> Recolher</>}
            </button>
            <button
              onClick={logout}
              className={`flex items-center ${collapsed ? 'justify-center mx-auto w-12 h-12' : 'gap-3'} px-3 py-2.5 rounded-full text-sm font-medium text-red-400 hover:bg-red-600 hover:text-white w-full transition-colors`}
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
