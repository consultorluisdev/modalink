import api from "./api";

interface UserApiData {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface StoreSetting {
  storeName: string;
  phone: string;
  address: string;
}

export interface UserData {
  id: number;
  nome: string;
  email: string;
  role: string;
  isActive: boolean;
}

export const settingsService = {
  async getStore(): Promise<StoreSetting> {
    const res = await api.get("/store-settings");
    return {
      storeName: res.data.storeName,
      phone: res.data.phone ?? "",
      address: res.data.address ?? "",
    };
  },

  async updateStore(data: StoreSetting) {
    const res = await api.put("/store-settings", data);
    return res.data;
  },

  async getUsers(): Promise<UserData[]> {
    const res = await api.get("/auth/users");
    return res.data.map((u: UserApiData) => ({
      id: u.id,
      nome: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
    }));
  },

  async createUser(data: { nome: string; email: string; role: string; password: string }) {
    const res = await api.post("/auth/users", {
      name: data.nome,
      email: data.email,
      role: data.role,
      password: data.password,
    });
    return res.data;
  },

  async toggleUserActive(id: number) {
    const res = await api.patch(`/auth/users/${id}/toggle-active`);
    return res.data;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const res = await api.post("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return res.data;
  },
};
