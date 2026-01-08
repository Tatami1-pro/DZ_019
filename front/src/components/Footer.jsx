export default function Footer() {
    const currentYear = new Date().getFullYear();
    return (
        <footer className="footer-block">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-left">
                        <p>Аптечная система управления заказами</p>
                    </div>
                    <div className="footer-right">
                        <p>© {currentYear} Аптека "Здоровье". Все права защищены.</p>
                    </div>
                </div>
            </div>
        </footer>
    );
}