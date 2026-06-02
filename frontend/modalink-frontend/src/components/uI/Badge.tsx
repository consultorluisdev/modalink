interface BadgeProps {
    status: string;
}

export function Badge({ status }: BadgeProps){
    const variants = {
        Paid: 'bg-green-100 text-green-700',
        Pending: 'bg-yellow-100 text-red-700'
    };

    const labels = {
        Paid: 'Pago',
        Pending: 'Pendente',
        Cancelled: 'Cancelado'
    };

    const variant = variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-700';
    const label = labels[status as keyof typeof labels] || status;

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${variant}`}>
            {label}
        </span>
    );
}