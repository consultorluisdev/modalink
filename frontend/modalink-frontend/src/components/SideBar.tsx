import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function SideBar(){
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  function handleLogout(){
    logout();
    navigate("/login");
  }


  return(
    <div className="w-64 h-screen bg-black  shadow-lg flex flex-col justify-between p-6">
      <div>
      <h1 className="text-lg mb-8 font-bold">ModaLink</h1>

      <nav className="flex flex-col gap-2">
        <a href="/dashboard" className="p-2 rounded hover:bg-gray-100">
            Dashboard
          </a>

          <a href="/produtos" className="p-2 rounded hover:bg-gray-100">
            Produtos
          </a>
      </nav>
      </div>
    

      <button
        onClick={handleLogout}
        className="p-2 rounded bg-red-500 text-white hover:bg-red-600 transition"
      >
        Sair
      </button>
    </div>
  );
}