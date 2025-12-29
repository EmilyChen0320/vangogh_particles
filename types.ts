export type ColorMode = 'original' | 'starry_night' | 'sunflowers' | 'self_portrait';

export interface ParticleSettings {
  particleCount: number;
  baseSize: number;
  minLife: number;
  maxLife: number;
  alpha: number;
  flowStrength: number; // How much they follow image contours
  noiseStrength: number; // Randomness
  colorSaturation: number; // Color boost
  brightnessThreshold: number; // Only draw on visible areas
  strokeLength: number;
  colorMode: ColorMode;
}

export interface AudioSettings {
  sensitivity: number; // Overall volume multiplier
  bassInfluence: number; // How much bass affects size
  trebleInfluence: number; // How much treble affects speed/jitter
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  age: number;
  size: number;
  lastX: number;
  lastY: number;
}

export interface AudioData {
  bass: number;   // 0-255
  mid: number;    // 0-255
  treble: number; // 0-255
  average: number;// 0-255
}