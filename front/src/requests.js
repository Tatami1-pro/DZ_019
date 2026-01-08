const API_URL = 'http://localhost:3001';

// Общая функция для запросов
async function fetchData(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        // Проверяем статус ответа
        if (!response.ok) {
            // Пытаемся получить JSON с ошибкой
            try {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            } catch (jsonError) {
                // Если не удалось распарсить JSON, используем текст
                const errorText = await response.text();
                throw new Error(errorText || `HTTP error! status: ${response.status}`);
            }
        }

        // Пытаемся распарсить JSON
        const data = await response.json();
        return data;

    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// === ЗАКАЗЫ ===
export async function getOrders() {
    return fetchData(`${API_URL}/orders`);
}

export async function addOrder(orderData) {
    return fetchData(`${API_URL}/orders/add`, {
        method: 'POST',
        body: JSON.stringify(orderData)
    });
}

export async function updateOrder(idOrders, orderData) {
    return fetchData(`${API_URL}/orders/update/${idOrders}`, {
        method: 'PUT',
        body: JSON.stringify(orderData)
    });
}

export async function deleteOrder(idOrders) {
    return fetchData(`${API_URL}/orders/delete/${idOrders}`, {
        method: 'DELETE'
    });
}

// === ПРЕПАРАТЫ ===
export async function getDrugs() {
    return fetchData(`${API_URL}/drugs`);
}

export async function addDrug(drugData) {
    return fetchData(`${API_URL}/drugs/add`, {
        method: 'POST',
        body: JSON.stringify(drugData)
    });
}

export async function updateDrug(idDrugs, drugData) {
    return fetchData(`${API_URL}/drugs/update/${idDrugs}`, {
        method: 'PUT',
        body: JSON.stringify(drugData)
    });
}

export async function deleteDrug(idDrugs) {
    return fetchData(`${API_URL}/drugs/delete/${idDrugs}`, {
        method: 'DELETE'
    });
}

// === ПОЗИЦИИ ЗАКАЗА ===
export async function addOrderItem(itemData) {
    return fetchData(`${API_URL}/order-items/add`, {
        method: 'POST',
        body: JSON.stringify(itemData)
    });
}

export async function deleteOrderItem(idOrder_items) {
    return fetchData(`${API_URL}/order-items/delete/${idOrder_items}`, {
        method: 'DELETE'
    });
}

export async function moveOrderItem(idOrder_items, new_order_id) {
    return fetchData(`${API_URL}/order-items/move/${idOrder_items}`, {
        method: 'PUT',
        body: JSON.stringify({ new_order_id })
    });
}

// === СИСТЕМНЫЕ ФУНКЦИИ ===
export async function getStats() {
    return fetchData(`${API_URL}/system/stats`);
}

export async function advanceDay() {
    return fetchData(`${API_URL}/system/advance-day`, {
        method: 'POST'
    });
}

export async function cleanExpiredOrders() {
    return fetchData(`${API_URL}/system/clean-expired`, {
        method: 'POST'
    });
}

export async function restockDrugsRandom() {
    return fetchData(`${API_URL}/drugs/restock-random`, {
        method: 'POST'
    });
}

// Для отладки - проверка подключения
export async function testConnection() {
    try {
        const response = await fetch(`${API_URL}/`);
        if (response.ok) {
            const text = await response.text();
            return { success: true, message: text };
        }
        return { success: false, message: `HTTP ${response.status}` };
    } catch (error) {
        return { success: false, message: error.message };
    }
}