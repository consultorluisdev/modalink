import api from './api';

export interface CashRegisterExpense {
    id: number;
    amount: number;
    description: string;
    createdAt: string;
}

export interface CashRegisterPayment {
    id: number;
    amount: number;
    method: string | null;
    paidAt: string;
    orderId: number;
}

export interface CashRegisterData {
    id: number;
    openedAt: string;
    openingAmount: number;
    status: string;
    totalReceived: number;
    cashReceived: number;
    totalExpenses: number;
    expectedCash: number;
    paymentsByMethod: { method: string; amount: number }[];
    expenses: CashRegisterExpense[];
    payments: CashRegisterPayment[];
}

export const cashRegisterService = {
    async getCurrent(): Promise<CashRegisterData | null> {
        const response = await api.get('/cashregisters/current');
        return response.data;
    },

    async open(openingAmount: number) {
        const response = await api.post('/cashregisters/open', { openingAmount });
        return response.data;
    },

    async addExpense(amount: number, description: string) {
        const response = await api.post('/cashregisters/expenses', { amount, description });
        return response.data;
    },

    async close(closingAmount: number) {
        const response = await api.post('/cashregisters/close', { closingAmount });
        return response.data as { expectedCash: number; difference: number; totalReceived: number; cashReceived: number; totalExpenses: number };
    },
};
