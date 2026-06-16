import logoImg from '../../LOGO/LOGO.jpg';
import { ORG_NAME, DIOCESE_NAME } from '../../constants/branding';

// The mandatory official letterhead — logo + organization name + diocese name
// + list title — required on every printed or exported list (công văn
// standard). Rendered once per tab; hidden on screen, shown only when
// printing (see .print-letterhead in App.css) so every printed page from
// any tab (Danh sách / Thống kê / Đội) looks exactly the same.
// `forceVisible` renders the letterhead on-screen too (e.g. inside an
// in-app print preview modal) instead of only when actually printing.
export default function PrintLetterhead({ title, forceVisible = false }) {
    return (
        <div className="print-letterhead" style={forceVisible ? { display: 'flex' } : undefined}>
            <img src={logoImg} alt="Logo" className="print-letterhead-logo" />
            <div className="print-letterhead-org">{ORG_NAME}</div>
            <div className="print-letterhead-diocese">{DIOCESE_NAME}</div>
            {title && <div className="print-letterhead-title">{title.toUpperCase()}</div>}
        </div>
    );
}
