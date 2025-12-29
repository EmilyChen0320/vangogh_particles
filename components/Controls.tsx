import React from 'react';
import { ParticleSettings, AudioSettings, ColorMode } from '../types';
import { Settings, Music, Palette, Activity, Eye, Mic, Paintbrush, Image as ImageIcon } from 'lucide-react';

interface ControlsProps {
  settings: ParticleSettings;
  setSettings: React.Dispatch<React.SetStateAction<ParticleSettings>>;
  audioSettings: AudioSettings;
  setAudioSettings: React.Dispatch<React.SetStateAction<AudioSettings>>;
  onFileUpload: (file: File) => void;
}

const Controls: React.FC<ControlsProps> = ({
  settings,
  setSettings,
  audioSettings,
  setAudioSettings,
  onFileUpload,
}) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'visual' | 'audio'>('visual');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const updateSetting = <K extends keyof ParticleSettings>(key: K, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateAudioSetting = <K extends keyof AudioSettings>(key: K, value: number) => {
    setAudioSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute top-4 right-4 bg-slate-800/80 backdrop-blur-md p-3 rounded-full text-white shadow-lg hover:bg-slate-700 transition-colors z-50 border border-slate-600"
      >
        <Settings size={24} />
      </button>
    );
  }

  return (
    <div className="absolute top-4 right-4 w-80 bg-slate-900/95 backdrop-blur-xl text-slate-200 rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh] z-50 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-900/50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-yellow-500/20 rounded-lg">
             <Paintbrush className="text-yellow-400" size={18} />
          </div>
          <h2 className="font-bold text-lg bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent">
            Van Gogh FX
          </h2>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 mx-4 mt-4 bg-slate-950/50 rounded-lg border border-slate-800">
        <button
          onClick={() => setActiveTab('visual')}
          className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide transition-all ${
            activeTab === 'visual'
              ? 'text-slate-900 bg-yellow-400 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eye size={14} /> Visuals
        </button>
        <button
          onClick={() => setActiveTab('audio')}
          className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide transition-all ${
            activeTab === 'audio'
              ? 'text-slate-900 bg-yellow-400 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Music size={14} /> Audio
        </button>
      </div>

      {/* Content */}
      <div className="p-5 overflow-y-auto custom-scroll flex-1 space-y-6">
        {activeTab === 'visual' && (
          <>
             {/* Color Mode Selector */}
             <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <ImageIcon size={12} /> Palette Mode
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'original', label: 'True Color' },
                  { id: 'starry_night', label: 'Starry Night' },
                  { id: 'sunflowers', label: 'Sunflowers' },
                  { id: 'self_portrait', label: 'Portrait' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => updateSetting('colorMode', mode.id as ColorMode)}
                    className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-all border relative overflow-hidden ${
                      settings.colorMode === mode.id
                        ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {mode.label}
                    {settings.colorMode === mode.id && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-yellow-400"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 pb-1 border-b border-slate-800">
                <Palette size={12} /> Brushwork
              </h3>
              
              <ControlRange
                label="Brush Size"
                value={settings.baseSize}
                min={1}
                max={10}
                step={0.5}
                onChange={(v) => updateSetting('baseSize', v)}
              />

              <ControlRange
                label="Stroke Length"
                value={settings.strokeLength}
                min={2}
                max={60}
                step={1}
                onChange={(v) => updateSetting('strokeLength', v)}
              />

              <ControlRange
                label="Particle Count"
                value={settings.particleCount}
                min={500}
                max={15000}
                step={100}
                onChange={(v) => updateSetting('particleCount', v)}
                warning={settings.particleCount > 8000 ? "High GPU" : undefined}
              />

              <ControlRange
                label="Opacity"
                value={settings.alpha}
                min={0.1}
                max={1}
                step={0.05}
                onChange={(v) => updateSetting('alpha', v)}
              />
            </div>

            <div className="space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 pb-1 border-b border-slate-800">
                <Activity size={12} /> Physics & Style
              </h3>

              <ControlRange
                label="Color Vibrance"
                value={settings.colorSaturation}
                min={0}
                max={3}
                step={0.1}
                onChange={(v) => updateSetting('colorSaturation', v)}
              />

              <ControlRange
                label="Flow Intensity"
                value={settings.flowStrength}
                min={0}
                max={8}
                step={0.1}
                onChange={(v) => updateSetting('flowStrength', v)}
              />
              
               <ControlRange
                label="Swirl / Turbulence"
                value={settings.noiseStrength}
                min={0}
                max={2}
                step={0.1}
                onChange={(v) => updateSetting('noiseStrength', v)}
              />
            </div>
          </>
        )}

        {activeTab === 'audio' && (
          <>
             <div className="space-y-4">
                <div className="group bg-slate-800/40 p-6 rounded-xl border-2 border-dashed border-slate-700 hover:border-yellow-500/50 hover:bg-slate-800/60 transition-all cursor-pointer relative overflow-hidden">
                    <input 
                        type="file" 
                        accept="audio/*" 
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center gap-3 text-slate-400 group-hover:text-yellow-400 transition-colors">
                        <div className="p-3 bg-slate-800 rounded-full group-hover:bg-yellow-500/10 transition-colors">
                             <Music size={24} />
                        </div>
                        <div className="text-center">
                            <span className="text-sm font-semibold block">Click to Upload Music</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wide">MP3, WAV, OGG Supported</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 pb-1 border-b border-slate-800">
                <Mic size={12} /> Audio Reactivity
              </h3>
              
              <ControlRange
                label="Mic / Music Sensitivity"
                value={audioSettings.sensitivity}
                min={0}
                max={3}
                step={0.1}
                onChange={(v) => updateAudioSetting('sensitivity', v)}
              />

              <div className="space-y-4 bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                 <div className="flex items-center gap-2 mb-2">
                     <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                     <p className="text-[10px] font-bold text-slate-300 uppercase">Low Frequency (Bass)</p>
                 </div>
                  <ControlRange
                    label="Effect on Brush Size"
                    value={audioSettings.bassInfluence}
                    min={0}
                    max={3}
                    step={0.1}
                    onChange={(v) => updateAudioSetting('bassInfluence', v)}
                  />
              </div>

               <div className="space-y-4 bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                 <div className="flex items-center gap-2 mb-2">
                     <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                     <p className="text-[10px] font-bold text-slate-300 uppercase">High Frequency (Treble)</p>
                 </div>
                  <ControlRange
                    label="Effect on Speed"
                    value={audioSettings.trebleInfluence}
                    min={0}
                    max={3}
                    step={0.1}
                    onChange={(v) => updateAudioSetting('trebleInfluence', v)}
                  />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ControlRange: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  warning?: string;
}> = ({ label, value, min, max, step, onChange, warning }) => (
  <div className="flex flex-col gap-2">
    <div className="flex justify-between items-end">
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <div className="flex items-center gap-2">
          {warning && <span className="text-[10px] text-orange-400">{warning}</span>}
          <span className="font-mono text-[10px] text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">
            {value.toFixed(1)}
          </span>
      </div>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-yellow-400 hover:accent-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
    />
  </div>
);

export default Controls;