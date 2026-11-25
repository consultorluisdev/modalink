import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import type { AxiosError } from "axios";

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
        } catch (err: unknown) {
            const axiosError = err as AxiosError<{ message: string }>;
            setError(axiosError.response?.data?.message || "Erro ao cadastrar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#faf8fc] px-4 py-8">
            <div className="w-full max-w-md space-y-8 rounded-3xl border border-purple-100 bg-white p-6 shadow-[0_24px_70px_rgba(47,20,68,0.12)] sm:p-8">
                {/* HEADER */}
                <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a52bea] to-[#542080] shadow-lg shadow-purple-900/20">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-[#542080]">ModaLink</h1>
                    <p className="mt-1 text-sm text-gray-500">Crie sua conta</p>
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
                        className="w-full rounded-xl bg-gradient-to-r from-[#8b28cc] to-[#542080] px-4 py-3 text-sm font-bold text-white shadow-md shadow-purple-900/15 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110
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