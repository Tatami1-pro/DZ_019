import { useEffect, useState } from "react";
import { getDrugs, addOrderItem } from "../../requests";

export default function AddOrderItem({ setShown, parentOrderId, onSuccess }) {
  const [newData, setNewData] = useState({
    order_id: parentOrderId,
    drug_id: "",
    quantity: 1
  });

  const [drugsList, setDrugsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDrugs();
  }, []);

  const loadDrugs = async () => {
    try {
      const data = await getDrugs();
      setDrugsList(data || []);
    } catch (error) {
      console.error("Ошибка при загрузке препаратов:", error);
      alert("Не удалось загрузить список препаратов");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'drug_id') {
      const drug = drugsList.find(d => d.idDrugs === parseInt(value));
      setSelectedDrug(drug);
    }

    setNewData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const quantityNum = parseInt(newData.quantity, 10);

    if (quantityNum <= 0) {
      alert("❌ Количество не может быть отрицательным или нулевым.");
      return;
    }

    if (!newData.drug_id) {
      alert("❌ Выберите препарат");
      return;
    }

    setSubmitting(true);

    try {
      const result = await addOrderItem({
        ...newData,
        quantity: quantityNum
      });

      // Показываем сообщение в зависимости от действия
      if (result.action === 'updated') {
        alert(`✅ Количество препарата обновлено в заказе`);
      } else {
        alert(`✅ Препарат добавлен в заказ с кодом ${result.item_code}`);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        setShown(false);
        window.location.reload();
      }

    } catch (error) {
      if (error.message.includes('Недостаточно препарата')) {
        const errorData = JSON.parse(error.message);
        alert(`❌ ${errorData.error}\nДоступно: ${errorData.available} шт.\nТребуется: ${errorData.required} шт.${errorData.already_in_order ? `\nУже в заказе: ${errorData.already_in_order} шт.` : ''}`);
      } else if (error.message.includes('рецепт')) {
        alert(`⚠️ ${error.message}`);
      } else {
        alert("❌ Ошибка при добавлении позиции в заказ.");
      }
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-block">
      <h2>Добавить препарат в заказ</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-select-block">
          <label>
            <i className="fas fa-pills" style={{ marginRight: '8px' }}></i>
            Препарат:
          </label>
          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Загрузка препаратов...</p>
            </div>
          ) : (
            <select
              name="drug_id"
              value={newData.drug_id}
              onChange={handleChange}
              required
              disabled={submitting}
            >
              <option value="" disabled>
                --Выберите препарат--
              </option>
              {drugsList.map((drug) => (
                <option key={drug.idDrugs} value={drug.idDrugs}>
                  {drug.name} {drug.requires_prescription ? '(рецепт)' : ''}
                  - {drug.stock_quantity} шт.
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedDrug && (
          <div className="drug-info">
            <p><strong>Название:</strong> {selectedDrug.name}</p>
            <p><strong>На складе:</strong> {selectedDrug.stock_quantity} шт.</p>
            <p><strong>Рецепт:</strong> {selectedDrug.requires_prescription ? 'Требуется' : 'Не требуется'}</p>
            {selectedDrug.description && (
              <p><strong>Описание:</strong> {selectedDrug.description}</p>
            )}
          </div>
        )}

        <div className="form-input-block">
          <label>
            <i className="fas fa-box" style={{ marginRight: '8px' }}></i>
            Количество:
          </label>
          <input
            name="quantity"
            type="number"
            min="1"
            max={selectedDrug?.stock_quantity || 999}
            value={newData.quantity}
            onChange={handleChange}
            required
            disabled={submitting || !selectedDrug}
          />
        </div>

        <div className="form-actions-center">
          <button
            className="grey-button"
            type="button"
            onClick={() => setShown(false)}
            disabled={submitting}
          >
            <i className="fas fa-times"></i> Отменить
          </button>
          <button
            className="filed-button"
            type="submit"
            disabled={submitting || !selectedDrug}
          >
            {submitting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Добавление...
              </>
            ) : (
              <>
                <i className="fas fa-plus"></i> Добавить
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}