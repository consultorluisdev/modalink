import { Menu, Bell, User, Search } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface TopBarProps {
    onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
    const { user } = useAuth();

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <button onClick={onMenuClick}
                    className="lg:hidden text-gray-500 hover:text-gray-700"
                >
                    <Menu size={20} />
                </button>
                <div className="hidden lg:flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <span className="font-bold text-lg text-indigo-600">ModaLink</span>
                </div>
                {/* search */}
                <div className="hidden md:flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 w-80">
                    <Search size={18} className="text-gray-400" />
                    <input type="text"
                        placeholder="Buscar produtos, pedidos..."
                        className="bg-transparent outline-none text-sm flex-1"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button className="p-2 text-gray-500 hover:text-gray-700 relative">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
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