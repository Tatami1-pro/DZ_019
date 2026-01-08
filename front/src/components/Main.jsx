import { useEffect, useState, useCallback } from "react";
import { getOrders, getDrugs, getStats, advanceDay, testConnection } from "../requests";
import OrderCard from "./ui/OrderCard";
import DrugCard from "./ui/DrugCard";
import AddOrder from "./forms/AddOrder";
import AddDrug from "./forms/AddDrug";

export default function Main() {
  const [orders, setOrders] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [stats, setStats] = useState({});
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showAddDrug, setShowAddDrug] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');

  const loadData = useCallback(async () => {
    if (connectionStatus !== 'connected') return;

    setLoading(true);
    setError(null);

    try {
      console.log(`Загрузка данных для вкладки: ${activeTab}`);

      if (activeTab === 'orders') {
        const [ordersData, statsData] = await Promise.all([
          getOrders(),
          getStats()
        ]);
        console.log('Заказы получены:', ordersData);
        console.log('Статистика получена:', statsData);
        setOrders(ordersData);
        setStats(statsData);
      } else {
        const drugsData = await getDrugs();
        console.log('Препараты получены:', drugsData);
        setDrugs(drugsData);
      }
    } catch (error) {
      console.error("Ошибка при загрузке данных:", error);
      setError(`Ошибка при загрузке данных: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [activeTab, connectionStatus]);

  useEffect(() => {
    // Сначала проверяем подключение к серверу
    checkServerConnection();
  }, []);

  useEffect(() => {
    if (connectionStatus === 'connected') {
      loadData();
    }
  }, [activeTab, connectionStatus, loadData]);

  const checkServerConnection = async () => {
    try {
      setConnectionStatus('checking');
      const result = await testConnection();
      if (result.success) {
        console.log('Подключение к серверу успешно:', result.message);
        setConnectionStatus('connected');
      } else {
        console.error('Ошибка подключения к серверу:', result.message);
        setConnectionStatus('error');
        setError(`Не удалось подключиться к серверу: ${result.message}`);
      }
    } catch (error) {
      console.error('Ошибка при проверке подключения:', error);
      setConnectionStatus('error');
      setError(`Ошибка при проверке подключения: ${error.message}`);
    }
  };

  const handleAdvanceDay = async () => {
    if (window.confirm(
      "Переключить на следующий день?\n\n" +
      "1. Все заказы на сегодня будут переданы курьерам\n" +
      "2. Остатки препаратов увеличатся на случайные величины\n" +
      "3. Заказы на сегодня будут удалены из активных"
    )) {
      try {
        setLoading(true);
        const result = await advanceDay();

        alert(`✅ ${result.message}\n\n` +
              `• Передано заказов: ${result.delivered || 0}\n` +
              `• Пополнено препаратов: ${result.restocked || 0}`);

        await loadData();

      } catch (error) {
        alert(`❌ Ошибка при переключении дня: ${error.message}`);
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleRetryConnection = () => {
    checkServerConnection();
  };

  // Расчет статистики для препаратов
  const getDrugsStats = () => {
    const totalDrugs = drugs.length;
    const inStock = drugs.filter(d => d.stock_quantity > 0).length;
    const prescriptionDrugs = drugs.filter(d => d.requires_prescription).length;
    const lowStock = drugs.filter(d => d.stock_quantity > 0 && d.stock_quantity < 10).length;
    const outOfStock = drugs.filter(d => d.stock_quantity === 0).length;

    return { totalDrugs, inStock, prescriptionDrugs, lowStock, outOfStock };
  };

  const drugsStats = getDrugsStats();

  // Состояние подключения
  if (connectionStatus === 'checking') {
    return (
      <main className="main-block">
        <div className="container">
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Проверка подключения к серверу...</p>
          </div>
        </div>
      </main>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <main className="main-block">
        <div className="container">
          <div className="error-message">
            <h3><i className="fas fa-exclamation-triangle"></i> Ошибка подключения</h3>
            <p>Не удалось подключиться к серверу. Возможные причины:</p>
            <ul style={{ margin: '15px 0', paddingLeft: '20px' }}>
              <li>Сервер не запущен</li>
              <li>Неправильный адрес сервера</li>
              <li>Проблемы с сетью</li>
            </ul>
            <p><strong>Что делать:</strong></p>
            <ol style={{ margin: '15px 0', paddingLeft: '20px' }}>
              <li>Убедитесь, что сервер запущен (команда: node server.js)</li>
              <li>Проверьте, что сервер работает на порту 3001</li>
              <li>Перезагрузите страницу</li>
            </ol>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="filed-button" onClick={handleRetryConnection}>
                <i className="fas fa-sync-alt"></i> Проверить снова
              </button>
              <button className="secondary-button" onClick={() => window.location.reload()}>
                <i className="fas fa-redo"></i> Перезагрузить страницу
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-block">
      {/* Верхняя панель с вкладками и действиями */}
      <div className="container">
        <div className="main-block-menu">
          {/* Вкладки */}
          <div className="tabs">
            <button
              className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <i className="fas fa-clipboard-list" style={{ marginRight: '8px' }}></i>
              Заказы
            </button>
            <button
              className={`tab-button ${activeTab === 'drugs' ? 'active' : ''}`}
              onClick={() => setActiveTab('drugs')}
            >
              <i className="fas fa-pills" style={{ marginRight: '8px' }}></i>
              Препараты
            </button>
          </div>

          {/* Панель действий */}
          <div className="action-buttons">
            {activeTab === 'orders' && !showAddOrder && (
              <button
                className="filed-button"
                onClick={() => {
                  setShowAddOrder(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <i className="fas fa-plus"></i>
                Новый заказ
              </button>
            )}

            {activeTab === 'drugs' && !showAddDrug && (
              <button
                className="filed-button"
                onClick={() => {
                  setShowAddDrug(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <i className="fas fa-plus"></i>
                Новый препарат
              </button>
            )}

            <button
              className="secondary-button"
              onClick={handleAdvanceDay}
              title="Переключить на следующий день"
            >
              <i className="fas fa-forward"></i>
              Следующий день
            </button>

            <button
              className="unfiled-button"
              onClick={handleRefresh}
              title="Обновить данные"
            >
              <i className="fas fa-sync-alt"></i>
              Обновить
            </button>
          </div>
        </div>
      </div>

      {/* Ошибка загрузки данных */}
      {error && (
        <div className="container">
          <div className="error-message">
            <h3><i className="fas fa-exclamation-triangle"></i> Ошибка</h3>
            <p>{error}</p>
            <button
              className="filed-button"
              onClick={handleRefresh}
              style={{ marginTop: '10px' }}
            >
              <i className="fas fa-sync-alt"></i> Попробовать снова
            </button>
          </div>
        </div>
      )}

      {/* Формы добавления */}
      <div className="container">
        {(showAddOrder || showAddDrug) && (
          <div className="main-block-form">
            {showAddOrder && (
              <AddOrder
                setShown={setShowAddOrder}
                onSuccess={() => {
                  setShowAddOrder(false);
                  loadData();
                }}
              />
            )}
            {showAddDrug && (
              <AddDrug
                setShown={setShowAddDrug}
                onSuccess={() => {
                  setShowAddDrug(false);
                  loadData();
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Контент в зависимости от активной вкладки */}
      <div className="container">
        {activeTab === 'orders' ? (
          <>
            {/* Статистика для заказов */}
            <div className="stats-summary">
              <div className="stat-card">
                <span className="stat-value">{stats.active_orders || orders.length || 0}</span>
                <span className="stat-label">Активных заказов</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.today_orders ||
                  orders.filter(o => {
                    const orderDate = new Date(o.order_date).toDateString();
                    const today = new Date().toDateString();
                    return orderDate === today;
                  }).length || 0}</span>
                <span className="stat-label">На сегодня</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.low_stock_drugs || 0}</span>
                <span className="stat-label">Мало остатков</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.total_stock || 0}</span>
                <span className="stat-label">Всего препаратов</span>
              </div>
            </div>

            {/* Список заказов */}
            <div className="main-block-list">
              {loading ? (
                <div className="loading">
                  <div className="loading-spinner"></div>
                  <p>Загрузка заказов...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-clipboard" style={{ fontSize: '60px', color: '#4CAF50', marginBottom: '20px' }}></i>
                  <h3>Нет активных заказов</h3>
                  <p>Создайте первый заказ, нажав кнопку "Новый заказ"</p>
                </div>
              ) : (
                orders.map((order) => (
                  <OrderCard
                    key={order.idOrders}
                    data={order}
                    allOrders={orders}
                    onUpdate={loadData}
                  />
                ))
              )}
            </div>
          </>
        ) : (

          <>
            {/* Статистика для препаратов */}
            <div className="stats-summary">
              <div className="stat-card">
                <span className="stat-value">{drugsStats.totalDrugs || 0}</span>
                <span className="stat-label">Всего препаратов</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{drugsStats.inStock || 0}</span>
                <span className="stat-label">В наличии</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{drugsStats.prescriptionDrugs || 0}</span>
                <span className="stat-label">Рецептурных</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{drugsStats.lowStock || 0}</span>
                <span className="stat-label">Мало остатков</span>
              </div>
            </div>

            {/* Список препаратов */}
            <div className="drugs-container">
              {loading ? (
                <div className="loading">
                  <div className="loading-spinner"></div>
                  <p>Загрузка препаратов...</p>
                </div>
              ) : drugs.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-pills" style={{ fontSize: '60px', color: '#4CAF50', marginBottom: '20px' }}></i>
                  <h3>Нет препаратов в базе</h3>
                  <p style={{ marginBottom: '20px' }}>Добавьте препараты для формирования заказов</p>
                  <button
                    className="filed-button"
                    onClick={() => {
                      setShowAddDrug(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <i className="fas fa-plus"></i>
                    Добавить первый препарат
                  </button>
                </div>
              ) : (
                <div className="drugs-grid">
                  {drugs.map((drug) => (
                    <DrugCard
                      key={drug.idDrugs}
                      drug={drug}
                      onUpdate={loadData}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}