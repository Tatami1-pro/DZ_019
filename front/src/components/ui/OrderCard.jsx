import { useState } from "react";
import { deleteOrder } from "../../requests";
import AddOrder from "../forms/AddOrder";
import AddOrderItem from "../forms/AddOrderItem";
import OrderItemCard from "./OrderItemCard";

export default function OrderCard({ data, allOrders, onUpdate }) {
  const { idOrders, order_code, customer_name, order_date, requires_prescription, status, items = [] } = data;

  const [editMode, setEditMode] = useState(false);
  const [addItemMode, setAddItemMode] = useState(false);

  const handleDelete = async () => {
    if (window.confirm(`Вы уверены, что хотите удалить заказ ${order_code}?\nВсе позиции будут возвращены на склад.`)) {
      try {
        await deleteOrder(idOrders);
        if (onUpdate) {
          onUpdate();
        } else {
          window.location.reload();
        }
      } catch (err) {
        alert("Ошибка при удалении заказа");
        console.error(err);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  return (
    <div className="card-block">
      {editMode ? (
        <AddOrder
          setShown={setEditMode}
          initialData={data}
          onSuccess={() => {
            setEditMode(false);
            if (onUpdate) onUpdate();
          }}
        />
      ) : (
        <>
          <div className="card-block-title">
            <div className="card-header-info">
              <h2 className="card-block-title-name">
                Заказ: {order_code}
                {requires_prescription && <span className="prescription-badge">
                  <i className="fas fa-file-prescription"></i> Рецепт
                </span>}
                <span className={`status-badge status-${status}`}>
                  {status === 'active' ? 'Активен' :
                   status === 'completed' ? 'Завершен' : 'Отменен'}
                </span>
              </h2>
              <div className="card-header-details">
                <p>
                  <i className="fas fa-user"></i>
                  <strong>Клиент:</strong> {customer_name}
                </p>
                <p>
                  <i className="fas fa-calendar-alt"></i>
                  <strong>Дата:</strong> {formatDate(order_date)}
                </p>
              </div>
            </div>
            <div className="card-actions">
              <button
                className="action-button move-button"
                onClick={() => setEditMode(true)}
                title="Редактировать заказ"
              >
                <i className="fas fa-edit"></i>
              </button>
              <button
                className="action-button delete-button"
                onClick={handleDelete}
                title="Удалить заказ"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>

          <div className="card-block-content">
            <div className="card-block-content-left-part">
              <div className="card-block-subitems">
                <h3>
                  <i className="fas fa-pills"></i> Препараты в заказе:
                </h3>
                {items.length === 0 && (
                  <div className="no-items">
                    <i className="fas fa-box-open" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
                    <p>Нет добавленных препаратов</p>
                  </div>
                )}
                <div className="card-block-subitems-list">
                  {items.map((item) => (
                    <OrderItemCard
                      key={item.idOrder_items}
                      data={item}
                      parentOrderId={idOrders}
                      allOrders={allOrders}
                      onUpdate={onUpdate}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="card-block-content-right-part">
              {addItemMode ? (
                <AddOrderItem
                  setShown={setAddItemMode}
                  parentOrderId={idOrders}
                  onSuccess={() => {
                    setAddItemMode(false);
                    if (onUpdate) onUpdate();
                  }}
                />
              ) : (
                <div className="buttons-block">
                  <button
                    className="unfiled-button card-block-title-add-button"
                    onClick={() => setAddItemMode(true)}
                  >
                    <i className="fas fa-plus"></i> Добавить препарат
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}