import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Login from "../pages/Login";
import { Register } from "../pages/Register";
import { Dashboard } from "../pages/Dashboard";
import PrivateRoute from "../components/PrivateRoute";
import Products from "../pages/Products";
import CreateProduct from "../pages/CreateProduct";
import { Orders } from "../pages/orders/Orders";
import NovaVenda from "../pages/vendas/NovaVenda";
import Clientes from "../pages/clientes/Clientes";
import IAVendas from "../pages/ia-vendas/IAVendas";
import Catalogo from "../pages/catalogo/Catalogo";
import Financeiro from "../pages/financeiro/Financeiro";
import MainLayout from "../layouts/MainLayout";

const ProtectedLayout = () => (
  <PrivateRoute>
    <MainLayout>
      <Outlet />
    </MainLayout>
  </PrivateRoute>
);

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/produtos" element={<Products />} />
          <Route path="/produtos/novo" element={<CreateProduct />} />
          <Route path="/pedidos" element={<Orders />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/vendas/nova" element={<NovaVenda />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/ia-vendas" element={<IAVendas />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
