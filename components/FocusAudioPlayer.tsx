import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../store';

// Helper to generate Brown Noise buffer
const createBrownNoiseBuffer = (ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 2; // 2 seconds loop
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Compensate for gain
    }
    return buffer;
};

export const FocusAudioPlayer: React.FC = () => {
    const { focus, soundEnabled } = useStore();
    const audioRef = useRef<HTMLAudioElement>(null);
    const [useFallback, setUseFallback] = useState(false);
    
    // Web Audio API Refs for Fallback
    const audioCtxRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

    // 1. Handle HTML5 Audio (Primary)
    useEffect(() => {
        if (useFallback) return;

        const audio = audioRef.current;
        if (!audio) return;

        if (focus.phase === 'focus' && soundEnabled) {
            audio.volume = 0.5;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn("MP3 Playback failed:", error);
                    // If error is NotSupported or similar, we might want to trigger fallback, 
                    // but usually onError handles the file missing case.
                });
            }
        } else {
            audio.pause();
            audio.currentTime = 0;
        }
    }, [focus.phase, soundEnabled, useFallback]);

    // 2. Handle Web Audio Fallback (Secondary)
    useEffect(() => {
        if (!useFallback) return;

        const cleanup = () => {
            if (sourceNodeRef.current) {
                try { sourceNodeRef.current.stop(); } catch(e) {}
                sourceNodeRef.current.disconnect();
                sourceNodeRef.current = null;
            }
        };

        if (focus.phase === 'focus' && soundEnabled) {
            // Initialize Context if needed
            if (!audioCtxRef.current) {
                const Ctx = window.AudioContext || (window as any).webkitAudioContext;
                if (Ctx) {
                    audioCtxRef.current = new Ctx();
                    gainNodeRef.current = audioCtxRef.current.createGain();
                    gainNodeRef.current.connect(audioCtxRef.current.destination);
                    gainNodeRef.current.gain.value = 0.05; // Low volume for noise
                }
            }

            const ctx = audioCtxRef.current;
            const gain = gainNodeRef.current;

            if (ctx && gain) {
                // Ensure context is running (browser autoplay policy)
                if (ctx.state === 'suspended') {
                    ctx.resume();
                }

                // Create and start source
                const buffer = createBrownNoiseBuffer(ctx);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.loop = true;
                source.connect(gain);
                source.start();
                sourceNodeRef.current = source;
            }
        } else {
            cleanup();
        }

        return cleanup;
    }, [focus.phase, soundEnabled, useFallback]);

    // Handle missing file or bad format
    const handleError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
        console.warn("FocusAudioPlayer: MP3 failed to load. Switching to Brown Noise generator.");
        setUseFallback(true);
    };

    if (useFallback) return null; // Headless when using Web Audio

    return (
        <audio 
            ref={audioRef} 
            src="/focus-loop-1.mp3" 
            loop 
            preload="auto"
            onError={handleError}
        />
    );
};