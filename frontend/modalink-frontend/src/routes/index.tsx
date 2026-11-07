import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
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
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import type { AxiosError } from "axios";

const ProtectedLayout = () => (
  <PrivateRoute>
    <MainLayout>
      <Outlet />
    </MainLayout>
  </PrivateRoute>
);

function LoginRoute() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(email: string, password: string) {
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", { email, password });
      const authenticatedUser = response.data.user;

      login(response.data.token, {
        id: authenticatedUser.id,
        name: authenticatedUser.name,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        isActive: authenticatedUser.isActive ?? true,
      });
      navigate("/dashboard", { replace: true });
    } catch (requestError: unknown) {
      const axiosError = requestError as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? "Email ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Login
      onLogin={handleLogin}
      onRegister={() => navigate("/register")}
      loading={loading}
      error={error}
    />
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
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
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
