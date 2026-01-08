const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());


const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'pharmacy_orders'
});


db.connect((err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err);
        return;
    }
    console.log('Подключение к базе данных успешно!');


    const cleanSql = `DELETE FROM orders WHERE order_date < CURDATE() AND status = 'active'`;
    db.query(cleanSql, (err, result) => {
        if (err) {
            console.error('Ошибка при автоматической очистке:', err);
        } else if (result.affectedRows > 0) {
            console.log(`Автоматически удалено ${result.affectedRows} просроченных заказов`);
        }
    });
});



app.get('/', (req, res) => {
    res.send('Сервер аптечной системы управления заказами работает!');
});



// Получение всех препаратов
app.get('/drugs', (req, res) => {
    const sql = 'SELECT * FROM drugs ORDER BY name';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Ошибка при получении препаратов:', err);
            return res.status(500).json({ error: 'Ошибка при получении препаратов', details: err });
        }
        res.json(results);
    });
});


app.post('/drugs/add', (req, res) => {
    const { name, description, requires_prescription, stock_quantity } = req.body;

    if (!name || stock_quantity === undefined) {
        return res.status(400).json({
            error: 'Необходимо указать название и количество препарата'
        });
    }

    if (stock_quantity < 0) {
        return res.status(400).json({
            error: 'Количество не может быть отрицательным'
        });
    }

    const sql = 'INSERT INTO drugs (name, description, requires_prescription, stock_quantity) VALUES (?, ?, ?, ?)';

    db.query(sql, [name, description || null, requires_prescription || false, stock_quantity], (err, result) => {
        if (err) {
            console.error('Ошибка при добавлении препарата:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    error: 'Препарат с таким названием уже существует'
                });
            }
            return res.status(500).json({ error: 'Ошибка при добавлении препарата', details: err });
        }

        res.status(201).json({
            message: 'Препарат успешно добавлен',
            idDrugs: result.insertId
        });
    });
});


app.put('/drugs/update/:idDrugs', (req, res) => {
    const { idDrugs } = req.params;
    const { name, description, requires_prescription, stock_quantity } = req.body;

    if (!name || stock_quantity === undefined) {
        return res.status(400).json({
            error: 'Необходимо указать название и количество препарата'
        });
    }

    if (stock_quantity < 0) {
        return res.status(400).json({
            error: 'Количество не может быть отрицательным'
        });
    }

    const sql = 'UPDATE drugs SET name = ?, description = ?, requires_prescription = ?, stock_quantity = ? WHERE idDrugs = ?';

    db.query(sql, [name, description || null, requires_prescription || false, stock_quantity, idDrugs], (err, result) => {
        if (err) {
            console.error('Ошибка при обновлении препарата:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    error: 'Препарат с таким названием уже существует'
                });
            }
            return res.status(500).json({ error: 'Ошибка при обновлении препарата', details: err });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Препарат не найден' });
        }

        res.status(200).json({
            message: 'Препарат успешно обновлён'
        });
    });
});


app.delete('/drugs/delete/:idDrugs', (req, res) => {
    const { idDrugs } = req.params;

    const checkUsageSql = `
        SELECT COUNT(*) as usage_count 
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.idOrders
        WHERE oi.drug_id = ? AND o.status = 'active'
    `;

    db.query(checkUsageSql, [idDrugs], (err, usageResults) => {
        if (err) {
            console.error('Ошибка при проверке использования:', err);
            return res.status(500).json({ error: 'Ошибка при проверке использования препарата', details: err });
        }

        if (usageResults[0].usage_count > 0) {
            return res.status(400).json({
                error: 'Нельзя удалить препарат, который используется в активных заказах',
                usage_count: usageResults[0].usage_count
            });
        }

        const deleteSql = 'DELETE FROM drugs WHERE idDrugs = ?';
        db.query(deleteSql, [idDrugs], (err, result) => {
            if (err) {
                console.error('Ошибка при удалении препарата:', err);
                return res.status(500).json({ error: 'Ошибка при удалении препарата', details: err });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Препарат не найден' });
            }

            res.status(200).json({
                message: 'Препарат успешно удалён'
            });
        });
    });
});


