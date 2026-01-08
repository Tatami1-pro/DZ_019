export function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

export function formatDateForInput(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

export function isToday(dateString) {
    const today = new Date();
    const date = new Date(dateString);
    return date.toDateString() === today.toDateString();
}

export function isPastDate(dateString) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    return date < today;
}

export function getRandomColor() {
    const colors = [
        '#4CAF50', '#2196F3', '#FF9800', '#E91E63',
        '#9C27B0', '#3F51B5', '#00BCD4', '#8BC34A',
        '#FFC107', '#FF5722', '#795548', '#607D8B'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

export function formatOrderStatus(status) {
    const statusMap = {
        'active': 'Активен',
        'completed': 'Завершен',
        'cancelled': 'Отменен'
    };
    return statusMap[status] || status;
}

export function canAddDrugToOrder(drug, order) {
    if (!drug || !order) return false;

    if (drug.stock_quantity <= 0) {
        return { canAdd: false, reason: 'Нет в наличии' };
    }

    if (drug.requires_prescription && !order.requires_prescription) {
        return { canAdd: false, reason: 'Требуется рецепт' };
    }

    return { canAdd: true };
}


export function calculateOrderTotal(items) {
    if (!items || items.length === 0) return 0;
    return items.reduce((total, item) => total + item.quantity, 0);
}