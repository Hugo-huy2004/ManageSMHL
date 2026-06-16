import { useState } from 'react';
import dbService from '../services/DatabaseService';
import logoImg from '../LOGO/LOGO.jpg';
import { APP_TITLE, CAMP_EVENT_LINE } from '../constants/branding';

export default function Login({ onLoginSuccess }) {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await dbService.login(password);
            if (res.success) {
                onLoginSuccess();
            } else {
                setError('Mật mã quản trị không đúng.');
            }
        } catch (err) {
            setError(err.message || 'Lỗi kết nối Server.');
        }
    };

    return (
        <div className="login-screen">
            <div className="login-shell">
                <section className="login-identity" aria-label="Thông tin hệ thống">
                    <div className="login-logo-wrap">
                        <img src={logoImg} alt="Logo Liên Đoàn" className="login-emblem" />
                    </div>
                    <div>
                        <p className="login-kicker">Hệ thống quản trị</p>
                        <h1 className="login-title">{APP_TITLE}</h1>
                        <p className="login-subtitle">{CAMP_EVENT_LINE}</p>
                    </div>
                    <div className="login-meta">
                        <span>Danh sách</span>
                        <span>Điểm danh</span>
                        <span>Xuất báo cáo</span>
                    </div>
                </section>

                <section className="login-panel" aria-label="Đăng nhập">
                    <div className="login-panel-header">
                        <span className="login-panel-mark">H9</span>
                        <div>
                            <h2>Đăng nhập</h2>
                            <p>Nhập mật mã quản trị để tiếp tục.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label className="form-label" htmlFor="password">Mật mã quản trị</label>
                            <div className="input-password-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    className="input-control"
                                    placeholder="Nhập mật mã"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    autoFocus
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Ẩn mật mã' : 'Hiện mật mã'}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && <div className="login-error" role="alert">{error}</div>}

                        <button type="submit" className="btn login-submit">
                            Đăng nhập
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                <polyline points="10 17 15 12 10 7" />
                                <line x1="15" y1="12" x2="3" y2="12" />
                            </svg>
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
}
