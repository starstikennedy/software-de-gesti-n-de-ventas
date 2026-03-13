const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'App.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace 1: daily report grid
content = content.replace(
    '<div className="report-card-sub">{report.cantidadVentas} venta{report.cantidadVentas !== 1 ? \\'s\\' : \\'\\'} realizadas</div>\\r\\n                </div>',
    '<div className="report-card-sub">{report.cantidadVentas} venta{report.cantidadVentas !== 1 ? \\'s\\' : \\'\\'} realizadas</div>\\r\\n                </div>\\r\\n\\r\\n                <div className="report-card big" style={{ borderColor: \\'var(--success)\\', backgroundColor: \\'rgba(76, 175, 80, 0.05)\\' }}>\\r\\n                    <div className="report-card-label">📈 Utilidad (Ganancia Real)</div>\\r\\n                    <div className="report-card-value" style={{ color: \\'var(--success)\\' }}>{fmtMoney(report.totalUtilidad)}</div>\\r\\n                    <div className="report-card-sub">Costo de los productos: {fmtMoney(report.totalCosto)}</div>\\r\\n                </div>'
);

// Fallback for LF
content = content.replace(
    '<div className="report-card-sub">{report.cantidadVentas} venta{report.cantidadVentas !== 1 ? \\'s\\' : \\'\\'} realizadas</div>\\n                </div>',
    '<div className="report-card-sub">{report.cantidadVentas} venta{report.cantidadVentas !== 1 ? \\'s\\' : \\'\\'} realizadas</div>\\n                </div>\\n\\n                <div className="report-card big" style={{ borderColor: \\'var(--success)\\', backgroundColor: \\'rgba(76, 175, 80, 0.05)\\' }}>\\n                    <div className="report-card-label">📈 Utilidad (Ganancia Real)</div>\\n                    <div className="report-card-value" style={{ color: \\'var(--success)\\' }}>{fmtMoney(report.totalUtilidad)}</div>\\n                    <div className="report-card-sub">Costo de los productos: {fmtMoney(report.totalCosto)}</div>\\n                </div>'
);

// Replace 2: report grid class
content = content.replace('className="report-grid-2"', 'className="report-grid-3"');

// Replace 3: weekly report grid
content = content.replace(
    '                    <div className="report-card-value" style={{ color: \\'var(--accent)\\' }}>{fmtMoney(report.totalSemana)}</div>\\r\\n                </div>',
    '                    <div className="report-card-value" style={{ color: \\'var(--accent)\\' }}>{fmtMoney(report.totalSemana)}</div>\\r\\n                </div>\\r\\n                <div className="report-card big" style={{ borderColor: \\'var(--success)\\', backgroundColor: \\'rgba(76, 175, 80, 0.05)\\' }}>\\r\\n                    <div className="report-card-label">📈 Utilidad Real</div>\\r\\n                    <div className="report-card-value" style={{ color: \\'var(--success)\\' }}>{fmtMoney(report.totalUtilidadSemana)}</div>\\r\\n                </div>'
);

// Fallback for LF
content = content.replace(
    '                    <div className="report-card-value" style={{ color: \\'var(--accent)\\' }}>{fmtMoney(report.totalSemana)}</div>\\n                </div>',
    '                    <div className="report-card-value" style={{ color: \\'var(--accent)\\' }}>{fmtMoney(report.totalSemana)}</div>\\n                </div>\\n                <div className="report-card big" style={{ borderColor: \\'var(--success)\\', backgroundColor: \\'rgba(76, 175, 80, 0.05)\\' }}>\\n                    <div className="report-card-label">📈 Utilidad Real</div>\\n                    <div className="report-card-value" style={{ color: \\'var(--success)\\' }}>{fmtMoney(report.totalUtilidadSemana)}</div>\\n                </div>'
);

fs.writeFileSync(file, content, 'utf8');
console.log('App.tsx updated successfully');
