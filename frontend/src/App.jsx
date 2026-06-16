import { useState, useEffect } from 'react';
import dbService from './services/DatabaseService';
import Login from './components/Login';
import ThemeToggler from './components/ThemeToggler';
import StatsTab from './components/StatsTab';
import ListTab from './components/ListTab';
import TeamsTab from './components/TeamsTab';
import ExportTab from './components/ExportTab';
import ToastCenter from './components/ToastCenter';
import logoImg from './LOGO/LOGO.jpg';
import { ORG_NAME, DIOCESE_NAME, CAMP_SHORT_NAME } from './constants/branding';
import './App.css';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(dbService.isLoggedIn());
    const [activeTab, setActiveTab] = useState('thongke');
    const [trainees, setTrainees] = useState([]);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toasts, setToasts] = useState([]);

    const dismissToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const notify = ({ title = 'Thông báo', message, type = 'info', duration = 4200, actionLabel, onAction }) => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts(prev => [...prev, { id, title, message, type, actionLabel, onAction }]);
        if (duration > 0) {
            setTimeout(() => dismissToast(id), duration);
        }
    };

    const confirmToast = (message, onConfirm, title = 'Cần xác nhận') => {
        notify({
            title,
            message,
            type: 'warning',
            duration: 10000,
            actionLabel: 'Xác nhận',
            onAction: onConfirm
        });
    };

    const fetchData = async () => {
        if (!dbService.isLoggedIn()) return;
        setLoading(true);
        try {
            const [fetchedTrainees, fetchedColumns] = await Promise.all([
                dbService.getAllTrainees(),
                dbService.getAllColumns()
            ]);
            setTrainees(fetchedTrainees);
            setColumns(fetchedColumns);
        } catch (err) {
            console.error("Error loading fullstack database content:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isLoggedIn) return;
        
        queueMicrotask(() => {
            fetchData();
        });

        // Subscribe to server WebSocket updates
        const unsubscribe = dbService.subscribe(() => {
            fetchData();
        });

        return () => {
            unsubscribe();
        };
    }, [isLoggedIn]);

    const handleLoginSuccess = () => {
        setIsLoggedIn(true);
    };

    const handleLogout = () => {
        confirmToast("Xác nhận đăng xuất khỏi hệ thống?", () => {
            dbService.logout();
            setIsLoggedIn(false);
            setTrainees([]);
            setColumns([]);
            notify({ type: 'success', title: 'Đã đăng xuất', message: 'Phiên làm việc đã kết thúc.' });
        });
    };

    if (!isLoggedIn) {
        return (
            <>
                <Login onLoginSuccess={handleLoginSuccess} />
                <ToastCenter toasts={toasts} onClose={dismissToast} />
            </>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Header */}
            <header className="no-print">
                <div className="logo-section">
                    <img src={logoImg} alt="Logo" className="header-logo" />
                    <div className="logo-title-block">
                        <div className="logo-title">{ORG_NAME}</div>
                        <div className="logo-subtitle"><span>{DIOCESE_NAME}</span> · {CAMP_SHORT_NAME}</div>
                    </div>
                </div>
                <div className="header-actions">
                    <ThemeToggler />
                    <button className="btn btn-secondary" onClick={handleLogout} style={{ width: 'auto', padding: '8px 16px' }}>
                        Đăng xuất
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '5px' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    </button>
                </div>
            </header>

            {/* Tab Bar */}
            <div className="tab-bar-container no-print">
                <ul className="tab-bar">
                    <li className="tab-item">
                        <button 
                            className={`tab-btn ${activeTab === 'thongke' ? 'active' : ''}`} 
                            onClick={() => setActiveTab('thongke')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                            Thống kê
                        </button>
                    </li>
                    <li className="tab-item">
                        <button 
                            className={`tab-btn ${activeTab === 'danhsach' ? 'active' : ''}`} 
                            onClick={() => setActiveTab('danhsach')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
                            Danh sách
                        </button>
                    </li>
                    <li className="tab-item">
                        <button 
                            className={`tab-btn ${activeTab === 'doi' ? 'active' : ''}`} 
                            onClick={() => setActiveTab('doi')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            Đội
                        </button>
                    </li>
                    <li className="tab-item">
                        <button 
                            className={`tab-btn ${activeTab === 'xuatban' ? 'active' : ''}`} 
                            onClick={() => setActiveTab('xuatban')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                            Xuất bản
                        </button>
                    </li>
                </ul>
            </div>

            {/* Viewport */}
            <main className="app-viewport">
                {loading && (
                    <div className="no-print" style={{ position: 'fixed', top: '15px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--primary)', color: 'white', padding: '6px 16px', borderRadius: '20px', zIndex: 1000, fontSize: '0.8rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                        Đang đồng bộ...
                    </div>
                )}
                
                {activeTab === 'thongke' && <StatsTab trainees={trainees} columns={columns} onRefresh={fetchData} notify={notify} />}
                {activeTab === 'danhsach' && <ListTab trainees={trainees} columns={columns} onRefresh={fetchData} notify={notify} confirmToast={confirmToast} />}
                {activeTab === 'doi' && <TeamsTab trainees={trainees} columns={columns} onRefresh={fetchData} notify={notify} confirmToast={confirmToast} />}
                {activeTab === 'xuatban' && <ExportTab trainees={trainees} columns={columns} notify={notify} />}
            </main>
            <ToastCenter toasts={toasts} onClose={dismissToast} />

            {/* Footer */}
            <footer className="app-footer no-print">
                <p>&copy; {new Date().getFullYear()} {CAMP_SHORT_NAME}. Tất cả quyền được bảo lưu.</p>
                <p style={{ marginTop: '5px' }}>
                    Được thực hiện bởi Trưởng Phêrô Lê Gia Huy - Gx. Chánh toà (HUGO STUDIO) - Ghé thăm website tại{' '}
                    <a href="https://www.hugowishpax.studio" target="_blank" rel="noopener noreferrer">
                        https://www.hugowishpax.studio
                    </a>
                </p>
            </footer>
        </div>
    );
}

export default App;
