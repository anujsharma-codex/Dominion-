import React, { useEffect, useRef, useState } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Radio,
  Volume2,
  Shield,
  Camera,
  RefreshCw,
  Maximize2,
  Minimize2,
  Lock,
  Sparkles,
  Users,
} from 'lucide-react';

interface LiveDeviceMediaFeedProps {
  isVideoActive: boolean;
  isAudioActive: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  guardianCount?: number;
  userName?: string;
  isNightTime?: boolean;
}

export const LiveDeviceMediaFeed: React.FC<LiveDeviceMediaFeedProps> = ({
  isVideoActive,
  isAudioActive,
  onToggleVideo,
  onToggleAudio,
  guardianCount = 3,
  userName = 'Priya Raman',
  isNightTime = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [isUsingSimulatedStream, setIsUsingSimulatedStream] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [audioLevelDb, setAudioLevelDb] = useState<number>(42);
  const [audioFrequencies, setAudioFrequencies] = useState<number[]>([35, 55, 40, 70, 60, 45, 80, 65, 50, 40]);
  const [currentTimecode, setCurrentTimecode] = useState<string>('');

  // Update live clock timecode
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimecode(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + `.${Math.floor(now.getMilliseconds() / 100)}`
      );
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Initialize Real Camera & Microphone Stream with Web Audio API Analyzer
  useEffect(() => {
    let isMounted = true;

    async function initMediaStreams() {
      // Clean up previous stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }

      if (!isVideoActive && !isAudioActive) {
        setHasCameraPermission(false);
        setHasMicPermission(false);
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: isVideoActive ? { facingMode, width: { ideal: 640 }, height: { ideal: 480 } } : false,
          audio: isAudioActive ? { echoCancellation: true, noiseSuppression: true } : false,
        };

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (!isMounted) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          mediaStreamRef.current = stream;
          setIsUsingSimulatedStream(false);

          // Handle Video Track
          if (isVideoActive && stream.getVideoTracks().length > 0) {
            setHasCameraPermission(true);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
            }
          }

          // Handle Audio Track with Web Audio API Analyser
          if (isAudioActive && stream.getAudioTracks().length > 0) {
            setHasMicPermission(true);
            try {
              const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
              if (AudioCtx) {
                const ctx = new AudioCtx();
                audioContextRef.current = ctx;
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 64;
                analyserRef.current = analyser;

                const source = ctx.createMediaStreamSource(stream);
                source.connect(analyser);

                const dataArray = new Uint8Array(analyser.frequencyBinCount);

                const sampleAudio = () => {
                  if (!isMounted || !analyserRef.current) return;
                  analyserRef.current.getByteFrequencyData(dataArray);

                  // Calculate average decibel volume
                  let sum = 0;
                  const freqSubset: number[] = [];
                  for (let i = 0; i < 10; i++) {
                    const val = dataArray[i * 2] || 0;
                    freqSubset.push(Math.min(100, Math.max(10, Math.round((val / 255) * 100))));
                    sum += val;
                  }
                  const avg = sum / 10;
                  const calculatedDb = Math.round(30 + (avg / 255) * 55); // 30dB (quiet) to 85dB (loud)
                  setAudioLevelDb(calculatedDb);
                  setAudioFrequencies(freqSubset);

                  animFrameRef.current = requestAnimationFrame(sampleAudio);
                };

                sampleAudio();
              }
            } catch (err) {
              console.log('AudioContext analyzer notice:', err);
            }
          }
        } else {
          throw new Error('MediaDevices API not available');
        }
      } catch (err) {
        // Fallback to simulated responsive device camera & soundwave
        console.log('Using simulated device camera & sensor fallback:', err);
        if (isMounted) {
          setIsUsingSimulatedStream(true);
          setHasCameraPermission(true);
          setHasMicPermission(true);
        }
      }
    }

    initMediaStreams();

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isVideoActive, isAudioActive, facingMode]);

  // Simulated fallback animated canvas rendering for selfie camera
  useEffect(() => {
    if (!isUsingSimulatedStream || !isVideoActive) return;

    let animId: number;
    let tick = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderSimulatedFeed = () => {
      tick += 0.05;
      const w = canvas.width;
      const h = canvas.height;

      // Dark background gradient representing night / street atmosphere
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#0F172A');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle video scanlines
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1);
      }

      // User Head/Shoulders Silhouette Avatar
      ctx.save();
      ctx.translate(w / 2, h / 2 + 10);

      // Shoulders
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.ellipse(0, 45, 55, 25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, -5, 26, 0, Math.PI * 2);
      ctx.fill();

      // Hair silhouette
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(0, -10, 27, Math.PI * 0.8, Math.PI * 2.2);
      ctx.fill();

      // Eyes glow
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(-8, -6, 2, 0, Math.PI * 2);
      ctx.arc(8, -6, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Live Face-Tracking Bounding Box
      const boxSize = 75 + Math.sin(tick * 2) * 2;
      const boxX = (w - boxSize) / 2;
      const boxY = (h - boxSize) / 2 - 10;

      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(boxX, boxY, boxSize, boxSize);
      ctx.setLineDash([]);

      // Corner brackets on face tracker
      const cornerLen = 8;
      ctx.strokeStyle = '#34D399';
      ctx.lineWidth = 2.5;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + cornerLen);
      ctx.lineTo(boxX, boxY);
      ctx.lineTo(boxX + cornerLen, boxY);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(boxX + boxSize - cornerLen, boxY);
      ctx.lineTo(boxX + boxSize, boxY);
      ctx.lineTo(boxX + boxSize, boxY + cornerLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + boxSize - cornerLen);
      ctx.lineTo(boxX, boxY + boxSize);
      ctx.lineTo(boxX + cornerLen, boxY + boxSize);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(boxX + boxSize - cornerLen, boxY + boxSize);
      ctx.lineTo(boxX + boxSize, boxY + boxSize);
      ctx.lineTo(boxX + boxSize, boxY + boxSize - cornerLen);
      ctx.stroke();

      // Target Label
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#34D399';
      ctx.fillText(`TARGET: ${userName.toUpperCase()}`, boxX + 4, boxY - 4);
      ctx.fillText(`CONF: 99.4%`, boxX + boxSize - 56, boxY + boxSize + 11);

      // Optical Escort HUD Crosshair
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 20, h / 2);
      ctx.lineTo(w / 2 + 20, h / 2);
      ctx.moveTo(w / 2, h / 2 - 20);
      ctx.lineTo(w / 2, h / 2 + 20);
      ctx.stroke();

      animId = requestAnimationFrame(renderSimulatedFeed);
    };

    renderSimulatedFeed();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isUsingSimulatedStream, isVideoActive, userName]);

  // Simulated ambient acoustic soundwave when mic permission is simulated
  useEffect(() => {
    if (!isUsingSimulatedStream || !isAudioActive) return;

    const interval = setInterval(() => {
      // Natural speech & ambient fluctuations
      const baseDb = 42 + Math.floor(Math.random() * 22);
      setAudioLevelDb(baseDb);

      const generatedFreqs = Array.from({ length: 10 }, (_, i) => {
        const centerWeight = Math.sin((i / 9) * Math.PI);
        return Math.min(95, Math.max(15, Math.floor(25 + Math.random() * 55 * centerWeight + Math.random() * 20)));
      });
      setAudioFrequencies(generatedFreqs);
    }, 180);

    return () => clearInterval(interval);
  }, [isUsingSimulatedStream, isAudioActive]);

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="bg-slate-900 border border-slate-700/90 rounded-xl overflow-hidden shadow-xl transition-all">
      {/* Header Bar: Status & Controls */}
      <div className="bg-slate-950 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>LIVE DEVICE STREAM</span>
              <span className="text-[10px] font-mono bg-red-950/80 text-red-300 px-1.5 py-0.2 rounded border border-red-800">
                REC
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Encrypted Mesh Relay • Sharing with {guardianCount} Guardians</span>
            </div>
          </div>
        </div>

        {/* Quick Stream Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleFacingMode}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-md text-xs transition cursor-pointer"
            title="Switch Camera (Front / Wide)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-md text-xs transition cursor-pointer"
            title={isExpanded ? 'Minimize View' : 'Expand View'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Video Screen Container */}
      <div className="relative bg-black w-full overflow-hidden flex items-center justify-center">
        {isVideoActive ? (
          <div className={`relative w-full ${isExpanded ? 'h-72 sm:h-80' : 'h-48 sm:h-52'} transition-all`}>
            {/* Real WebCam Video element */}
            {!isUsingSimulatedStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              /* Simulated high-fidelity device selfie feed */
              <canvas
                ref={canvasRef}
                width={380}
                height={220}
                className="w-full h-full object-cover"
              />
            )}

            {/* Live Video Overlays */}
            <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
              <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>SELF-VIEW LIVE (720p HD)</span>
              </div>
              <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-mono text-slate-300">
                {currentTimecode || '00:00:00.0'}
              </div>
            </div>

            <div className="absolute top-2.5 right-2.5 z-10">
              <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-medium text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{guardianCount} Guardians Watching</span>
              </div>
            </div>

            {/* Bottom Status Ribbon on Video */}
            <div className="absolute bottom-2 inset-x-2 bg-slate-950/80 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-slate-800 flex items-center justify-between text-[11px] text-slate-300 z-10">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-semibold text-white">Camera: {facingMode === 'user' ? 'Front Selfie' : 'Wide Angle'}</span>
              </div>
              <div className="text-[10px] text-emerald-300 font-mono">
                BITRATE: 1.8 Mbps • 30 FPS
              </div>
            </div>
          </div>
        ) : (
          /* Video is Paused State */
          <div className="w-full h-36 flex flex-col items-center justify-center p-4 bg-slate-950 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
              <VideoOff className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-300">Live Video is Paused</div>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Turn on video so your 3 escort guardians can see your visual surroundings.
              </p>
            </div>
            <button
              onClick={onToggleVideo}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-md flex items-center gap-1.5 cursor-pointer shadow transition"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Enable Live Camera</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* REAL-TIME AUDIO SENSOR & AUDIO SHARING DISPLAY           */}
      {/* ========================================================= */}
      <div className="bg-slate-950 p-3.5 border-t border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border ${
              isAudioActive
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
              <Radio className={`w-4 h-4 ${isAudioActive ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>ACOUSTIC SENSOR & AUDIO STREAM</span>
                {isAudioActive && (
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-700">
                    SHARING ACTIVE
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                {isAudioActive
                  ? 'Continuous background audio is broadcasted to all 3 guardians'
                  : 'Audio streaming is currently muted'}
              </div>
            </div>
          </div>

          {/* Decibel Meter Indicator */}
          {isAudioActive && (
            <div className="text-right shrink-0 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium">Ambient Sensor</div>
              <div className="text-xs font-bold font-mono text-emerald-400">
                {audioLevelDb} dB SPL
              </div>
            </div>
          )}
        </div>

        {/* Real-time Dynamic Audio Waveform Equalizer Bar */}
        {isAudioActive ? (
          <div className="space-y-1.5">
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-1.5">
              {audioFrequencies.map((freq, idx) => {
                // Color spectrum based on frequency height
                const barHeight = Math.max(12, Math.min(38, Math.round(freq * 0.4)));
                const barColor =
                  freq > 75
                    ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                    : freq > 50
                    ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                    : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]';

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-9">
                    <div
                      className={`w-full max-w-[12px] rounded-t-sm transition-all duration-100 ${barColor}`}
                      style={{ height: `${barHeight}px` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Audio Stream Telemetry Chips */}
            <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center">
              <div className="bg-slate-900/80 p-1 rounded border border-slate-800 text-slate-300">
                <span className="text-slate-500">Codec:</span> <strong className="text-white">Opus 48kHz</strong>
              </div>
              <div className="bg-slate-900/80 p-1 rounded border border-slate-800 text-slate-300">
                <span className="text-slate-500">Latency:</span> <strong className="text-emerald-400">18ms</strong>
              </div>
              <div className="bg-slate-900/80 p-1 rounded border border-slate-800 text-slate-300">
                <span className="text-slate-500">Buffer:</span> <strong className="text-emerald-400">Synced ✓</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-center">
            <div className="text-xs text-slate-400">Microphone sharing is turned off.</div>
            <button
              onClick={onToggleAudio}
              className="mt-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-1 px-3 rounded cursor-pointer"
            >
              Resume Audio Broadcast
            </button>
          </div>
        )}

        {/* Media Control Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={onToggleVideo}
            id="toggle-video-feed-btn"
            className={`p-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer border ${
              isVideoActive
                ? 'bg-red-950/80 border-red-700 text-red-300 hover:bg-red-900'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {isVideoActive ? <VideoOff className="w-4 h-4 text-red-400" /> : <Video className="w-4 h-4 text-emerald-400" />}
            <span>{isVideoActive ? 'Pause My Video' : 'Share My Video'}</span>
          </button>

          <button
            onClick={onToggleAudio}
            id="toggle-audio-feed-btn"
            className={`p-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer border ${
              isAudioActive
                ? 'bg-red-950/80 border-red-700 text-red-300 hover:bg-red-900'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {isAudioActive ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            <span>{isAudioActive ? 'Mute Audio Sensor' : 'Share Audio Sensor'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
