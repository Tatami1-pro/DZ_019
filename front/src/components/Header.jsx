export default function Header() {
    return (
        <header className="header-block">
            <div className="container">
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div className="header-block-left-part">
                        <div className="logo-container">
                            <span className="pharmacy-icon">💊</span>
                            <div className="logo-text">
                                <h1>Аптека "Здоровье"</h1>
                                <p className="subtitle">Система управления заказами</p>
                            </div>
                        </div>
                    </div>
                    <div className="header-block-right-part">
                        <img
                            src="/images/avatar.png"
                            alt="User Avatar"
                            className="header-block-right-part-avatar"
                        />
                        <span className="header-block-right-part-name">
                            Провизор Брицко
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
}