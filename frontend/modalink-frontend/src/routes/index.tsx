import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import PrivateRoute from "../components/PrivateRoute";
import Products from "../pages/Products";
import CreateProduct from "../pages/CreateProduct";
import MainLayout from "../layouts/MainLayout";



export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </PrivateRoute>
        }
        />
         <Route
        path="/produtos"
        element={
          <PrivateRoute>
            <MainLayout>
              <Products />
            </MainLayout>
          </PrivateRoute>
        }
        />
         <Route
        path="/produtos/novo"
        element={
          <PrivateRoute>
            <MainLayout>
              <CreateProduct />
            </MainLayout>
          </PrivateRoute>
        }
        />
        
      </Routes>
    </BrowserRouter>
  );
}