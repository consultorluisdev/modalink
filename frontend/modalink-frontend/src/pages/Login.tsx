import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";


const Login: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const { login } = useAuth();
    const navigate = useNavigate();
    

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await api.post("/auth/login", { email, password });
            const { token, user } = response.data;

            login(token, user);
            navigate("/dashboard", { replace: true });
        } catch (err: any) {
            const erroMessage = err.response?.data?.message || "Erro ao fazer login";
            setError(erroMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-lg">
                {/* HEADER */}
                <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-indigo-600">ModaLink</h1>
                    <p className="mt-1 text-sm text-gray-500">Acesse o Sistema</p>
                </div>
                {/* FORM */}
                <form className="space-y-5" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    {/* EMAIL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg
                            focus:ring-2 focus:ring-black focus:border-black outline-none transition"
                        />
                    </div>
                    {/* PASSWORD */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Senha
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="******"
                            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg
                            focus:ring-2 focus:ring-black focus:border-black outline-none transition"
                        />
                    </div>
                    {/* BUTTON */}
                    <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-4 rounded-lg text-sm font-medium text-white
                    bg-black hover:bg-gray-800 transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                    {loading ? "Carregando..." : "Entrar"}
                    </button>
                    {/* REGISTRAR */}
                    <div className="text-center">
                        <Link
                        to="/register"
                        className="text-sm text-gray-600 hover:text-black transition"
                        >
                            Não tem uma conta? Registre-se
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Login;
