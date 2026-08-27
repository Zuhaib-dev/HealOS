"use client";

import { useEffect } from "react";

export function SoundProvider() {
  useEffect(() => {
    let audioCtx: AudioContext | null = null;

    const playBeep = () => {
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (audioCtx.state === "suspended") {
          audioCtx.resume();
        }

        // Exact reproduction of the web-haptics "playClick" sound from ramx.in
        // It's a filtered white noise burst — NOT an oscillator tone.

        // 1. Create a bandpass filter (crisp click character)
        const filter = audioCtx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 4000;
        filter.Q.value = 8;

        // 2. Create gain node for volume
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 0.25; // 0.5 * intensity(0.5)

        // 3. Connect: buffer -> filter -> gain -> speakers
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // 4. Create a very short noise buffer (4ms of audio)
        const bufferSize = Math.floor(0.004 * audioCtx.sampleRate);
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const channelData = noiseBuffer.getChannelData(0);

        // 5. Fill with exponentially decaying white noise (the secret sauce!)
        for (let i = 0; i < bufferSize; i++) {
          channelData[i] = (2 * Math.random() - 1) * Math.exp(-i / 25);
        }

        // 6. Play it
        const source = audioCtx.createBufferSource();
        source.buffer = noiseBuffer;
        source.connect(filter);
        source.onended = () => source.disconnect();
        source.start();
      } catch (e) {
        console.error("Audio playback failed", e);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // We only want to play the beep if a button, link, or clickable element is clicked
      if (
        target.closest("button") ||
        target.closest("a") ||
        target.closest('[role="button"]') ||
        target.closest('[role="menuitem"]') ||
        target.closest('[role="tab"]')
      ) {
        playBeep();
      }
    };

    window.addEventListener("click", handleClick, { capture: true });

    return () => {
      window.removeEventListener("click", handleClick, { capture: true });
    };
  }, []);

  return null;
}
