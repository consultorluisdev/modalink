interface BadgeProps {
    status: string;
}

export function Badge({ status }: BadgeProps){
    const variants = {
        Paid: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
        Pending: 'border border-amber-200 bg-amber-50 text-amber-700',
        Cancelled: 'border border-slate-200 bg-slate-100 text-slate-600'
    };

    const labels = {
        Paid: 'Pago',
        Pending: 'Pendente',
        Cancelled: 'Cancelado'
    };

    const variant = variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-700';
    const label = labels[status as keyof typeof labels] || status;

    return (
        <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${variant}`}>
            {label}
        </span>
    );
}