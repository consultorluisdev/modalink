import { createContext, useState } from "react";
import type { ReactNode } from "react";

const TOKEN_KEY = "token";
const USER_KEY = "user";

export interface User{
    id: string;
    name: string;
    email: string;
}

interface AuthContextType {
    token: string | null,
    user: User | null;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | null>(null);

export function  AuthProvider({ children }: { children: ReactNode }){
    const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState<User | null>(() => {
        try {
            const u = localStorage.getItem(USER_KEY);
            return u ? JSON.parse(u) : null;
        } catch {
            return null;
        }
    });
    const isAuthenticated = Boolean(token);

    function login(token: string, user: User) {
        setToken(token);
        setUser(user);
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    function logout(){
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }
    return(
        <AuthContext.Provider value={{ token, user, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
