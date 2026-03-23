import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { parseVoice } from '../services/productService';

export const useVoiceRecognition = (onSuccess) => {
    const [isListening, setIsListening] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [audioLevel, setAudioLevel] = useState(0);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);

    // refs
    const recogRef = useRef(null);
    const silenceRef = useRef(null);
    const transcriptRef = useRef('');
    const toastRef = useRef(null);
    const audioCtxRef = useRef(null);
    const analyserRef = useRef(null);
    const streamRef = useRef(null);
    const animFrameRef = useRef(null);

    const startAudioViz = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            audioCtxRef.current = ctx;
            const analyser = ctx.createAnalyser();
            analyserRef.current = analyser;
            ctx.createMediaStreamSource(stream).connect(analyser);
            analyser.fftSize = 256;
            const data = new Uint8Array(analyser.frequencyBinCount);
            const tick = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(data);
                setAudioLevel(data.reduce((a, b) => a + b, 0) / data.length);
                animFrameRef.current = requestAnimationFrame(tick);
            };
            tick();
        } catch { /* ignore: viz is cosmetic */ }
    };

    const stopAudioViz = () => {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
        try { audioCtxRef.current?.close(); } catch { }
        audioCtxRef.current = null;
        analyserRef.current = null;
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setAudioLevel(0);
    };

    const stopListening = () => {
        clearTimeout(silenceRef.current);
        silenceRef.current = null;
        try { recogRef.current?.stop(); } catch { }
        recogRef.current = null;
        stopAudioViz();
        toast.dismiss(toastRef.current);
        toastRef.current = null;
        setIsListening(false);
        setAudioLevel(0);
    };

    const sendToBackend = async (text) => {
        setIsProcessingVoice(true);
        setVoiceTranscript(text);
        try {
            const data = await parseVoice(text);
            if (data.error) {
                toast.error('⚠️ ' + data.error);
                setVoiceTranscript('');
            } else {
                onSuccess(data);
                setVoiceTranscript('');
                toast.success('🎙️ Voice input applied!');
            }
        } catch {
            toast.error('Server error parsing voice.');
            setVoiceTranscript('');
        } finally {
            setIsProcessingVoice(false);
        }
    };

    const startListening = () => {
        const hasSR = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        if (!hasSR) {
            return toast.error('Use Chrome or Edge for voice input.');
        }

        navigator.mediaDevices?.getUserMedia({ audio: true })
            .then(stream => {
                stream.getTracks().forEach(t => t.stop());
            })
            .catch(() => {
                toast.error('🚫 Microphone access denied. Allow mic in browser settings.');
                return;
            });

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const r = new SR();
        recogRef.current = r;

        r.lang = 'en-US';
        r.continuous = true;
        r.interimResults = true;
        r.maxAlternatives = 1;

        transcriptRef.current = '';
        setVoiceTranscript('');

        r.onstart = () => {
            setIsListening(true);
            toastRef.current = toast.loading('🎙️ Listening… speak now');
            startAudioViz();
        };

        r.onresult = (event) => {
            let interim = '';
            let finalSoFar = '';
            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalSoFar += event.results[i][0].transcript + ' ';
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            transcriptRef.current = finalSoFar.trim();
            const display = (finalSoFar + interim).trim();
            setVoiceTranscript(display);
            toast.loading(`🎙️ ${display}`, { id: toastRef.current });

            clearTimeout(silenceRef.current);
            if (finalSoFar.trim()) {
                silenceRef.current = setTimeout(() => {
                    r.stop();
                }, 2500);
            }
        };

        r.onerror = (event) => {
            if (event.error === 'no-speech' || event.error === 'aborted') return;
            toast.dismiss(toastRef.current);
            const MSGS = {
                'not-allowed': '🚫 Mic blocked. Allow microphone access.',
                'audio-capture': '🎤 No microphone found.',
                'network': '🌐 Network error.',
            };
            toast.error(MSGS[event.error] ?? `Mic error: ${event.error}`);
            stopListening();
        };

        r.onend = () => {
            stopAudioViz();
            toast.dismiss(toastRef.current);
            toastRef.current = null;
            setIsListening(false);
            const finalText = transcriptRef.current.trim();
            if (finalText) {
                sendToBackend(finalText);
            } else {
                setVoiceTranscript('');
            }
        };

        try {
            r.start();
        } catch {
            toast.error('Could not start microphone. Try again.');
        }
    };

    const handleMicClick = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    return {
        isListening,
        voiceTranscript,
        audioLevel,
        isProcessingVoice,
        handleMicClick
    };
};


