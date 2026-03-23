import { Loader2 } from 'lucide-react';

const VoiceInterface = ({ isListening, audioLevel, voiceTranscript, isProcessingVoice }) => {
    if (!isListening && !voiceTranscript && !isProcessingVoice) return null;

    return (
        <div className="mt-2 space-y-2">
            {/* Audio level bar */}
            {isListening && (
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-rose-400 rounded-full transition-all duration-75"
                            style={{ width: `${Math.min(100, (audioLevel / 128) * 100)}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-bold text-rose-500 animate-pulse">REC</span>
                </div>
            )}

            {/* Voice transcript preview */}
            {voiceTranscript && (
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-700 animate-in fade-in">
                    {isProcessingVoice
                        ? <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing speech…</span>
                        : <p className="italic font-medium">&ldquo;{voiceTranscript}&rdquo;</p>
                    }
                </div>
            )}
        </div>
    );
};

export default VoiceInterface;


