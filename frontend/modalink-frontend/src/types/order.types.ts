export interface OrderList{
    id: number;
    customerName: string;
    paymentMethod: string;
    total: number;
    status: string;
    createdAt: string;
    quantityItems: number;
}

export interface OrderItem {
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface OrderInstallment {
    id: number;
    installmentNumber: number;
    amount: number;
    dueDate: string;
    isPaid: boolean;
    paidAt: string | null;
    paidAmount: number | null;
}

export interface OrderPayment {
    id: number;
    installmentId: number | null;
    amount: number;
    method: string | null;
    paidAt: string;
    reversedAt: string | null;
}

export interface OrderDetail {
    id: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    paymentMethod: string;
    total: number;
    status: string;
    createdAt: string;
    cancelledAt: string | null;
    cancellationReason: string | null;
    subtotal: number;
    discount: number;
    installmentCount: number | null;
    downPayment: number | null;
    interestRate: number | null;
    totalWithInterest: number | null;
    items: OrderItem[];
    installments: OrderInstallment[];
    payments: OrderPayment[];
}

export type OrderStatus = 'Paid' | 'Pending' | 'Cancelled'