app.get('/drugs/stock', (req, res) => {
    const sql = 'SELECT idDrugs, stock_quantity FROM drugs';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Ошибка при получении остатков:', err);
            return res.status(500).json({ error: 'Ошибка при получении остатков', details: err });
        }

        const stockMap = {};
        results.forEach(drug => {
            stockMap[drug.idDrugs] = drug.stock_quantity;
        });

        res.json(stockMap);
    });
});


app.get('/orders', (req, res) => {
    const sql = `
        SELECT 
            o.idOrders,
            o.order_code,
            o.customer_name,
            o.order_date,
            o.requires_prescription,
            o.status,
            o.created_at,
            oi.idOrder_items,
            oi.item_code,
            oi.drug_id,
            oi.quantity,
            d.name as drug_name,
            d.requires_prescription as drug_requires_prescription,
            d.stock_quantity as drug_stock_quantity
        FROM orders o
        LEFT JOIN order_items oi ON o.idOrders = oi.order_id
        LEFT JOIN drugs d ON oi.drug_id = d.idDrugs
        WHERE o.status = 'active'
        ORDER BY o.order_date, o.idOrders, oi.idOrder_items
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Ошибка при получении заказов:', err);
            return res.status(500).json({ error: 'Ошибка при получении данных', details: err });
        }

        const orders = {};

        results.forEach(row => {
            const orderId = row.idOrders;

            if (!orders[orderId]) {
                orders[orderId] = {
                    idOrders: orderId,
                    order_code: row.order_code,
                    customer_name: row.customer_name,
                    order_date: row.order_date,
                    requires_prescription: row.requires_prescription,
                    status: row.status,
                    created_at: row.created_at,
                    items: []
                };
            }

            if (row.idOrder_items) {
                const existingItemIndex = orders[orderId].items.findIndex(
                    item => item.idOrder_items === row.idOrder_items
                );

                if (existingItemIndex === -1) {
                    orders[orderId].items.push({
                        idOrder_items: row.idOrder_items,
                        item_code: row.item_code,
                        drug_id: row.drug_id,
                        drug_name: row.drug_name,
                        quantity: row.quantity,
                        drug_requires_prescription: row.drug_requires_prescription,
                        drug_stock_quantity: row.drug_stock_quantity
                    });
                }
            }
        });

        res.json(Object.values(orders));
    });
});


app.post('/orders/add', (req, res) => {
    const { customer_name, order_date, requires_prescription } = req.body;

    if (!customer_name || !order_date) {
        return res.status(400).json({ error: 'Необходимо указать ФИО заказчика и дату заказа' });
    }


    const orderCode = 'ORD-' + Date.now().toString().slice(-6);

    const sql = 'INSERT INTO orders (order_code, customer_name, order_date, requires_prescription) VALUES (?, ?, ?, ?)';
    db.query(sql, [orderCode, customer_name, order_date, requires_prescription || false], (err, result) => {
        if (err) {
            console.error('Ошибка при добавлении заказа:', err);
            return res.status(500).json({ error: 'Ошибка при добавлении заказа', details: err });
        }
        res.status(201).json({
            message: 'Заказ успешно добавлен',
            idOrders: result.insertId,
            order_code: orderCode
        });
    });
});


app.put('/orders/update/:idOrders', (req, res) => {
    const { idOrders } = req.params;
    const { customer_name, order_date, requires_prescription } = req.body;

    if (!customer_name || !order_date) {
        return res.status(400).json({ error: 'Необходимо указать ФИО заказчика и дату заказа' });
    }

    const sql = 'UPDATE orders SET customer_name = ?, order_date = ?, requires_prescription = ? WHERE idOrders = ?';
    db.query(sql, [customer_name, order_date, requires_prescription || false, idOrders], (err, result) => {
        if (err) {
            console.error('Ошибка при обновлении заказа:', err);
            return res.status(500).json({ error: 'Ошибка при обновлении заказа', details: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Заказ с таким ID не найден' });
        }
        res.status(200).json({ message: 'Заказ успешно обновлён' });
    });
});


app.delete('/orders/delete/:idOrders', (req, res) => {
    const { idOrders } = req.params;

    const sql = 'DELETE FROM orders WHERE idOrders = ?';
    db.query(sql, [idOrders], (err, result) => {
        if (err) {
            console.error('Ошибка при удалении заказа:', err);
            return res.status(500).json({ error: 'Ошибка при удалении заказа', details: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Заказ с таким ID не найден' });
        }

        res.status(200).json({ message: 'Заказ успешно удалён' });
    });
});


function getNextItemCode() {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT item_code FROM order_items ORDER BY idOrder_items DESC LIMIT 1';
        db.query(sql, (err, results) => {
            if (err) {
                reject(err);
                return;
            }

            let nextNumber = 1;
            if (results.length > 0) {
                const lastCode = results[0].item_code;
                const match = lastCode.match(/ITM-(\d+)/);
                if (match) {
                    nextNumber = parseInt(match[1]) + 1;
                }
            }


            const nextCode = 'ITM-' + nextNumber.toString().padStart(3, '0');
            resolve(nextCode);
        });
    });
}


function updateDrugStock(drug_id, quantityChange, callback) {
    const quantityNum = parseInt(quantityChange, 10);
    const sql = 'UPDATE drugs SET stock_quantity = stock_quantity + ? WHERE idDrugs = ?';
    db.query(sql, [quantityNum, drug_id], (err, result) => {
        if (err) {
            console.error('Ошибка при обновлении запасов:', err);
            if (callback) callback(err);
        } else {
            console.log(`Обновлены запасы препарата ${drug_id}: изменение ${quantityNum > 0 ? '+' : ''}${quantityNum}`);
            if (callback) callback(null);
        }
    });
}


function updateOrderPrescriptionFlag(order_id, drug_id) {
    const checkDrugSql = 'SELECT requires_prescription FROM drugs WHERE idDrugs = ?';
    db.query(checkDrugSql, [drug_id], (err, drugResults) => {
        if (!err && drugResults.length > 0 && drugResults[0].requires_prescription) {
            const updateOrderSql = 'UPDATE orders SET requires_prescription = TRUE WHERE idOrders = ?';
            db.query(updateOrderSql, [order_id]);
        }
    });
}


app.post('/order-items/add', (req, res) => {
    const { order_id, drug_id, quantity } = req.body;


    const quantityNum = parseInt(quantity, 10);

    if (!order_id || !drug_id || !quantityNum || quantityNum <= 0) {
        return res.status(400).json({
            error: 'Необходимо указать order_id, drug_id и quantity (должно быть > 0)'
        });
    }


    db.query('START TRANSACTION', (err) => {
        if (err) {
            console.error('Ошибка при начале транзакции:', err);
            return res.status(500).json({ error: 'Ошибка при начале транзакции', details: err });
        }


        const checkDrugSql = 'SELECT * FROM drugs WHERE idDrugs = ? FOR UPDATE';
        db.query(checkDrugSql, [drug_id], (err, drugResults) => {
            if (err) {
                return rollbackAndRespond(err, 'Ошибка при проверке препарата');
            }

            if (drugResults.length === 0) {
                return rollbackAndRespond(new Error('Препарат не найден'), 'Препарат не найден');
            }

            const drug = drugResults[0];


            const checkExistingSql = 'SELECT * FROM order_items WHERE order_id = ? AND drug_id = ? FOR UPDATE';
            db.query(checkExistingSql, [order_id, drug_id], (err, existingResults) => {
                if (err) {
                    return rollbackAndRespond(err, 'Ошибка при проверке существующей позиции');
                }


                if (drug.stock_quantity < quantityNum) {
                    return rollbackAndRespond(
                        new Error('Недостаточно препарата на складе'),
                        'Недостаточно препарата на складе',
                        {
                            available: drug.stock_quantity,
                            required: quantityNum
                        }
                    );
                }


                if (drug.requires_prescription) {
                    const checkOrderSql = 'SELECT requires_prescription FROM orders WHERE idOrders = ?';
                    db.query(checkOrderSql, [order_id], (err, orderResults) => {
                        if (err) {
                            return rollbackAndRespond(err, 'Ошибка при проверке заказа');
                        }

                        if (orderResults.length === 0) {
                            return rollbackAndRespond(new Error('Заказ не найден'), 'Заказ не найден');
                        }

                        const order = orderResults[0];

                        if (!order.requires_prescription) {
                            return rollbackAndRespond(
                                new Error('Для этого препарата требуется рецепт'),
                                'Для этого препарата требуется рецепт',
                                { warning: 'При создании/редактировании заказа отметьте галочку "Требуется рецепт"' }
                            );
                        }

                        addOrUpdateOrderItem();
                    });
                } else {
                    addOrUpdateOrderItem();
                }

                function addOrUpdateOrderItem() {
                    if (existingResults.length > 0) {

                        const existingQuantity = parseInt(existingResults[0].quantity, 10);
                        const newTotalQuantity = existingQuantity + quantityNum;

                        const updateSql = 'UPDATE order_items SET quantity = ? WHERE order_id = ? AND drug_id = ?';
                        db.query(updateSql, [newTotalQuantity, order_id, drug_id], (err, result) => {
                            if (err) {
                                return rollbackAndRespond(err, 'Ошибка при обновлении позиции');
                            }


                            updateDrugStock(drug_id, -quantityNum, (err) => {
                                if (err) {
                                    return rollbackAndRespond(err, 'Ошибка при обновлении запасов');
                                }


                                if (drug.requires_prescription) {
                                    const updateOrderSql = 'UPDATE orders SET requires_prescription = TRUE WHERE idOrders = ?';
                                    db.query(updateOrderSql, [order_id], (err) => {
                                        if (err) {
                                            console.error('Ошибка при обновлении флага рецепта:', err);
                                        }
                                        commitTransaction();
                                    });
                                } else {
                                    commitTransaction();
                                }

                                res.status(200).json({
                                    message: 'Количество препарата обновлено в заказе',
                                    idOrder_items: existingResults[0].idOrder_items,
                                    item_code: existingResults[0].item_code,
                                    action: 'updated',
                                    new_quantity: newTotalQuantity,
                                    added_quantity: quantityNum
                                });
                            });
                        });
                    } else {

                        getNextItemCode().then(nextCode => {
                            const sql = 'INSERT INTO order_items (item_code, order_id, drug_id, quantity) VALUES (?, ?, ?, ?)';
                            db.query(sql, [nextCode, order_id, drug_id, quantityNum], (err, result) => {
                                if (err) {
                                    return rollbackAndRespond(err, 'Ошибка при добавлении позиции');
                                }


                                updateDrugStock(drug_id, -quantityNum, (err) => {
                                    if (err) {
                                        return rollbackAndRespond(err, 'Ошибка при обновлении запасов');
                                    }


                                    if (drug.requires_prescription) {
                                        const updateOrderSql = 'UPDATE orders SET requires_prescription = TRUE WHERE idOrders = ?';
                                        db.query(updateOrderSql, [order_id], (err) => {
                                            if (err) {
                                                console.error('Ошибка при обновлении флага рецепта:', err);
                                            }
                                            commitTransaction();
                                        });
                                    } else {
                                        commitTransaction();
                                    }

                                    res.status(201).json({
                                        message: 'Позиция успешно добавлена в заказ',
                                        idOrder_items: result.insertId,
                                        item_code: nextCode,
                                        action: 'added',
                                        quantity: quantityNum
                                    });
                                });
                            });
                        }).catch(err => {
                            rollbackAndRespond(err, 'Ошибка при генерации кода позиции');
                        });
                    }
                }

                function commitTransaction() {
                    db.query('COMMIT', (err) => {
                        if (err) {
                            console.error('Ошибка при коммите транзакции:', err);

                            db.query('ROLLBACK');
                        }
                    });
                }

                function rollbackAndRespond(error, userMessage, additionalData = {}) {
                    db.query('ROLLBACK', (rollbackErr) => {
                        if (rollbackErr) {
                            console.error('Ошибка при откате транзакции:', rollbackErr);
                        }

                        console.error(`${userMessage}:`, error);
                        res.status(500).json({
                            error: userMessage,
                            details: error.message,
                            ...additionalData
                        });
                    });
                }
            });
        });
    });
});

// Удаление позиции из заказа с возвратом на склад
app.delete('/order-items/delete/:idOrder_items', (req, res) => {
    const { idOrder_items } = req.params;


    const getItemSql = 'SELECT * FROM order_items WHERE idOrder_items = ?';
    db.query(getItemSql, [idOrder_items], (err, itemResults) => {
        if (err) {
            console.error('Ошибка при поиске позиции:', err);
            return res.status(500).json({ error: 'Ошибка при поиске позиции', details: err });
        }

        if (itemResults.length === 0) {
            return res.status(404).json({ error: 'Позиция с таким ID не найдена' });
        }

        const item = itemResults[0];

        // Возвращаем количество на склад
        const returnStockSql = 'UPDATE drugs SET stock_quantity = stock_quantity + ? WHERE idDrugs = ?';
        db.query(returnStockSql, [item.quantity, item.drug_id], (err, returnResult) => {
            if (err) {
                console.error('Ошибка при возврате на склад:', err);
                // Продолжаем удаление даже если ошибка возврата
            }

            // Теперь удаляем позицию
            const deleteSql = 'DELETE FROM order_items WHERE idOrder_items = ?';
            db.query(deleteSql, [idOrder_items], (err, deleteResult) => {
                if (err) {
                    console.error('Ошибка при удалении позиции:', err);
                    return res.status(500).json({ error: 'Ошибка при удалении позиции', details: err });
                }

                if (deleteResult.affectedRows === 0) {
                    return res.status(404).json({ error: 'Позиция с таким ID не найдена' });
                }

                res.status(200).json({
                    message: 'Позиция успешно удалена и количество возвращено на склад',
                    returned_quantity: item.quantity
                });
            });
        });
    });
});


app.put('/order-items/move/:idOrder_items', (req, res) => {
    const { idOrder_items } = req.params;
    const { new_order_id } = req.body;

    if (!idOrder_items || !new_order_id) {
        return res.status(400).json({ error: 'Пожалуйста, укажите idOrder_items и new_order_id' });
    }


    const getItemSql = 'SELECT * FROM order_items WHERE idOrder_items = ?';
    db.query(getItemSql, [idOrder_items], (err, itemResults) => {
        if (err) {
            console.error('Ошибка при поиске позиции:', err);
            return res.status(500).json({ error: 'Ошибка при поиске позиции', details: err });
        }

        if (itemResults.length === 0) {
            return res.status(404).json({ error: 'Позиция с таким ID не найдена' });
        }

        const item = itemResults[0];
        const { drug_id, quantity: movingQuantity, order_id: old_order_id } = item;


        const checkOrderSql = 'SELECT * FROM orders WHERE idOrders = ?';
        db.query(checkOrderSql, [new_order_id], (err, orderResults) => {
            if (err) {
                console.error('Ошибка при поиске заказа:', err);
                return res.status(500).json({ error: 'Ошибка при поиске заказа', details: err });
            }

            if (orderResults.length === 0) {
                return res.status(404).json({ error: 'Заказ с указанным ID не найден' });
            }


            const checkExistingSql = 'SELECT * FROM order_items WHERE order_id = ? AND drug_id = ? AND idOrder_items != ?';
            db.query(checkExistingSql, [new_order_id, drug_id, idOrder_items], (err, existingResults) => {
                if (err) {
                    console.error('Ошибка при проверке дубликатов:', err);
                    return res.status(500).json({ error: 'Ошибка при проверке дубликатов', details: err });
                }

                if (existingResults.length > 0) {

                    const existingItem = existingResults[0];
                    const newQuantity = existingItem.quantity + movingQuantity;


                    const checkDrugSql = 'SELECT stock_quantity FROM drugs WHERE idDrugs = ?';
                    db.query(checkDrugSql, [drug_id], (err, drugResults) => {
                        if (err) {
                            console.error('Ошибка при проверке препарата:', err);
                            return res.status(500).json({ error: 'Ошибка при проверке препарата', details: err });
                        }

                        if (drugResults[0].stock_quantity < movingQuantity) {
                            return res.status(400).json({
                                error: 'Недостаточно препарата на складе для переноса',
                                available: drugResults[0].stock_quantity,
                                required: movingQuantity
                            });
                        }


                        const updateSql = 'UPDATE order_items SET quantity = ? WHERE idOrder_items = ?';
                        db.query(updateSql, [newQuantity, existingItem.idOrder_items], (err, updateResult) => {
                            if (err) {
                                console.error('Ошибка при обновлении количества:', err);
                                return res.status(500).json({ error: 'Ошибка при обновлении количества', details: err });
                            }


                            const deleteSql = 'DELETE FROM order_items WHERE idOrder_items = ?';
                            db.query(deleteSql, [idOrder_items], (err, deleteResult) => {
                                if (err) {
                                    console.error('Ошибка при удалении старой позиции:', err);
                                    return res.status(500).json({ error: 'Ошибка при удалении позиции', details: err });
                                }


                                updateOrderPrescriptionFlag(new_order_id, drug_id);

                                res.status(200).json({
                                    message: 'Позиция объединена с существующей в заказе',
                                    action: 'merged',
                                    new_quantity: newQuantity
                                });
                            });
                        });
                    });
                } else {

                    const transferSql = 'UPDATE order_items SET order_id = ? WHERE idOrder_items = ?';
                    db.query(transferSql, [new_order_id, idOrder_items], (err, updateResult) => {
                        if (err) {
                            console.error('Ошибка при переносе позиции:', err);
                            return res.status(500).json({ error: 'Ошибка при переносе позиции', details: err });
                        }


                        updateOrderPrescriptionFlag(new_order_id, drug_id);

                        res.status(200).json({
                            message: 'Позиция успешно перенесена в другой заказ',
                            action: 'transferred'
                        });
                    });
                }
            });
        });
    });
});


app.get('/system/stats', (req, res) => {
    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM orders WHERE status = 'active') as active_orders,
            (SELECT COUNT(*) FROM orders WHERE order_date = CURDATE() AND status = 'active') as today_orders,
            (SELECT COUNT(*) FROM drugs WHERE stock_quantity < 10) as low_stock_drugs,
            (SELECT SUM(stock_quantity) FROM drugs) as total_stock
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Ошибка при получении статистики:', err);
            return res.status(500).json({ error: 'Ошибка при получении статистики', details: err });
        }
        res.json(results[0]);
    });
});


app.post('/system/advance-day', (req, res) => {
    // 1. Передаем сегодняшние заказы курьерам
    const deliverOrders = () => {
        return new Promise((resolve, reject) => {
            const today = new Date().toISOString().split('T')[0];
            const updateOrdersSql = `
                UPDATE orders 
                SET status = 'completed' 
                WHERE order_date = ? AND status = 'active'
            `;

            db.query(updateOrdersSql, [today], (err, result) => {
                if (err) reject(err);
                else resolve(result.affectedRows || 0);
            });
        });
    };

    // 2. Пополняем запасы
    const restockDrugs = () => {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE drugs 
                SET stock_quantity = stock_quantity + FLOOR(10 + RAND() * 41)
            `;

            db.query(sql, (err, result) => {
                if (err) reject(err);
                else resolve(result.affectedRows || 0);
            });
        });
    };

    // 3. Получаем статистику
    const getStats = () => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    (SELECT COUNT(*) FROM orders WHERE status = 'completed' AND order_date = CURDATE()) as delivered_today,
                    (SELECT SUM(stock_quantity) FROM drugs) as total_stock_after
            `;

            db.query(sql, (err, results) => {
                if (err) reject(err);
                else resolve(results[0]);
            });
        });
    };


    deliverOrders()
        .then(deliveredCount => {
            return restockDrugs().then(restockedCount => ({
                delivered: deliveredCount,
                restocked: restockedCount
            }));
        })
        .then(({ delivered, restocked }) => {
            return getStats().then(stats => ({
                ...stats,
                delivered,
                restocked
            }));
        })
        .then(finalResult => {
            res.json({
                success: true,
                message: `День завершен. Передано заказов: ${finalResult.delivered}, Пополнено препаратов: ${finalResult.restocked}`,
                ...finalResult
            });
        })
        .catch(err => {
            console.error('Ошибка при переключении дня:', err);
            res.status(500).json({
                error: 'Ошибка при переключении дня',
                details: err.message
            });
        });
});


app.post('/system/clean-expired', (req, res) => {
    const sql = `
        DELETE FROM orders 
        WHERE order_date < CURDATE() 
        AND status = 'active'
    `;

    db.query(sql, (err, result) => {
        if (err) {
            console.error('Ошибка при очистке просроченных заказов:', err);
            return res.status(500).json({ error: 'Ошибка при очистке просроченных заказов', details: err });
        }

        res.json({
            message: 'Просроченные заказы очищены',
            deleted: result.affectedRows
        });
    });
});


app.post('/drugs/restock-random', (req, res) => {
    const sql = `
        UPDATE drugs 
        SET stock_quantity = stock_quantity + FLOOR(10 + RAND() * 41) 
        WHERE stock_quantity < 100
    `;

    db.query(sql, (err, result) => {
        if (err) {
            console.error('Ошибка при пополнении запасов:', err);
            return res.status(500).json({ error: 'Ошибка при пополнении запасов', details: err });
        }


        const getDrugsSql = 'SELECT COUNT(*) as updated FROM drugs WHERE stock_quantity < 100';
        db.query(getDrugsSql, (err, countResult) => {
            if (err) {
                return res.json({
                    message: 'Запасы пополнены случайными величинами',
                    affected: result.affectedRows
                });
            }

            res.json({
                message: 'Запасы пополнены случайными величинами (10-50 единиц к каждому препарату)',
                affected: result.affectedRows,
                lowStockRemaining: countResult[0].updated
            });
        });
    });
});


app.get('/debug/order-items/:order_id', (req, res) => {
    const { order_id } = req.params;

    const sql = `
        SELECT oi.*, d.name as drug_name 
        FROM order_items oi
        LEFT JOIN drugs d ON oi.drug_id = d.idDrugs
        WHERE oi.order_id = ?
        ORDER BY oi.idOrder_items
    `;

    db.query(sql, [order_id], (err, results) => {
        if (err) {
            console.error('Ошибка при отладке:', err);
            return res.status(500).json({ error: 'Ошибка при отладке', details: err });
        }

        console.log(`Отладка заказа ${order_id}:`);
        console.log('Количество записей в order_items:', results.length);
        results.forEach(item => {
            console.log(`  ID позиции: ${item.idOrder_items}, Препарат: ${item.drug_name}, Количество: ${item.quantity}`);
        });

        res.json(results);
    });
});


app.get('/debug/check-types/:order_id', (req, res) => {
    const { order_id } = req.params;

    const sql = `
        SELECT 
            oi.idOrder_items,
            oi.quantity,
            oi.drug_id,
            d.name,
            TYPEOF(oi.quantity) as quantity_type
        FROM order_items oi
        LEFT JOIN drugs d ON oi.drug_id = d.idDrugs
        WHERE oi.order_id = ?
    `;

    db.query(sql, [order_id], (err, results) => {
        if (err) {
            console.error('Ошибка при проверке типов:', err);
            return res.status(500).json({ error: 'Ошибка при проверке типов', details: err });
        }

        console.log('Проверка типов данных для заказа', order_id);
        results.forEach(row => {
            console.log(`  Позиция ${row.idOrder_items}: ${row.name} - ${row.quantity} (тип в БД: ${row.quantity_type})`);
            console.log(`  Тип в JavaScript: ${typeof row.quantity}`);
        });

        res.json(results);
    });
});



app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});