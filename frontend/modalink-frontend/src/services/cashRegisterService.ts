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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCashRegisterData(value: unknown): value is CashRegisterData {
    if (!isRecord(value)) return false;

    return typeof value.id === "number"
        && typeof value.openedAt === "string"
        && typeof value.openingAmount === "number"
        && typeof value.status === "string"
        && typeof value.totalReceived === "number"
        && typeof value.cashReceived === "number"
        && typeof value.totalExpenses === "number"
        && typeof value.expectedCash === "number"
        && Array.isArray(value.paymentsByMethod)
        && value.paymentsByMethod.every((item) =>
            isRecord(item) && typeof item.method === "string" && typeof item.amount === "number"
        )
        && Array.isArray(value.expenses)
        && value.expenses.every((item) =>
            isRecord(item)
            && typeof item.id === "number"
            && typeof item.amount === "number"
            && typeof item.description === "string"
            && typeof item.createdAt === "string"
        )
        && Array.isArray(value.payments)
        && value.payments.every((item) =>
            isRecord(item)
            && typeof item.id === "number"
            && typeof item.amount === "number"
            && (typeof item.method === "string" || item.method === null)
            && typeof item.paidAt === "string"
            && typeof item.orderId === "number"
        );
}

export const cashRegisterService = {
    async getCurrent(): Promise<CashRegisterData | null> {
        const response = await api.get('/cashregisters/current');
        if (response.data === null) return null;
        if (!isCashRegisterData(response.data)) {
            throw new Error(
                "A API conectada não retornou os dados do caixa. Atualize e reinicie o backend ModaLink e confirme que a migração do caixa foi aplicada."
            );
        }

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
