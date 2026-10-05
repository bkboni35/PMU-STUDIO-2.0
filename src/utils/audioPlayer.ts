// Audio player handling Gemini TTS raw PCM (24kHz) and browser SpeechSynthesis fallback

class AudioPlayerService {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlaying: boolean = false;
  private onPlaybackStateChange?: (playing: boolean) => void;

  public setPlaybackCallback(cb: (playing: boolean) => void) {
    this.onPlaybackStateChange = cb;
  }

  private initAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 24000 });
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  public stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (e) {
        // ignore if already stopped
      }
      this.currentSource = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isPlaying = false;
    this.onPlaybackStateChange?.(false);
  }

  /**
   * Plays base64-encoded raw 16-bit PCM audio (returned by Gemini TTS)
   */
  public async playBase64Pcm(base64Pcm: string, sampleRate = 24000, playbackRate = 1.0): Promise<void> {
    this.stop();

    try {
      const ctx = this.initAudioContext();

      // Decode base64 to binary string
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 16-bit PCM little endian to Float32 array
      const numSamples = Math.floor(bytes.length / 2);
      const float32Array = new Float32Array(numSamples);
      const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

      for (let i = 0; i < numSamples; i++) {
        const int16 = dataView.getInt16(i * 2, true);
        float32Array[i] = int16 < 0 ? int16 / 32768 : int16 / 32767;
      }

      const audioBuffer = ctx.createBuffer(1, numSamples, sampleRate);
      audioBuffer.copyToChannel(float32Array, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackRate;
      source.connect(ctx.destination);

      this.currentSource = source;
      this.isPlaying = true;
      this.onPlaybackStateChange?.(true);

      return new Promise<void>((resolve) => {
        source.onended = () => {
          this.isPlaying = false;
          this.currentSource = null;
          this.onPlaybackStateChange?.(false);
          resolve();
        };
        source.start(0);
      });
    } catch (err) {
      console.warn('PCM playback failed:', err);
      this.isPlaying = false;
      this.onPlaybackStateChange?.(false);
      throw err;
    }
  }

  /**
   * Fallback using browser SpeechSynthesis with matching language voice
   */
  public async speakTextFallback(
    text: string,
    speechCode: string,
    playbackRate = 1.0
  ): Promise<void> {
    this.stop();

    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported on this browser.');
      return;
    }

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = playbackRate;
      utterance.lang = speechCode;

      // Select best matching voice
      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find(
        (v) => v.lang.toLowerCase() === speechCode.toLowerCase() || v.lang.startsWith(speechCode.slice(0, 2))
      );
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onstart = () => {
        this.isPlaying = true;
        this.onPlaybackStateChange?.(true);
      };

      utterance.onend = () => {
        this.isPlaying = false;
        this.onPlaybackStateChange?.(false);
        resolve();
      };

      utterance.onerror = () => {
        this.isPlaying = false;
        this.onPlaybackStateChange?.(false);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

/**
 * Plays a subtle, horse-racing themed brass bugle/fanfare audio notification (Web Audio API)
 * Triggered when arrival status transitions from 'provisoire' to 'officielle'.
 */
export function playOfficialArrivalFanfare(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Subtle, recognizable hippodrome bugle fanfare sequence (G4, C5, E5, G5)
    const notes = [
      { freq: 392.00, start: 0.00, duration: 0.14 }, // G4
      { freq: 523.25, start: 0.15, duration: 0.14 }, // C5
      { freq: 659.25, start: 0.30, duration: 0.14 }, // E5
      { freq: 783.99, start: 0.45, duration: 0.50 }, // G5 (sustained fanfare finish)
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Brass-like triangle waveform
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);

      // Envelope: gentle attack, pleasant decay
      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.22, now + start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch (err) {
    console.warn('Could not play arrival fanfare audio notification:', err);
  }
}

export const audioPlayer = new AudioPlayerService();
