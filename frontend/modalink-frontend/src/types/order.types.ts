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

export interface OrderDetail {
    id: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    paymentMethod: string;
    total: number;
    status: string;
    createdAt: string;
    items: OrderItem[];
}

export type OrderStatus = 'Paid' | 'Pending' | 'Cancelled'