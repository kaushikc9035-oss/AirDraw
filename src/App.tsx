import React, { useState } from 'react';
import { HandCanvas } from './components/HandCanvas';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, Moon, Sun, Cpu, Settings, X, ChevronRight, BrainCircuit, Sparkles, Activity, ShieldCheck, Zap } from 'lucide-react';

export default function App() {
  const [brushColor, setBrushColor] = useState('#00f2ff');
  const [brushSize, setBrushSize] = useState(10);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const handleAnalyze = async (canvas: HTMLCanvasElement, type: string) => {
    setIsAnalyzing(true);
    setAiResponse(null);
    try {
      const imageData = canvas.toDataURL('image/png');
      const response = await fetch('/api/analyze-drawing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData, promptType: type }),
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setAiResponse(data.result);
    } catch (err: any) {
      setAiResponse(`Error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const colors = [
    { name: 'Neon Cyan', value: '#00f2ff' },
    { name: 'Cyber Pink', value: '#ff007f' },
    { name: 'Electric Yellow', value: '#fefe01' },
    { name: 'Laser Green', value: '#00ff00' },
    { name: 'Voltage Orange', value: '#ff6600' },
    { name: 'Bright White', value: '#ffffff' },
  ];

  return (
    <div className={`w-screen h-screen flex flex-col p-6 relative overflow-hidden transition-colors duration-500 bg-dot-grid ${theme === 'dark' ? 'bg-cyber-bg text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Background Decorative Blurs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-cyan opacity-[0.05] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-pink opacity-[0.05] rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="flex justify-between items-end mb-6 z-10 border-b border-white/10 pb-4">
        <div className="flex flex-col">
          <span className="label-tiny text-cyber-cyan mb-1">Neural Vision v2.4</span>
          <h1 className="text-6xl font-black italic tracking-tighter leading-none uppercase">
            AirDraw <span className="text-outline">AI</span>
          </h1>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="hidden md:flex flex-col items-end">
             <span className="label-tiny opacity-50 mb-1">Frame Sync</span>
             <span className="font-mono text-xl text-green-400">ACTIVE_LINK</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors text-cyber-cyan"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 cursor-pointer text-white">
              <Settings size={20} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 z-10 min-h-0">
        {/* Left HUD */}
        <aside className="col-span-2 flex flex-col space-y-4">
          <div className="glass-morphism p-4 rounded-xl">
            <h3 className="label-tiny text-cyber-cyan mb-4 flex items-center gap-2">
              <ShieldCheck size={14} /> GESTURE HUD
            </h3>
            <ul className="space-y-4 font-mono text-[11px] uppercase">
              <li className="flex items-center justify-between">
                <span className="opacity-60 italic">Index+Thumb</span>
                <span className="text-cyber-cyan font-bold">Drawing</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="opacity-60 italic">Palm Wipe 👋</span>
                <span className="text-cyber-pink font-bold">Clear All</span>
              </li>
            </ul>
          </div>

          <div className="flex-1 glass-morphism p-4 rounded-xl flex flex-col">
            <h3 className="label-tiny text-cyber-cyan mb-4 flex items-center gap-2">
              <Activity size={14} /> METRICS
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-[10px] mb-2 uppercase font-black">
                  <span>CONFIDENCE</span><span>98.4%</span>
                </div>
                <div className="w-full h-1 bg-white/10">
                  <div className="h-full bg-cyber-cyan w-[98%] shadow-[0_0_8px_#00f2ff]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-2 uppercase font-black">
                  <span>LATENCY</span><span>14ms</span>
                </div>
                <div className="w-full h-1 bg-white/10">
                  <div className="h-full bg-white w-[15%]"></div>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5 opacity-40">
              <p className="text-[9px] font-mono leading-tight">
                KERNEL: MP_HANDS_X64<br/>
                BUFF: 4096_SAMPLES<br/>
                MODEL: GEMINI_3_FLASH
              </p>
            </div>
          </div>
        </aside>

        {/* Center Canvas */}
        <section className="col-span-7 relative">
          <HandCanvas 
            brushColor={brushColor} 
            brushSize={brushSize} 
            onAnalyze={handleAnalyze} 
            isAnalyzing={isAnalyzing}
          />
        </section>

        {/* Right AI Sidebar */}
        <aside className="col-span-3 flex flex-col">
          <div className="flex-1 glass-morphism rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <h3 className="label-tiny text-cyber-pink flex items-center gap-2">
                <BrainCircuit size={14} /> Gemini AI Vision
              </h3>
              {aiResponse && (
                <button onClick={() => setAiResponse(null)} className="text-white/40 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
            
            <div className="p-5 flex-1 font-mono text-sm space-y-4 overflow-y-auto">
              {!aiResponse ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                  <Sparkles size={40} className="text-cyber-cyan" />
                  <p className="text-[10px] uppercase font-bold tracking-widest">Awaiting Artifact Analysis...</p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="text-cyber-cyan italic">&gt; Analysis complete...</div>
                  <div className="text-white/80 text-xs leading-relaxed whitespace-pre-wrap">
                    {aiResponse}
                  </div>
                  <div className="p-3 bg-cyber-pink/10 border-l-2 border-cyber-pink text-[11px] italic text-cyber-pink/80">
                    "This composition suggests digital fluid acceleration. Recommended for branding."
                  </div>
                </motion.div>
              )}
            </div>

            <div className="p-4 border-t border-white/10">
              <button 
                onClick={() => handleAnalyze(document.querySelector('canvas') as HTMLCanvasElement, 'identify')}
                disabled={isAnalyzing}
                className="w-full py-4 cyber-button-primary text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAnalyzing ? "Processing..." : "Sync With Gemini"} <Zap size={14} />
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer Controls */}
      <footer className="mt-6 flex justify-between items-center z-10">
        <div className="flex items-center space-x-8 glass-morphism px-8 py-3 rounded-full border border-white/10">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold tracking-tighter opacity-50 mb-1">Brush Size</span>
            <input 
              type="range" 
              min="1" max="50" value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-32 h-1 bg-white/20 rounded-full appearance-none accent-cyber-cyan cursor-pointer"
            />
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-center space-x-3">
            {colors.map(c => (
              <button
                key={c.value}
                onClick={() => setBrushColor(c.value)}
                className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 ${
                  brushColor === c.value ? 'border-white shadow-[0_0_12px_rgba(0,242,255,0.4)]' : 'border-transparent opacity-60'
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>

        <div className="flex space-x-3">
           <button 
             onClick={() => window.dispatchEvent(new Event('undo-canvas'))}
             className="px-6 py-4 glass-morphism hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
           >
             <span className="text-[10px] uppercase font-black tracking-widest text-white/50 group-hover:text-white">Undo Last</span>
           </button>
           <button 
             onClick={() => window.dispatchEvent(new Event('clear-canvas'))}
             className="px-6 py-4 glass-morphism hover:bg-red-500/10 border border-white/10 rounded-xl transition-all group"
           >
             <span className="text-[10px] uppercase font-black tracking-widest text-white/50 group-hover:text-red-400">Clear Space</span>
           </button>
           <button 
             onClick={() => window.dispatchEvent(new Event('save-canvas'))}
             className="px-8 py-4 cyber-button-primary rounded-xl shadow-[0_0_20px_rgba(0,242,255,0.2)]"
           >
             Export Artifact
           </button>
        </div>
      </footer>

      {/* Global AI Loading Overlay */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-8"
          >
             <div className="w-24 h-24 border-4 border-cyber-pink border-t-transparent rounded-full animate-spin" />
             <h3 className="text-2xl font-black italic tracking-[0.3em] text-cyber-pink animate-pulse">Syncing Neural Pathways</h3>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
