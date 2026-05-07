import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

export const Register: React.FC = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if(password !== confirmPassword){
            setError("As senhas não conferem");
            return;
        }

        if(password.length < 6){
            setError("A senha deve ter no mínimo 6 caracteres");
            return;
        }
        setLoading(true);
        setError("");


        try {
            await api.post("/auth/register", { name, email, password });
            navigate("/login", { 
            replace: true,
            state: {message: "Cadastro realizado com sucesso! Faça login."}
           });
        } catch (err: any) {
            const erroMessage = err.response?.data?.message || "Erro ao cadastrar";
            setError(erroMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-lg">
                {/* HEADER */}
                <div>
                    <h2 className="text-center text-4xl font-bold text-gray-900">
                        ModaLink
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-500">
                        Crie sua conta
                    </p>
                </div>
                {/* FORM */}
                <form className="space-y-5" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    {/* Nome */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Nome
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Seu nome"
                            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg
                            focus:ring-2 focus:ring-black focus:border-black outline-none transition"
                        />
                    </div>
                    {/* Email */}
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
                    {/* Senha */}

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
                    {/* Confirmar Senha */}
                     <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Confirmar Senha
                        </label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                        {loading ? "Carregando..." : "Cadastrar"}
                    </button>

                    {/* Login link */}
                    <div className="text-center">
                        <Link
                            to="/login"
                            className="text-sm text-gray-600 hover:text-black transition"
                        >
                            Já tem uma conta? Faça login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );

}