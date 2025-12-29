import React, { useEffect, useRef, useCallback } from 'react';
import { Particle, ParticleSettings, AudioSettings, AudioData, ColorMode } from '../types';
import { AudioHandler } from '../utils/audioUtils';

interface Props {
  settings: ParticleSettings;
  audioSettings: AudioSettings;
  audioHandler: AudioHandler;
}

// Optimized Van Gogh Palettes
const PALETTES = {
  sunflowers: [
    { r: 255, g: 220, b: 50 }, // Bright Yellow
    { r: 210, g: 160, b: 40 }, // Ochre
    { r: 160, g: 190, b: 140 },// Pale Green
    { r: 90, g: 120, b: 80 },  // Leaf Green
    { r: 250, g: 245, b: 220 },// Cream
    { r: 140, g: 70, b: 20 },  // Brown
  ],
  self_portrait: [
    { r: 180, g: 70, b: 50 },  // Reddish Beard
    { r: 70, g: 90, b: 60 },   // Olive
    { r: 40, g: 60, b: 80 },   // Slate Blue
    { r: 220, g: 190, b: 160 },// Pale Skin
    { r: 60, g: 90, b: 180 },  // Jacket Blue
    { r: 200, g: 100, b: 50 }, // Orange accent
  ]
};

// Simulation resolution (downscaled for performance)
const SIM_WIDTH = 320;
const SIM_HEIGHT = 180;

