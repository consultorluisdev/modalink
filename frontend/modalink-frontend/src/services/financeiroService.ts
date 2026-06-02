import api from './api';

export interface InstallmentItem {
    id: number;
    installmentNumber: number;
    amount: number;
    dueDate: string;
    isPaid: boolean;
    paidAt: string | null;
    paidAmount: number | null;
    orderId: number;
    customerName: string;
}

export interface ReceivableData {
    totalReceivable: number;
    totalPaidThisMonth: number;
    overdue: number;
    dueSoon: number;
    items: InstallmentItem[];
}

export interface ReceivableSummary {
    totalPending: number;
    overdueCount: number;
    receivedThisMonth: number;
    totalInstallments: number;
    paidInstallments: number;
}

export const financeiroService = {
    async getReceivable(): Promise<ReceivableData> {
        const response = await api.get('/finances/receivable');
        return response.data;
    },

    async getSummary(): Promise<ReceivableSummary> {
        const response = await api.get('/finances/receivable/summary');
        return response.data;
    },

    async payInstallment(id: number, amount?: number) {
        const response = await api.post(`/finances/installments/${id}/pay`, { amount });
        return response.data;
    },

    async unpayInstallment(id: number) {
        const response = await api.post(`/finances/installments/${id}/unpay`);
        return response.data;
    },

    async getCustomerBalance(customerId: number) {
        const response = await api.get(`/finances/customer/${customerId}`);
        return response.data;
    }
};
