import dbService from '../../services/DatabaseService';

// Identical "delete this trainee" affordance everywhere a trainee row is shown
// (Danh sách, Thống kê, Đội).
export default function DeleteTraineeButton({ trainee, onRefresh, notify, confirmToast, compact = false }) {
    const handleDelete = () => {
        confirmToast?.(`Xác nhận xóa sa mạc sinh: ${trainee.hoTen}?`, async () => {
            try {
                await dbService.deleteTrainee(trainee._id);
                onRefresh?.();
                notify?.({ type: 'success', title: 'Đã xóa', message: `Đã xóa ${trainee.hoTen}.` });
            } catch (err) {
                notify?.({ type: 'error', title: 'Lỗi xóa', message: err.message });
            }
        }, 'Xóa sa mạc sinh');
    };

    return (
        <button
            type="button"
            className="btn btn-danger no-print"
            onClick={handleDelete}
            title="Xóa sa mạc sinh"
            style={{ padding: compact ? '4px 8px' : '6px 12px', fontSize: '0.8rem', width: 'auto', boxShadow: 'none' }}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
    );
}
