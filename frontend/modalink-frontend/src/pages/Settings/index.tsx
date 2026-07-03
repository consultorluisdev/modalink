import React, { FormEvent, ChangeEvent, useState, useEffect } from "react";
import { Store, User, Lock, Save, Eye, EyeOff, Key } from "lucide-react";
import { settingsService } from "../../services/settingsService";

type TabType = "store" | "user" | "password";
type PerfilUsuario = "Administrador" | "Vendedor" | "Operador";

interface StoreData {
  nome: string;
  telefone: string;
  endereco: string;
}

interface UserData {
  id: number;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
}

interface PasswordData {
  senhaAtual: string;
  novaSenha: string;
  confirmarSenha: string;
}

interface NovoUsuarioForm {
  nome: string;
  email: string;
  perfil: PerfilUsuario;
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("store");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [storeData, setStoreData] = useState<StoreData>({
    nome: "",
    telefone: "",
    endereco: "",
  });

  const [users, setUsers] = useState<UserData[]>([]);
  const [newUserPassword, setNewUserPassword] = useState("");

  const [newUser, setNewUser] = useState<NovoUsuarioForm>({
    nome: "",
    email: "",
    perfil: "Vendedor",
  });

  const [passwordData, setPasswordData] = useState<PasswordData>({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
  });

  const loadUsers = async () => {
    try {
      const data = await settingsService.getUsers();
      setUsers(data.map((u) => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        perfil: u.role as PerfilUsuario,
        ativo: u.isActive,
      })));
    } catch {
      console.error("Erro ao carregar usuarios");
    }
  };

  useEffect(() => {
    settingsService.getStore().then((data) => {
      setStoreData({
        nome: data.storeName,
        telefone: data.phone,
        endereco: data.address,
      });
    }).catch(() => {});
    loadUsers();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(""), 3000);
  };

  const handleStoreSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await settingsService.updateStore({
        storeName: storeData.nome,
        phone: storeData.telefone,
        address: storeData.endereco,
      });
      showSuccess("Dados da loja atualizados com sucesso!");
    } catch {
      showError("Erro ao salvar dados da loja");
    }
  };

  const handleStoreChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setStoreData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleAddUser = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      await settingsService.createUser({
        nome: newUser.nome,
        email: newUser.email,
        role: newUser.perfil,
        password: newUserPassword,
      });
      showSuccess(`Usuario ${newUser.nome} adicionado com sucesso!`);
      setNewUser({ nome: "", email: "", perfil: "Vendedor" });
      setNewUserPassword("");
      loadUsers();
    } catch {
      showError("Erro ao adicionar usuario");
    }
  };

  const toggleUserStatus = async (id: number): Promise<void> => {
    try {
      await settingsService.toggleUserActive(id);
      loadUsers();
    } catch {
      showError("Erro ao alterar status do usuario");
    }
  };

  const handlePasswordChange = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (passwordData.novaSenha !== passwordData.confirmarSenha) {
      showError("As senhas nao coincidem!");
      return;
    }
    try {
      await settingsService.changePassword(passwordData.senhaAtual, passwordData.novaSenha);
      showSuccess("Senha alterada com sucesso!");
      setPasswordData({ senhaAtual: "", novaSenha: "", confirmarSenha: "" });
    } catch {
      showError("Erro ao alterar senha. Verifique a senha atual.");
    }
  };

  const handlePasswordInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTabChange = (tab: TabType): void => {
    setActiveTab(tab);
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Store className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Configuracoes</h1>
          <p className="text-sm text-gray-500">
            Gerencie as configuracoes da sua loja, usuarios e senha.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-16 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-2 border-b mb-6">
        <button
          onClick={() => handleTabChange("store")}
          className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            activeTab === "store"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Loja
        </button>
        <button
          onClick={() => handleTabChange("user")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "user"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Usuarios
        </button>
        <button
          onClick={() => handleTabChange("password")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "password"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Senha
        </button>
      </div>

      <div className="max-w-2xl">
        {activeTab === "store" && (
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Store size={20} className="text-blue-600" />
              Dados da Loja
            </h2>
            <form onSubmit={handleStoreSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome da Loja</label>
                <input
                  type="text"
                  name="nome"
                  value={storeData.nome}
                  onChange={handleStoreChange}
                  className="mt-1 block w-full border rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Telefone</label>
                <input
                  type="text"
                  name="telefone"
                  value={storeData.telefone}
                  onChange={handleStoreChange}
                  className="mt-1 block w-full border rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Endereco</label>
                <input
                  type="text"
                  name="endereco"
                  value={storeData.endereco}
                  onChange={handleStoreChange}
                  className="mt-1 block w-full border rounded-md p-2"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
              >
                <Save size={16} />
                Salvar
              </button>
            </form>
          </div>
        )}

        {activeTab === "user" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User size={20} className="text-blue-600" />
                Adicionar Usuario
              </h2>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome</label>
                  <input
                    type="text"
                    name="nome"
                    value={newUser.nome}
                    onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                    className="mt-1 block w-full border rounded-md p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="mt-1 block w-full border rounded-md p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Senha</label>
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="mt-1 block w-full border rounded-md p-2"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Perfil</label>
                  <select
                    name="perfil"
                    value={newUser.perfil}
                    onChange={(e) => setNewUser({ ...newUser, perfil: e.target.value as PerfilUsuario })}
                    className="mt-1 block w-full border rounded-md p-2"
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Vendedor">Vendedor</option>
                    <option value="Operador">Operador</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
                >
                  <Save size={16} />
                  Adicionar Usuario
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Usuarios Cadastrados</h3>
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{user.nome}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {user.perfil}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleUserStatus(user.id)}
                      className={`px-3 py-1 text-sm rounded ${
                        user.ativo
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                    >
                      {user.ativo ? "Ativo" : "Inativo"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "password" && (
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Lock size={20} className="text-blue-600" />
              Alterar Senha
            </h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="senhaAtual"
                    value={passwordData.senhaAtual}
                    onChange={handlePasswordInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nova Senha * (minimo 6 caracteres)
                </label>
                <input
                  type="password"
                  name="novaSenha"
                  value={passwordData.novaSenha}
                  onChange={handlePasswordInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha *</label>
                <input
                  type="password"
                  name="confirmarSenha"
                  value={passwordData.confirmarSenha}
                  onChange={handlePasswordInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
              >
                <Key size={18} />
                Alterar Senha
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
