import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { ReactNode } from "react";

interface PrivateRouteProps {
  children: ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps){
  const { isAuthenticated } = useAuth();

  if(!isAuthenticated){
    return <Navigate to="/login" />
  }

  return <>{children}</>;
}