import api from "./api";

export interface PublicProduct {
    id: number;
    title: string;
    description: string;
    price: number;
    imageUrl: string | null;
    category: string | null;
    stock: number;
}

export interface PublicCatalogResponse {
    items: PublicProduct[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    categories: string[];
}

export interface PublicStoreSettings {
    storeName: string;
    phone: string | null;
    address: string | null;
    logoUrl: string | null;
}

export interface PublicProductParams {
    search?: string;
    category?: string;
    page?: number;
    pageSize?: number;
    onlyInStock?: boolean;
}

export const publicCatalogService = {
    async getProducts(params: PublicProductParams = {}): Promise<PublicCatalogResponse> {
        const response = await api.get("/public/products", { params });
        return response.data;
    },

    async getProduct(id: number): Promise<PublicProduct> {
        const response = await api.get(`/public/products/${id}`);
        return response.data;
    },

    async getStoreSettings(): Promise<PublicStoreSettings> {
        const response = await api.get("/public/store-settings");
        return response.data;
    },
};
