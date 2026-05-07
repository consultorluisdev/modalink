import { createContext, useState, useEffect } from "react";
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

export const AuthContext = createContext<AuthContextType | null>(null);

export function  AuthProvider({ children }: { children: ReactNode }){
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const isAuthenticated = Boolean(token);

    useEffect(() => {
        const t = localStorage.getItem(TOKEN_KEY);
        if(t) setToken(t);

        const u = localStorage.getItem(USER_KEY);
        if(u) setUser(JSON.parse(u));
    }, []);

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
