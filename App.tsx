import React, { useState, useMemo } from 'react';
import VanGoghRenderer from './components/VanGoghRenderer';
import Controls from './components/Controls';
import { ParticleSettings, AudioSettings } from './types';
import { AudioHandler } from './utils/audioUtils';

const App: React.FC = () => {
  // Default Settings tuned for "Van Gogh" style
  const [settings, setSettings] = useState<ParticleSettings>({
    particleCount: 7000,  // High density for full coverage
    baseSize: 3.5,        // Slightly smaller for detail
    minLife: 10,
    maxLife: 50,
    alpha: 0.9,
    flowStrength: 4.0,    // Strong flow for curves
    noiseStrength: 0.4,
    colorSaturation: 1.4,
    brightnessThreshold: 10,
    strokeLength: 10,     // Short strokes
    colorMode: 'starry_night'
  });

  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    sensitivity: 1.2,
    bassInfluence: 1.5, // Bass controls thickness
    trebleInfluence: 1.0 // Treble controls speed
  });

  const audioHandler = useMemo(() => new AudioHandler(), []);

  const handleFileUpload = (file: File) => {
    audioHandler.setup(file).catch(err => console.error("Audio setup failed", err));
  };

  return (
    <div className="w-screen h-screen bg-slate-900 relative overflow-hidden">
        {/* Render Layer */}
        <div className="absolute inset-0 z-0">
            <VanGoghRenderer 
                settings={settings} 
                audioSettings={audioSettings}
                audioHandler={audioHandler}
            />
        </div>

        {/* UI Layer */}
        <Controls 
            settings={settings}
            setSettings={setSettings}
            audioSettings={audioSettings}
            setAudioSettings={setAudioSettings}
            onFileUpload={handleFileUpload}
        />
        
        {/* Instructions Overlay (fades out) */}
        <div className="absolute bottom-10 w-full text-center pointer-events-none animate-[fadeOut_5s_ease-in-out_forwards] z-40">
             <p className="text-white/50 text-sm bg-black/30 inline-block px-4 py-2 rounded-full backdrop-blur-sm">
                Van Gogh Live. Upload music for interactivity.
             </p>
        </div>
    </div>
  );
};

export default App;