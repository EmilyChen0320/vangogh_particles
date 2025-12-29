import { AudioData } from '../types';

export class AudioHandler {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private audioElement: HTMLAudioElement | null = null;

  constructor() {
    // Lazy init in start to handle browser autoplay policies
  }

  async setup(audioFile: File): Promise<void> {
    if (this.audioContext) {
      await this.audioContext.close();
    }
    
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024; // Good balance between precision and performance
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.src = '';
    }

    this.audioElement = new Audio();
    this.audioElement.src = URL.createObjectURL(audioFile);
    this.audioElement.loop = true;

    this.source = this.audioContext.createMediaElementSource(this.audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    await this.audioElement.play();
  }

  getAnalysis(): AudioData {
    if (!this.analyser || !this.dataArray) {
      return { bass: 0, mid: 0, treble: 0, average: 0 };
    }

    this.analyser.getByteFrequencyData(this.dataArray);

    const binCount = this.analyser.frequencyBinCount;
    
    // Simple frequency banding
    const bassRange = Math.floor(binCount * 0.05); // Bottom 5%
    const midRange = Math.floor(binCount * 0.25);  // Next 20%
    // Treble is the rest

    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;

    for (let i = 0; i < binCount; i++) {
      if (i < bassRange) bassSum += this.dataArray[i];
      else if (i < midRange) midSum += this.dataArray[i];
      else trebleSum += this.dataArray[i];
    }

    return {
      bass: bassSum / bassRange,
      mid: midSum / (midRange - bassRange),
      treble: trebleSum / (binCount - midRange),
      average: (bassSum + midSum + trebleSum) / binCount
    };
  }

  stop() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.audioContext) {
      this.audioContext.suspend();
    }
  }
  
  resume() {
      if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume();
      }
      if (this.audioElement && this.audioElement.paused) {
          this.audioElement.play();
      }
  }
}