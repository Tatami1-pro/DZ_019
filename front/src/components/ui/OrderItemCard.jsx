import { useState, useEffect } from "react";
import { deleteOrderItem, moveOrderItem, getOrders, getDrugs } from "../../requests";

export default function OrderItemCard({ data, parentOrderId, onUpdate }) {
  const { idOrder_items, item_code, drug_name, quantity, drug_requires_prescription, drug_id, drug_stock_quantity } = data;

  const [moveMode, setMoveMode] = useState(false);
  const [newData, setNewData] = useState({ new_order_id: "" });
  const [allOrders, setAllOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStock, setCurrentStock] = useState(drug_stock_quantity || 0);

  useEffect(() => {
    if (!drug_stock_quantity && drug_id) {
      const loadStock = async () => {
        try {
          const drugs = await getDrugs();
          const drug = drugs.find(d => d.idDrugs === drug_id);
          if (drug) {
            setCurrentStock(drug.stock_quantity);
          }
        } catch (error) {
          console.error("Ошибка при загрузке остатков:", error);
        }
      };
      loadStock();
    }
  }, [drug_id, drug_stock_quantity]);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      try {
        const orders = await getOrders();
        setAllOrders(orders || []);
      } catch (error) {
        console.error("Ошибка при загрузке заказов:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (moveMode) {
      loadOrders();
    }
  }, [moveMode]);

  const handleDelete = async () => {
    if (window.confirm(`Вы уверены, что хотите удалить позицию ${item_code}?\nКоличество ${quantity} шт. будет возвращено на склад.`)) {
      try {
        await deleteOrderItem(idOrder_items);
        if (onUpdate) {
          onUpdate();
        }
      } catch (err) {
        alert("Ошибка при удалении позиции");
        console.error(err);
      }
    }
  };

  const handleChange = (e) => {
    setNewData({ new_order_id: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newData.new_order_id) {
      alert("Выберите новый заказ перед переносом.");
      return;
    }
    try {
      await moveOrderItem(idOrder_items, newData.new_order_id);
      setMoveMode(false);
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      alert("Ошибка при переносе позиции.");
      console.error(err);
    }
  };

  return (
    <div className="inner-card-block">
      <div className="order-item-container">
        <div className="drug-name-row">
          <span className="drug-name">{drug_name}</span>
          {drug_requires_prescription && (
            <span className="prescription-badge">
              <i className="fas fa-file-prescription"></i> Рецепт
            </span>
          )}
        </div>

        <div className="drug-details-row">
          <div className="drug-details">
            <span className="item-code">
              <i className="fas fa-hashtag"></i> {item_code}
            </span>
            <span className="quantity">
              <i className="fas fa-box"></i> {quantity} шт.
            </span>
            <span className="stock">
              <i className="fas fa-warehouse"></i>
              {currentStock !== null ? `${currentStock} шт.` : '...'}
            </span>
          </div>

          <div className="order-item-actions">
            {!moveMode && (
              <button
                className="action-button move-button"
                onClick={() => setMoveMode(true)}
                title="Перенести в другой заказ"
              >
                <i className="fas fa-exchange-alt"></i>
              </button>
            )}
            <button
              className="action-button delete-button"
              onClick={handleDelete}
              title="Удалить позицию"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </div>

      {moveMode && (
        <form onSubmit={handleSubmit} className="move-form">
          <div className="form-input-block">
            <label>
              <i className="fas fa-clipboard-list"></i> Новый заказ:
            </label>
            {isLoading ? (
              <p>Загрузка заказов...</p>
            ) : (
              <select value={newData.new_order_id} onChange={handleChange} required>
                <option value="" disabled>
                  Выберите заказ
                </option>
                {allOrders
                  .filter((order) => order.idOrders !== parentOrderId && order.status === 'active')
                  .map((order) => (
                    <option key={order.idOrders} value={order.idOrders}>
                      {order.order_code} - {order.customer_name} ({order.order_date})
                    </option>
                  ))}
              </select>
            )}
          </div>
          <div className="form-actions">
            <button
              className="grey-button"
              type="button"
              onClick={() => setMoveMode(false)}
            >
              <i className="fas fa-times"></i> Отменить
            </button>
            <button className="filed-button" type="submit">
              <i className="fas fa-exchange-alt"></i> Перенести
            </button>
          </div>
        </form>
      )}
    </div>
  );
}