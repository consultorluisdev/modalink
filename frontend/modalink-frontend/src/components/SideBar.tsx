import { Link } from "react-router-dom";

export default function SideBar(){
  return(
    <div className="w-60 h-full bg-black text-white p-4">
      <h1 className="text-lg mb-6 font-bold">ModaLink</h1>

      <nav className="flex flex-col gap-3">
        <Link to="/dashboard" className="flex items-center gap-2">Dashboard</Link>
        <Link to="/produtos" className="flex items-center gap-2">Produtos</Link>
      </nav>
    </div>
  )
}