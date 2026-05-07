import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Login from "../pages/Login";
import { Register } from "../pages/Register";
import { Dashboard } from "../pages/Dashboard";
import PrivateRoute from "../components/PrivateRoute";
import Products from "../pages/Products";
import CreateProduct from "../pages/CreateProduct";
import MainLayout from "../layouts/MainLayout";

// Componente para rotas protegidas com layout
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
        {/* Rotas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rotas protegidas */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/produtos" element={<Products />} />
          <Route path="/produtos/novo" element={<CreateProduct />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}