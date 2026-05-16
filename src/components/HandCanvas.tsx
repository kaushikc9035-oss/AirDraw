import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Hands, Results, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { motion, AnimatePresence } from 'motion/react';
import { Pencil, Brain, Undo, Download } from 'lucide-react';
import confetti from 'canvas-confetti';

interface HandCanvasProps {
  brushColor: string;
  brushSize: number;
  onAnalyze: (canvas: HTMLCanvasElement, type: string) => void;
  isAnalyzing: boolean;
}

export const HandCanvas: React.FC<HandCanvasProps> = ({ brushColor, brushSize, onAnalyze, isAnalyzing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [particles, setParticles] = useState<{ x: number, y: number, color: string, id: string, life: number }[]>([]);
  const particleIdRef = useRef(0);
  
  const lastPointRef = useRef<{ x: number, y: number } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const clearCooldownRef = useRef(0);
  const lastPalmXRef = useRef<number | null>(null);

  const playSound = (freq: number) => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      // Audio context might be blocked by browser policy until interaction
    }
  };

  const clearCanvas = useCallback(() => {
    if (drawingCanvasRef.current) {
      const ctx = drawingCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
      setHistory([]);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#00f2ff', '#ff007f', '#ffffff']
      });
    }
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0 && drawingCanvasRef.current) {
      const ctx = drawingCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
      return;
    }
    
    const newHistory = [...history];
    const lastState = newHistory.pop();
    setHistory(newHistory);
    
    if (drawingCanvasRef.current && lastState) {
      const ctx = drawingCanvasRef.current.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.src = lastState;
        img.onload = () => {
          if (drawingCanvasRef.current) {
            ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
            ctx.drawImage(img, 0, 0);
          }
        };
      }
    }
  }, [history]);

  const saveImage = useCallback(() => {
    if (drawingCanvasRef.current) {
      try {
        // Create a composite canvas for export to include background
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = drawingCanvasRef.current.width;
        exportCanvas.height = drawingCanvasRef.current.height;
        const ctx = exportCanvas.getContext('2d');
        if (!ctx) return;

        // Fill background (matches cyber-bg #050508)
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        // Draw the lines
        ctx.drawImage(drawingCanvasRef.current, 0, 0);

        const dataUrl = exportCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `airdraw-artifact-${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Fun success effect
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00f2ff', '#ff007f', '#ffffff']
        });
      } catch (err) {
        console.error('Save failed:', err);
      }
    }
  }, []);

  // Listen for global events
  useEffect(() => {
    const handleClear = () => clearCanvas();
    const handleSave = () => saveImage();
    const handleUndo = () => undo();

    window.addEventListener('clear-canvas', handleClear);
    window.addEventListener('save-canvas', handleSave);
    window.addEventListener('undo-canvas', handleUndo);

    return () => {
      window.removeEventListener('clear-canvas', handleClear);
      window.removeEventListener('save-canvas', handleSave);
      window.removeEventListener('undo-canvas', handleUndo);
    };
  }, [clearCanvas, saveImage, undo]);

  // Particle animation
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => prev
        .map(p => ({ ...p, life: p.life - 0.05 }))
        .filter(p => p.life > 0)
      );
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const brushColorRef = useRef(brushColor);
  const brushSizeRef = useRef(brushSize);

  useEffect(() => {
    brushColorRef.current = brushColor;
    brushSizeRef.current = brushSize;
  }, [brushColor, brushSize]);

  useEffect(() => {
    if (!videoRef.current || !drawingCanvasRef.current || !overlayCanvasRef.current) return;

    let active = true;
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    const onResults = (results: Results) => {
      if (!active) return;
      setLoading(false);
      const canvasCtx = overlayCanvasRef.current?.getContext('2d');
      const drawingCtx = drawingCanvasRef.current?.getContext('2d');
      
      if (!canvasCtx || !drawingCtx || !overlayCanvasRef.current) return;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        setIsHandDetected(true);
        const landmarks = results.multiHandLandmarks[0];

        // Draw simplified connectors (theme consistent)
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: 'rgba(0, 242, 255, 0.4)', lineWidth: 1 });
        drawLandmarks(canvasCtx, landmarks, { color: '#ffffff', lineWidth: 1, radius: 1 });

        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];

        // Drawing state logic - pinching check
        const distance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        const isPinching = distance < 0.05;

        // Gesture Detection Primitives
        const isIndexUp = indexTip.y < landmarks[6].y;
        const isMiddleUp = middleTip.y < landmarks[10].y;
        const isRingUp = ringTip.y < landmarks[14].y;
        const isPinkyUp = pinkyTip.y < landmarks[18].y;
        const isThumbUp = thumbTip.y < landmarks[2].y && thumbTip.y < indexTip.y;

        // Specific Gestures
        const isOpenPalm = isIndexUp && isMiddleUp && isRingUp && isPinkyUp;

        // Gesture Action: Palm Wipe -> Clear
        if (isOpenPalm) {
          const currentX = landmarks[0].x; // Wrist X
          if (lastPalmXRef.current !== null) {
            const deltaX = Math.abs(currentX - lastPalmXRef.current);
            if (deltaX > 0.05 && Date.now() > clearCooldownRef.current) {
               clearCanvas();
               clearCooldownRef.current = Date.now() + 1500;
               playSound(220);
            }
          }
          lastPalmXRef.current = currentX;
        } else {
          lastPalmXRef.current = null;
        }

        const x = (1 - indexTip.x) * drawingCanvasRef.current.width;
        const y = indexTip.y * drawingCanvasRef.current.height;

        if (isPinching) {
          if (!isDrawing) {
            setIsDrawing(true);
            playSound(880);
            if (drawingCanvasRef.current) setHistory(prev => [...prev.slice(-19), drawingCanvasRef.current!.toDataURL()]);
          }
          
          drawingCtx.beginPath();
          drawingCtx.lineWidth = brushSizeRef.current;
          drawingCtx.lineCap = 'round';
          
          drawingCtx.globalCompositeOperation = 'source-over';
          drawingCtx.strokeStyle = brushColorRef.current;

          if (lastPointRef.current) {
            drawingCtx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
            drawingCtx.lineTo(x, y);
            drawingCtx.stroke();
          }
          lastPointRef.current = { x, y };

          const pid = `${Date.now()}-${particleIdRef.current++}`;
          setParticles(prev => [...prev.slice(-20), { x, y, color: brushColorRef.current, id: pid, life: 1 }]);
        } else {
          setIsDrawing(false);
          lastPointRef.current = null;
        }

        // Precise cursor
        canvasCtx.beginPath();
        canvasCtx.arc(x, y, isPinching ? brushSizeRef.current/2 : 6, 0, Math.PI * 2);
        canvasCtx.fillStyle = isPinching ? brushColorRef.current : 'rgba(255, 255, 255, 0.2)';
        canvasCtx.fill();
        canvasCtx.strokeStyle = '#ffffff';
        canvasCtx.lineWidth = 1;
        canvasCtx.stroke();
      } else {
        setIsHandDetected(false);
      }
      canvasCtx.restore();
    };

    hands.onResults(onResults);

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) await hands.send({ image: videoRef.current });
      },
      width: 1280,
      height: 720,
    });
    camera.start();

    return () => {
      active = false;
      hands.close();
      camera.stop();
    };
  }, []);

  return (
    <div className="w-full h-full relative group">
      <video ref={videoRef} className="hidden" playsInline muted />
      
      {/* Canvas Layer Container */}
      <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-white/10 group-hover:border-cyber-cyan/30 transition-all duration-700 p-1">
        <div className="w-full h-full bg-[#0a0a10] rounded-xl overflow-hidden relative shadow-2xl">
          {/* Theme Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none select-none">
             <div className="text-[12rem] font-black text-white italic tracking-tighter">CANVAS</div>
          </div>

          <canvas ref={drawingCanvasRef} width={1280} height={720} className="absolute inset-0 w-full h-full z-10" />
          <canvas ref={overlayCanvasRef} width={1280} height={720} className="absolute inset-0 w-full h-full z-20 pointer-events-none" />

          {/* Tool Indicator Overlay */}
          <div className="absolute top-4 right-4 z-30 pointer-events-none">
            <AnimatePresence mode="wait">
              {isDrawing ? (
                <motion.div key="pencil" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex items-center gap-2 px-3 py-1.5 bg-cyber-cyan text-black rounded border border-white shadow-[0_0_15px_rgba(0,242,255,0.4)]">
                   <Pencil size={14} />
                   <span className="text-[10px] font-black uppercase tracking-widest">Ink Flowing</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Particles */}
          <div className="absolute inset-0 z-15 pointer-events-none overflow-hidden">
            {particles.map(p => (
              <motion.div
                key={p.id}
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute w-2 h-2 rounded-full"
                style={{ left: `${p.x}px`, top: `${p.y}px`, backgroundColor: p.color, boxShadow: `0 0 10px ${p.color}` }}
              />
            ))}
          </div>

          {/* HUD Feedback Labels */}
          <div className="absolute top-4 left-4 flex space-x-2 z-30">
            <AnimatePresence>
              {isHandDetected ? (
                <motion.div key="hand-detected" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-3 py-1 bg-cyber-cyan text-black text-[10px] font-black rounded uppercase flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,242,255,0.4)]">
                  <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
                  Hand Detected
                </motion.div>
              ) : (
                <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 py-1 bg-white/10 text-white/50 text-[10px] font-bold rounded uppercase backdrop-blur-sm border border-white/5">
                  Searching for Link...
                </motion.div>
              )}
              {isDrawing && (
                <motion.div key="pinch-active-hud" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="px-3 py-1 bg-white text-black text-[10px] font-black rounded uppercase">
                  Pinch Active
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Floating Action Menu (Inline) */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 z-30">
             <button onClick={() => onAnalyze(drawingCanvasRef.current!, 'identify')} className="p-3 glass-morphism rounded-lg text-white hover:bg-cyber-cyan hover:text-black transition-all" title="AI Analyze">
                <Brain size={16} />
             </button>
             <button onClick={undo} className="p-3 glass-morphism rounded-lg text-white hover:bg-white hover:text-black transition-all" title="Undo">
                <Undo size={16} />
             </button>
             <button onClick={saveImage} className="p-3 glass-morphism rounded-lg text-white hover:bg-cyber-pink hover:text-white transition-all" title="Export">
                <Download size={16} />
             </button>
          </div>
        </div>
      </div>

      {/* Initializer Screen */}
      <AnimatePresence>
        {loading && (
          <motion.div exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-cyber-bg flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 border-2 border-white/10 border-t-white rounded-full animate-spin" />
            <h2 className="text-sm font-black text-white/40 tracking-[0.5em] uppercase italic">Initializing Neural Grid</h2>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
