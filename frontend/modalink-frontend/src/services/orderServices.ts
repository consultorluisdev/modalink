import api from './api';
import type { OrderList, OrderDetail } from '../types/order.types';

export const orderService = {
    async getAll(search?: string): Promise<OrderList[]>{
        const params = search ? { search } : {};
        const response = await api.get('/orders', { params });
        return response.data;
    },

    async getById(id: number): Promise<OrderDetail> {
        const response = await api.get(`/orders/${id}`);
        return response.data;
    },

    async create(data: {
        customerName: string;
        customerEmail?: string;
        customerPhone?: string;
        paymentMethod: string;
        discount?: number;
        installmentCount?: number;
        downPayment?: number;
        interestRate?: number;
        items: { productId: number; productName: string; quantity: number; unitPrice: number }[];
    }) {
        const response = await api.post('/orders', data);
        return response.data;
    }
};