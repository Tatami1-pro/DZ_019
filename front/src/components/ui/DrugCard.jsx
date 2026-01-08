import { useState } from "react";
import { deleteDrug } from "../../requests";
import AddDrug from "../forms/AddDrug";

export default function DrugCard({ drug, onUpdate }) {
  const { idDrugs, name, description, requires_prescription, stock_quantity } = drug;

  const [editMode, setEditMode] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const handleDelete = async () => {
    if (window.confirm(`Вы уверены, что хотите удалить препарат "${name}"?\nЭто действие нельзя отменить.`)) {
      try {
        await deleteDrug(idDrugs);
        if (onUpdate) {
          onUpdate();
        }
      } catch (error) {
        if (error.message.includes('Нельзя удалить препарат')) {
          alert(error.message);
        } else {
          alert("Ошибка при удалении препарата");
        }
        console.error(error);
      }
    }
  };

  const toggleDescription = () => {
    setShowDescription(!showDescription);
  };

  const getStockStatus = () => {
    if (stock_quantity === 0) {
      return { text: 'Нет в наличии', className: 'status-out' };
    } else if (stock_quantity < 10) {
      return { text: 'Мало осталось', className: 'status-low' };
    } else {
      return { text: 'В наличии', className: 'status-ok' };
    }
  };

  const stockStatus = getStockStatus();

  return (
    <div className="drug-card">
      {editMode ? (
        <AddDrug
          setShown={setEditMode}
          initialData={drug}
          onSuccess={() => {
            setEditMode(false);
            if (onUpdate) onUpdate();
          }}
        />
      ) : (
        <>
          <div className="drug-card-header">
            <div className="drug-id">
              <i className="fas fa-hashtag"></i> ID: {idDrugs}
            </div>
            <div className="drug-actions">
              <button
                className="action-button edit-button"
                onClick={() => setEditMode(true)}
                title="Редактировать препарат"
              >
                <i className="fas fa-edit"></i>
              </button>
              <button
                className="action-button delete-button"
                onClick={handleDelete}
                title="Удалить препарат"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>

          <div className="drug-card-body">
            <h3 className="drug-name" onClick={toggleDescription} style={{ cursor: 'pointer' }}>
              {name}
              {description && (
                <i
                  className={`fas fa-chevron-${showDescription ? 'up' : 'down'}`}
                  style={{ marginLeft: '10px', fontSize: '14px', color: '#999' }}
                ></i>
              )}
            </h3>

            {showDescription && description && (
              <div className="drug-description">
                <p>{description}</p>
              </div>
            )}

            <div className="drug-quantity-section">
              <div className="quantity-info">
                <i className="fas fa-box" style={{ color: '#4CAF50', marginRight: '8px' }}></i>
                <span className="quantity-label">Количество на складе:</span>
                <span className="quantity-value">{stock_quantity} шт.</span>
              </div>

              {requires_prescription && (
                <div className="prescription-info">
                  <i className="fas fa-file-prescription" style={{ color: '#f44336', marginRight: '5px' }}></i>
                  <span>Требуется рецепт</span>
                </div>
              )}
            </div>

            {/* Статус и информация внизу */}
            <div className="drug-footer">
              <div className="drug-status">
                <span className={`status-badge ${stockStatus.className}`}>
                  {stockStatus.text}
                </span>
              </div>

              <div className="drug-type">
                <i className="fas fa-capsules" style={{ marginRight: '5px' }}></i>
                {requires_prescription ? 'Рецептурный' : 'Безрецептурный'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}