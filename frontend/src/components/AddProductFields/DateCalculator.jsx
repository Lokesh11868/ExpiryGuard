const DateCalculator = ({
    manufacturingDate,
    setManufacturingDate,
    bestBeforeMonths,
    setBestBeforeMonths,
    calculatedExpiryDate
}) => {
    return (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4 animate-in fade-in slide-in-from-right-1">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="mfg_date" className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest">
                        MFG Date
                    </label>
                    <input
                        id="mfg_date"
                        name="mfg_date"
                        type="text"
                        placeholder="DD/MM/YYYY"
                        className="input-premium py-2 text-xs text-center"
                        value={manufacturingDate}
                        onChange={e => setManufacturingDate(e.target.value)}
                        maxLength="10"
                        autoComplete="off"
                    />
                </div>
                <div>
                    <label htmlFor="best_before_months" className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest">
                        Months
                    </label>
                    <input
                        id="best_before_months"
                        name="best_before_months"
                        type="number"
                        placeholder="6"
                        className="input-premium py-2 text-xs text-center"
                        value={bestBeforeMonths}
                        onChange={e => setBestBeforeMonths(e.target.value)}
                    />
                </div>
            </div>
            {calculatedExpiryDate && (
                <div className="text-center pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter mr-2">Calculated:</span>
                    <span className="font-bold text-slate-900">{calculatedExpiryDate}</span>
                </div>
            )}
        </div>
    );
};

export default DateCalculator;


