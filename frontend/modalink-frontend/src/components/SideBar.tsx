
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
  LogOut
} from 'lucide-react';


interface SiderBarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const menuItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/produtos", label: "Produtos", icon: Package },
  { path: "/pedidos", label: "Pedidos", icon: ShoppingCart },
  { path: "/clientes", label: "Clientes", icon: Users },
  { path: "/configuracoes", label: "Configurações", icon: Settings },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3 },
]

export default function SideBar({ isOpen, setIsOpen }: SiderBarProps) {
  const { logout } = useAuth();

  return (
    <>
      { /* mobile overlay*/}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      {/* sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-gray-950 border-r border-gray-800
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
        <div className="flex flex-col h-full">
          {/* Logo + mobile close */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">ML</span>
              </div>
              <span className="font-bold text-xl text-white">ModaLink</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="lg:hidden text-gray-500 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* menu */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <NavLink
                to={item.path}
                key={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium
                    transition-colors duration-200
                    ${isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  }
                  `}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-800 shrink-0">
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-600/20 hover:text-red-300 w-full transition-colors"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
