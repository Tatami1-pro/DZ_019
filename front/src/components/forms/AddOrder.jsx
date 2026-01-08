import React, { useState } from 'react';
import { addOrder, updateOrder } from '../../requests';

export default function AddOrder({ setShown, initialData = {} }) {
  const { idOrders, customer_name, order_date, requires_prescription } = initialData;

  const [newData, setNewData] = useState({
    customer_name: customer_name || '',
    order_date: order_date || '',
    requires_prescription: requires_prescription || false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const today = new Date().toISOString().split('T')[0];
    if (newData.order_date < today) {
      alert('Дата заказа не может быть меньше текущей даты!');
      return;
    }

    try {
      if (idOrders) {
        await updateOrder(idOrders, newData);
      } else {
        await addOrder(newData);
      }
      setShown(false);
      window.location.reload();
    } catch (error) {
      alert('Ошибка при сохранении заказа');
      console.error(error);
    }
  };

  return (
    <div className="form-block">
      <h2>{idOrders ? 'Редактирование заказа' : 'Добавление заказа'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-input-block">
          <label>ФИО заказчика:</label>
          <input
            name="customer_name"
            type="text"
            value={newData.customer_name}
            onChange={handleChange}
            required
            placeholder="Иванов Иван Иванович"
          />
        </div>

        <div className="form-input-block">
          <label>Дата заказа:</label>
          <input
            name="order_date"
            type="date"
            value={newData.order_date}
            onChange={handleChange}
            required
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="form-checkbox-block">
          <label>
            <input
              name="requires_prescription"
              type="checkbox"
              checked={newData.requires_prescription}
              onChange={handleChange}
            />
            Требуется рецепт
          </label>
        </div>

        <div className="buttons-block">
          <button className="grey-button" type="button" onClick={() => setShown(false)}>
            Отменить
          </button>
          <button className="filed-button" type="submit">
            {idOrders ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </form>
    </div>
  );
}