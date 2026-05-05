import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Register() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    async function handleRegister(e: any){
        e.preventDefault();

        try{
            await api.post("/auth/register", {
                email,
                password,
            });

            alert("conta criada!")
            navigate("/login")
        }catch (err: any){
            alert(err.response?.data || "Erro ao registrar");
        }
    }
    return(
        <form onSubmit={handleRegister}>
            <h1>Register</h1>

            <input placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
        />

        <input type="password"
        placeholder="senha"
        onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Criar conta</button>

    </form>
    );
    
}