const VanGoghRenderer: React.FC<Props> = ({ settings, audioSettings, audioHandler }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Offscreen canvas for low-res analysis (Crucial for performance)
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const startVideo = async () => {
      if (videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              width: { ideal: 1280 }, 
              height: { ideal: 720 },
              frameRate: { ideal: 30 }
            }
          });
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        } catch (err) {
          console.error("Error accessing webcam:", err);
        }
      }
    };
    startVideo();
  }, []);

  // Reset particles when important settings change dramatically
  useEffect(() => {
    // Optional: Clear canvas or reset particles on mode change
  }, [settings.colorMode]);

  const spawnParticle = useCallback((w: number, h: number): Particle => {
    const lifeBase = Math.max(5, settings.strokeLength);
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      life: lifeBase * (0.8 + Math.random() * 0.5),
      maxLife: lifeBase * 1.5,
      age: Math.random() * 5, // Start slightly aged
      size: settings.baseSize * (0.8 + Math.random() * 0.6), // Size variation
      lastX: 0,
      lastY: 0
    };
  }, [settings]);

  // Optimized color matching
  const resolveColor = (r: number, g: number, b: number) => {
    // Calculate Grayscale / Luminance
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // SPECIAL MODE: STARRY NIGHT
    // Strictly maps luminance to the Starry Night palette (Blue -> Yellow)
    if (settings.colorMode === 'starry_night') {
        // Add noise to prevent flat banding
        const noise = (Math.random() - 0.5) * 15;
        const val = Math.max(0, Math.min(255, gray + noise));

        if (val < 50) return { r: 10, g: 15, b: 50 };   // Deepest Indigo
        if (val < 90) return { r: 25, g: 55, b: 130 };  // Deep Blue
        if (val < 140) return { r: 50, g: 100, b: 190 };// Mid Blue
        if (val < 180) return { r: 90, g: 160, b: 220 };// Sky Blue
        if (val < 220) return { r: 230, g: 190, b: 60 };// Gold
        return { r: 250, g: 245, b: 180 };              // White/Moon
    }

    // 1. Boost Saturation for other modes
    let satR = gray + (r - gray) * settings.colorSaturation;
    let satG = gray + (g - gray) * settings.colorSaturation;
    let satB = gray + (b - gray) * settings.colorSaturation;

    if (settings.colorMode === 'original') {
      return { 
        r: Math.min(255, Math.max(0, satR)), 
        g: Math.min(255, Math.max(0, satG)), 
        b: Math.min(255, Math.max(0, satB)) 
      };
    }

    // 2. Palette Mapping
    const palette = PALETTES[settings.colorMode as keyof typeof PALETTES];
    let closestDist = Infinity;
    let closest = palette[0];

    // Weighted Euclidean distance (Human eye is more sensitive to green)
    for (let i = 0; i < palette.length; i++) {
      const c = palette[i];
      const dr = (c.r - satR) * 0.3;
      const dg = (c.g - satG) * 0.59;
      const db = (c.b - satB) * 0.11;
      const dist = dr*dr + dg*dg + db*db;
      if (dist < closestDist) {
        closestDist = dist;
        closest = c;
      }
    }

    // 3. Blend: Keep some luminance from original to preserve detail
    const blend = 0.7; // Stronger palette snap
    return {
      r: Math.floor(closest.r * blend + satR * (1 - blend)),
      g: Math.floor(closest.g * blend + satG * (1 - blend)),
      b: Math.floor(closest.b * blend + satB * (1 - blend))
    };
  };

  const updateParticles = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    analysisCtx: CanvasRenderingContext2D,
    audioData: AudioData
  ) => {
    // 1. Analysis Phase (on small buffer)
    const pixelData = analysisCtx.getImageData(0, 0, SIM_WIDTH, SIM_HEIGHT).data;
    
    const scaleX = SIM_WIDTH / width;
    const scaleY = SIM_HEIGHT / height;

    // Manage particle count
    const targetCount = Math.floor(settings.particleCount);
    const currentCount = particlesRef.current.length;
    
    // Aggressive spawning to reach target count quickly
    if (currentCount < targetCount) {
      const spawnRate = Math.min(500, targetCount - currentCount); 
      for (let i = 0; i < spawnRate; i++) { 
        const p = spawnParticle(width, height);
        p.lastX = p.x;
        p.lastY = p.y;
        particlesRef.current.push(p);
      }
    } else if (currentCount > targetCount) {
      particlesRef.current.splice(targetCount);
    }

    timeRef.current += 0.005;

    // Audio reactivity
    const bassNorm = audioData.bass / 255;
    const trebleNorm = audioData.treble / 255;
    
    // Base physics parameters
    const flowStrength = settings.flowStrength * 2.5;
    const noiseStrength = settings.noiseStrength;
    const speedBase = 2 + (trebleNorm * audioSettings.trebleInfluence * 4);
    const sizeMod = 1 + (bassNorm * audioSettings.bassInfluence * 0.8);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    particlesRef.current.forEach(p => {
      // Respawn logic
      if (p.age > p.life || p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50) {
         const newP = spawnParticle(width, height);
         p.x = newP.x; p.y = newP.y; p.life = newP.life; p.age = 0;
         p.lastX = p.x; p.lastY = p.y;
         return;
      }

      // Map to simulation grid
      const simX = Math.floor(p.x * scaleX);
      const simY = Math.floor(p.y * scaleY);
      
      // Boundary check for simulation grid
      if (simX < 0 || simX >= SIM_WIDTH || simY < 0 || simY >= SIM_HEIGHT) {
         // FIX: Force immediate respawn instead of just killing (which created zombies)
         const newP = spawnParticle(width, height);
         p.x = newP.x; p.y = newP.y; p.life = newP.life; p.age = 0;
         p.lastX = p.x; p.lastY = p.y;
         return;
      }

      const idx = (simY * SIM_WIDTH + simX) * 4;
      const r = pixelData[idx];
      const g = pixelData[idx + 1];
      const b = pixelData[idx + 2];
      const brightness = (r + g + b) / 765.0; // 0-1

      if (brightness * 100 < settings.brightnessThreshold) {
          p.age += 1; 
      }

      // --- Flow Field (Sobel) ---
      const range = 1; 
      const idxRight = (Math.min(simY, SIM_HEIGHT-1) * SIM_WIDTH + Math.min(simX + range, SIM_WIDTH-1)) * 4;
      const idxDown = (Math.min(simY + range, SIM_HEIGHT-1) * SIM_WIDTH + Math.min(simX, SIM_WIDTH-1)) * 4;
      
      const bRight = (pixelData[idxRight] + pixelData[idxRight+1] + pixelData[idxRight+2]) / 765.0;
      const bDown = (pixelData[idxDown] + pixelData[idxDown+1] + pixelData[idxDown+2]) / 765.0;
      
      const dx = bRight - brightness;
      const dy = bDown - brightness;
      
      let angle = Math.atan2(dy, dx) + Math.PI / 2;

      // --- Turbulence ---
      const largeNoise = Math.sin(p.x * 0.002 + timeRef.current) * Math.cos(p.y * 0.002);
      const detailNoise = Math.sin(p.x * 0.02 + p.y * 0.02 + timeRef.current * 2);
      
      angle += (largeNoise * 1.5 + detailNoise * 0.5) * noiseStrength;

      // Update Velocity
      p.vx += Math.cos(angle) * 0.2;
      p.vy += Math.sin(angle) * 0.2;
      
      const currentSpeed = speedBase * (0.5 + brightness * 0.5);
      
      p.vx *= 0.85; 
      p.vy *= 0.85;
      
      p.x += p.vx * currentSpeed;
      p.y += p.vy * currentSpeed;

      // --- Rendering ---
      const col = resolveColor(r, g, b);
      
      const lifeProgress = p.age / p.life;
      const alpha = settings.alpha * (lifeProgress < 0.2 ? lifeProgress * 5 : 1) * (1 - Math.pow(lifeProgress, 4));
      
      const strokeWidth = p.size * sizeMod * (0.6 + brightness * 0.4);

      const dist = Math.hypot(p.x - p.lastX, p.y - p.lastY);
      
      if (dist > 2 || p.age === 0) {
          const cpX = (p.lastX + p.x) / 2;
          const cpY = (p.lastY + p.y) / 2;

          // Main Paint Stroke
          ctx.beginPath();
          ctx.moveTo(p.lastX, p.lastY);
          ctx.quadraticCurveTo(cpX, cpY, p.x, p.y);
          ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha})`;
          ctx.lineWidth = strokeWidth;
          ctx.stroke();

          // Highlight (Starry Night High Contrast)
          if (settings.colorMode === 'starry_night' && brightness > 0.7) {
             ctx.beginPath();
             ctx.moveTo(p.lastX, p.lastY);
             ctx.quadraticCurveTo(cpX, cpY, p.x, p.y);
             ctx.strokeStyle = `rgba(255, 255, 220, ${alpha * 0.6})`;
             ctx.lineWidth = strokeWidth * 0.4;
             ctx.stroke(); 
          } 
          // Regular Highlight
          else if (Math.random() > 0.92) {
            ctx.beginPath();
            ctx.moveTo(p.lastX, p.lastY);
            ctx.quadraticCurveTo(cpX, cpY, p.x, p.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
            ctx.lineWidth = strokeWidth * 0.2;
            ctx.stroke();
          }

          p.lastX = p.x;
          p.lastY = p.y;
      }

      p.age++;
    });

  }, [settings, spawnParticle, audioSettings]);

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video || video.readyState !== 4) {
      requestRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    if (!analysisCanvasRef.current) {
        analysisCanvasRef.current = document.createElement('canvas');
        analysisCanvasRef.current.width = SIM_WIDTH;
        analysisCanvasRef.current.height = SIM_HEIGHT;
    }
    const analysisCtx = analysisCanvasRef.current.getContext('2d', { 
        willReadFrequently: true,
        alpha: false 
    });
    
    if (!analysisCtx) return;

    analysisCtx.drawImage(video, 0, 0, SIM_WIDTH, SIM_HEIGHT);

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Fade Logic
    let fadeAlpha = 0.05; // Very slow fade for layering
    
    let fadeColor = `rgba(0, 0, 0, ${fadeAlpha})`;
    // Deep blue background for Starry Night to fill gaps with "night sky"
    if (settings.colorMode === 'starry_night') fadeColor = `rgba(5, 10, 30, ${fadeAlpha})`;
    else if (settings.colorMode === 'sunflowers') fadeColor = `rgba(30, 20, 5, ${fadeAlpha})`;
    else if (settings.colorMode === 'self_portrait') fadeColor = `rgba(20, 15, 10, ${fadeAlpha})`;

    ctx.fillStyle = fadeColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const audioData = audioHandler.getAnalysis();
    updateParticles(ctx, canvas.width, canvas.height, analysisCtx, audioData);

    requestRef.current = requestAnimationFrame(renderFrame);
  }, [settings, audioHandler, updateParticles]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [renderFrame]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden">
      <video 
        ref={videoRef} 
        className="absolute opacity-0 pointer-events-none" 
        playsInline 
        muted 
      />
      
      <canvas 
        ref={canvasRef} 
        className="w-full h-full object-contain shadow-2xl"
        style={{ 
            backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDMiLz4KPC9zdmc+")',
            backgroundColor: settings.colorMode === 'starry_night' ? '#02040a' : '#0f172a'
        }}
      />
    </div>
  );
};

export default VanGoghRenderer;