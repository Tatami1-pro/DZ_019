import React, { useState } from 'react';
import { addDrug, updateDrug } from '../../requests';

export default function AddDrug({ setShown, initialData = {}, onSuccess }) {
  const { idDrugs, name, description, requires_prescription, stock_quantity } = initialData;

  const [formData, setFormData] = useState({
    name: name || '',
    description: description || '',
    requires_prescription: requires_prescription || false,
    stock_quantity: stock_quantity || 0
  });

  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) || 0 : value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Введите название препарата!');
      return;
    }

    if (formData.stock_quantity < 0) {
      alert('Количество не может быть отрицательным!');
      return;
    }

    setSubmitting(true);

    try {
      if (idDrugs) {
        await updateDrug(idDrugs, formData);
      } else {
        await addDrug(formData);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        setShown(false);
        window.location.reload();
      }

    } catch (error) {
      if (error.message.includes('уже существует')) {
        alert('Препарат с таким названием уже существует.');
      } else {
        alert('Ошибка при сохранении препарата');
      }
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-block">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-input-block">
          <label htmlFor="drug_name">
            <i className="fas fa-tag" style={{ marginRight: '8px' }}></i>
            Название препарата: *
          </label>
          <input
            id="drug_name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Парацетамол 500мг"
            disabled={submitting}
          />
        </div>

        <div className="form-input-block">
          <label htmlFor="drug_description">
            <i className="fas fa-file-alt" style={{ marginRight: '8px' }}></i>
            Описание (необязательно):
          </label>
          <textarea
            id="drug_description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
            placeholder="Описание препарата, особенности применения..."
            disabled={submitting}
          />
        </div>

        <div className="form-input-block">
          <label htmlFor="stock_quantity">
            <i className="fas fa-boxes" style={{ marginRight: '8px' }}></i>
            Количество на складе: *
          </label>
          <input
            id="stock_quantity"
            name="stock_quantity"
            type="number"
            min="0"
            value={formData.stock_quantity}
            onChange={handleChange}
            required
            disabled={submitting}
          />
        </div>

        <div className="form-checkbox-block">
          <label>
            <input
              name="requires_prescription"
              type="checkbox"
              checked={formData.requires_prescription}
              onChange={handleChange}
              disabled={submitting}
            />
            <i className="fas fa-file-prescription" style={{ marginRight: '8px' }}></i>
            Требуется рецепт
          </label>
        </div>

        <div className="form-actions">
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
            disabled={submitting}
          >
            {submitting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Сохранение...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                {idDrugs ? 'Сохранить' : 'Добавить'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}