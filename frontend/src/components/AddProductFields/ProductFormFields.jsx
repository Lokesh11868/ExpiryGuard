import { Mic, MicOff, Loader2 } from 'lucide-react';
import { isValidDate } from '../../utils/dateUtils';
import DateCalculator from './DateCalculator';
import VoiceInterface from './VoiceInterface';

const ProductFormFields = ({
    formData,
    setFormData,
    isListening,
    handleMicClick,
    audioLevel,
    voiceTranscript,
    isProcessingVoice,
    useBestBefore,
    setUseBestBefore,
    manufacturingDate,
    setManufacturingDate,
    bestBeforeMonths,
    setBestBeforeMonths,
    calculatedExpiryDate
}) => {
    return (
        <div className="glass-card p-5 sm:p-8 space-y-6">
            <div className="pb-3 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Product Details</h2>
            </div>

            <div className="space-y-6">
                {/* Product Name */}
                <div>
                    <label htmlFor="product_name" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                        Product Name *
                    </label>
                    <div className="flex gap-2">
                        <input
                            id="product_name"
                            name="product_name"
                            type="text"
                            placeholder="e.g. Milk"
                            className="input-premium py-2.5"
                            value={formData.product_name}
                            onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                            autoComplete="off"
                            required
                        />
                        <button
                            type="button"
                            onClick={handleMicClick}
                            disabled={isProcessingVoice}
                            title={isListening ? 'Stop listening' : 'Start voice input'}
                            className={`flex-shrink-0 p-2.5 rounded-lg transition-all duration-300 ${isListening
                                ? 'bg-rose-500 text-white shadow-md shadow-rose-200'
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-indigo-500 border border-slate-200'
                                } disabled:opacity-50`}
                        >
                            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                    </div>

                    <VoiceInterface
                        isListening={isListening}
                        audioLevel={audioLevel}
                        voiceTranscript={voiceTranscript}
                        isProcessingVoice={isProcessingVoice}
                    />
                </div>

                {/* Category */}
                <div>
                    <label htmlFor="category" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                        Category
                    </label>
                    <select
                        id="category"
                        name="category"
                        className="input-premium py-2.5 appearance-none"
                        value={formData.category || 'Other'}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                        <option value="Dairy">Dairy</option>
                        <option value="Bakery">Bakery</option>
                        <option value="Meat">Meat</option>
                        <option value="Medicine">Medicine</option>
                        <option value="Drinks">Drinks</option>
                        <option value="Vegetables">Vegetables</option>
                        <option value="Fruits">Fruits</option>
                        <option value="Snacks">Snacks</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                {/* Expiry Date */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="expiry_date" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Expiry Date *
                        </label>
                        <button
                            type="button"
                            onClick={() => setUseBestBefore(!useBestBefore)}
                            className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-0.5 rounded transition-colors uppercase"
                        >
                            {useBestBefore ? 'Switch to Direct' : 'Use Calculator'}
                        </button>
                    </div>

                    {!useBestBefore ? (
                        <div className="space-y-1">
                            <input
                                id="expiry_date"
                                name="expiry_date"
                                type="text"
                                placeholder="DD / MM / YYYY"
                                className={`input-premium text-center font-bold tracking-widest text-base py-2.5 ${formData.expiry_date && formData.expiry_date.length === 10 && !isValidDate(formData.expiry_date)
                                    ? 'border-rose-500 bg-rose-50'
                                    : ''
                                    }`}
                                value={formData.expiry_date}
                                onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                                maxLength="10"
                                autoComplete="off"
                                required
                            />
                        </div>
                    ) : (
                        <DateCalculator
                            manufacturingDate={manufacturingDate}
                            setManufacturingDate={setManufacturingDate}
                            bestBeforeMonths={bestBeforeMonths}
                            setBestBeforeMonths={setBestBeforeMonths}
                            calculatedExpiryDate={calculatedExpiryDate}
                        />
                    )}
                </div>
            </div>

            <div className="pt-4">
                <button
                    type="submit"
                    className="btn-premium w-full !py-3.5 shadow-indigo-100 font-bold tracking-wide"
                >
                    Confirm Product
                </button>
            </div>
        </div>
    );
};

export default ProductFormFields;


