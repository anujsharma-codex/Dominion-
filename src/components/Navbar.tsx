import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Moon,
  Sun,
  Battery,
  Wifi,
  MapPin,
  Lock,
} from 'lucide-react';
import { IntegrityCheckStatus } from '../types';

export type AppViewMode = 'sos_user';

interface NavbarProps {
  isNightTime: boolean;
  onToggleNightTime: () => void;
  isSessionActive: boolean;
  integrityStatus?: IntegrityCheckStatus | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  isNightTime,
  onToggleNightTime,
  isSessionActive,
  integrityStatus,
}) => {
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-700 text-slate-100 sticky top-0 z-[1500] px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Project Branding */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold text-base shadow">
            GC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-white">Guardian Circle</h1>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
                Student Safety System
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Chennai Community Safety Escort • User Interface</span>
            </div>
          </div>
        </div>

        {/* Live Escort & Background 2s Status Indicator */}
        <div className="flex items-center gap-2">
          {isSessionActive ? (
            <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-600/70 text-emerald-300 px-3 py-1.5 rounded-lg text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold">LIVE ESCORT ACTIVE</span>
              <span className="hidden sm:inline text-emerald-400/80">•</span>
              <span className="hidden sm:inline text-[11px] text-emerald-200">
                2s Proximity & Anti-Fraud Engine Running
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>3-Volunteer Mesh Ready (Chennai)</span>
            </div>
          )}
        </div>

        {/* System telemetry & Night toggle */}
        <div className="flex items-center gap-3 text-xs">
          <div className="hidden sm:flex items-center gap-1 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-red-400" />
            <span>Chennai, TN</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-slate-300">
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
            <span>85%</span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-slate-300">
            <Wifi className="w-3.5 h-3.5 text-blue-400" />
            <span>Online</span>
          </div>

          <div className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-[11px] font-mono border border-slate-700 hidden lg:block">
            {timeString || '20:15:00'}
          </div>

          <button
            onClick={onToggleNightTime}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium transition cursor-pointer ${
              isNightTime
                ? 'bg-slate-800 border-indigo-500 text-indigo-300'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle Night Risk Simulation"
          >
            {isNightTime ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isNightTime ? 'Night Risk (High)' : 'Day Mode'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
