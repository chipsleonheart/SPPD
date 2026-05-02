import React from 'react';

// Pagination component with max 3 buttons displayed
export function Pagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;

    // Logic to show max 3 pages
    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, startPage + 2);

    // Adjust if we are at the end
    if (endPage - startPage < 2 && startPage > 1) {
        startPage = Math.max(1, endPage - 2);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <button 
                onClick={() => onPageChange(currentPage - 1)} 
                disabled={currentPage === 1}
                className="btn btn-outline"
                style={{ padding: '0.25rem 0.75rem' }}
            >
                Prev
            </button>
            
            {pages.map(p => (
                <button 
                    key={p} 
                    onClick={() => onPageChange(p)}
                    className={p === currentPage ? 'btn btn-primary' : 'btn btn-outline'}
                    style={{ padding: '0.25rem 0.75rem', minWidth: '35px' }}
                >
                    {p}
                </button>
            ))}

            <button 
                onClick={() => onPageChange(currentPage + 1)} 
                disabled={currentPage === totalPages}
                className="btn btn-outline"
                style={{ padding: '0.25rem 0.75rem' }}
            >
                Next
            </button>
        </div>
    );
}

// Year and Month Filter Component
export function DateFilter({ month, year, onFilterChange }) {
    const months = [
        { val: '', label: 'Semua Bulan' },
        { val: '1', label: 'Januari' },
        { val: '2', label: 'Februari' },
        { val: '3', label: 'Maret' },
        { val: '4', label: 'April' },
        { val: '5', label: 'Mei' },
        { val: '6', label: 'Juni' },
        { val: '7', label: 'Juli' },
        { val: '8', label: 'Agustus' },
        { val: '9', label: 'September' },
        { val: '10', label: 'Oktober' },
        { val: '11', label: 'November' },
        { val: '12', label: 'Desember' }
    ];

    const currentYear = new Date().getFullYear();
    const years = [''];
    for(let y = currentYear - 2; y <= currentYear + 2; y++) {
        years.push(y.toString());
    }

    return (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
            <label style={{ fontWeight: '500', fontSize: '0.9rem' }}>Filter Waktu:</label>
            <select 
                value={month} 
                onChange={(e) => onFilterChange('month', e.target.value)}
                className="form-control"
                style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
            >
                {months.map(m => (
                    <option key={m.val} value={m.val}>{m.label}</option>
                ))}
            </select>
            
            <select 
                value={year} 
                onChange={(e) => onFilterChange('year', e.target.value)}
                className="form-control"
                style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
            >
                <option value="">Semua Tahun</option>
                {years.filter(y => y !== '').map(y => (
                    <option key={y} value={y}>{y}</option>
                ))}
            </select>
        </div>
    );
}
