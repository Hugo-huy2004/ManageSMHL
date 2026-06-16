export default function ToastCenter({ toasts, onClose }) {
    if (!toasts.length) return null;

    return (
        <div className="toast-stack no-print">
            {toasts.map(toast => (
                <div key={toast.id} className={`toast-card toast-${toast.type || 'info'}`}>
                    <div className="toast-content">
                        <div className="toast-title">{toast.title || 'Thông báo'}</div>
                        <div className="toast-message">{toast.message}</div>
                    </div>
                    <div className="toast-actions">
                        {toast.actionLabel && (
                            <button
                                type="button"
                                className="toast-action-btn"
                                onClick={() => {
                                    toast.onAction?.();
                                    onClose(toast.id);
                                }}
                            >
                                {toast.actionLabel}
                            </button>
                        )}
                        <button type="button" className="toast-close-btn" onClick={() => onClose(toast.id)}>
                            &times;
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
