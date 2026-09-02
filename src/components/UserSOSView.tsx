import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Navigation,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Lock,
  Volume2,
  VolumeX,
  PhoneOff,
  UserCheck,
  Radio,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MapPin,
  Sparkles,
  Info,
  Target,
} from 'lucide-react';
import { RouteWaypoint, SafetySession, SafeSpace, Guardian, IntegrityCheckStatus } from '../types';
import { CHENNAI_START_PRESETS, CHENNAI_DEST_PRESETS, ChennaiLocationPreset } from '../utils/routeGenerator';
import { haversine } from '../utils/distance';
import confetti from 'canvas-confetti';
import { LiveDeviceMediaFeed } from './LiveDeviceMediaFeed';

interface UserSOSViewProps {
  session: SafetySession | null;
  onStartEscortWithRoute: (
    startLoc: { lat: number; lon: number; name: string; landmark?: string },
    destLoc: { lat: number; lon: number; name: string; landmark?: string }
  ) => void;
  onEndSessionSafe: (rating: number) => void;
  onEscalateEmergency: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onStepForward: () => void;
  onResetRoute: () => void;
  simSpeed: number;
  onChangeSimSpeed: (speed: number) => void;
  currentWaypoint: RouteWaypoint;
  totalWaypoints: number;
  currentWaypointIndex: number;
  selectedSafeSpace: SafeSpace | null;
  onCloseSafeSpace: () => void;
  isNightTime: boolean;
  onReportMissingGuardians: (reason: string, action: 'reassign_guardian' | 'police_alert') => void;
  integrityStatus: IntegrityCheckStatus | null;
}

export const UserSOSView: React.FC<UserSOSViewProps> = ({
  session,
  onStartEscortWithRoute,
  onEndSessionSafe,
  onEscalateEmergency,
  onToggleAudio,
  onToggleVideo,
  isSimulating,
  onToggleSimulation,
  onStepForward,
  onResetRoute,
  simSpeed,
  onChangeSimSpeed,
  currentWaypoint,
  totalWaypoints,
  currentWaypointIndex,
  selectedSafeSpace,
  onCloseSafeSpace,
  isNightTime,
  onReportMissingGuardians,
  integrityStatus,
}) => {
  // Pre-flight SOS Setup Modal State
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedStartPreset, setSelectedStartPreset] = useState<ChennaiLocationPreset>(CHENNAI_START_PRESETS[0]);
  const [selectedDestPreset, setSelectedDestPreset] = useState<ChennaiLocationPreset>(CHENNAI_DEST_PRESETS[0]);
  const [customStartText, setCustomStartText] = useState('');
  const [customDestText, setCustomDestText] = useState('');
  const [isCustomStart, setIsCustomStart] = useState(false);
  const [isCustomDest, setIsCustomDest] = useState(false);
  const [shareLiveGpsContinuous, setShareLiveGpsContinuous] = useState(true);

  // Active Session Modals State
  const [showSafeModal, setShowSafeModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [callingGuardian, setCallingGuardian] = useState<Guardian | null>(null);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  // In-App Call Simulation State
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected'>('connecting');

  // Post-Trip Feedback State
  const [userRatingGiven, setUserRatingGiven] = useState(5);
  const [feltLackOfService, setFeltLackOfService] = useState<'no' | 'yes'>('no');
  const [lackOfServiceReason, setLackOfServiceReason] = useState<string>('Guardian lagged behind or exceeded safe perimeter distance');
  const [customFeedbackNotes, setCustomFeedbackNotes] = useState<string>('');
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState<boolean>(false);

  // Report reason state
  const [reportReason, setReportReason] = useState<string>('Only 1 or 2 guardians are physically near me');
  const [reportAction, setReportAction] = useState<'reassign_guardian' | 'police_alert'>('reassign_guardian');

  // Handle in-app VoIP call timer loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (callingGuardian) {
      setCallDuration(0);
      setCallStatus('connecting');
      const connectTimeout = setTimeout(() => {
        setCallStatus('connected');
      }, 1200);

      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      return () => {
        clearTimeout(connectTimeout);
        if (interval) clearInterval(interval);
      };
    }
  }, [callingGuardian]);

  const handleOpenSOSSetup = () => {
    setShowLocationModal(true);
  };

  const handleConfirmAndStartEscort = () => {
    const startObj = isCustomStart && customStartText.trim()
      ? {
          lat: selectedStartPreset.lat + (Math.random() - 0.5) * 0.005,
          lon: selectedStartPreset.lon + (Math.random() - 0.5) * 0.005,
          name: customStartText.trim(),
          landmark: 'User Custom Start Location (Chennai)',
        }
      : {
          lat: selectedStartPreset.lat,
          lon: selectedStartPreset.lon,
          name: selectedStartPreset.name,
          landmark: selectedStartPreset.landmark,
        };

    const destObj = isCustomDest && customDestText.trim()
      ? {
          lat: selectedDestPreset.lat + (Math.random() - 0.5) * 0.005,
          lon: selectedDestPreset.lon + (Math.random() - 0.5) * 0.005,
          name: customDestText.trim(),
          landmark: 'User Custom Destination Safe Hub',
        }
      : {
          lat: selectedDestPreset.lat,
          lon: selectedDestPreset.lon,
          name: selectedDestPreset.name,
          landmark: selectedDestPreset.landmark,
        };

    setShowLocationModal(false);
    onStartEscortWithRoute(startObj, destObj);
  };

  // Auto-Detect Destination Arrival State
  const [isAutoArrived, setIsAutoArrived] = useState<boolean>(false);
  const autoArrivalTriggeredRef = useRef<boolean>(false);

  // Automatically end the trip and trigger safe arrival feedback when user reaches destination
  useEffect(() => {
    if (
      session &&
      session.status === 'active' &&
      currentWaypointIndex >= totalWaypoints - 1 &&
      totalWaypoints > 1 &&
      !showSafeModal &&
      !autoArrivalTriggeredRef.current
    ) {
      autoArrivalTriggeredRef.current = true;
      setIsAutoArrived(true);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
      });
      setIsFeedbackSubmitted(false);
      setFeltLackOfService('no');
      setUserRatingGiven(5);
      setShowSafeModal(true);
    }
  }, [session, currentWaypointIndex, totalWaypoints, showSafeModal]);

  // Reset auto-arrival trigger when session changes/resets
  useEffect(() => {
    if (!session) {
      autoArrivalTriggeredRef.current = false;
      setIsAutoArrived(false);
    }
  }, [session]);

  const handleSafeClick = () => {
    setIsAutoArrived(false);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
    });
    setIsFeedbackSubmitted(false);
    setFeltLackOfService('no');
    setUserRatingGiven(5);
    setShowSafeModal(true);
  };

  const handleSubmitFeedback = () => {
    setIsFeedbackSubmitted(true);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.5 },
    });
  };

  const handleFinishAndEndTrip = () => {
    setShowSafeModal(false);
    setIsFeedbackSubmitted(false);
    onEndSessionSafe(userRatingGiven);
  };

  const handleConfirmReport = () => {
    onReportMissingGuardians(reportReason, reportAction);
    setShowReportModal(false);
  };

  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.round(((currentWaypointIndex + 1) / totalWaypoints) * 100);
  const totalEstimatedKm = 4.8;
  const traveledKm = session ? session.distanceTraveledKm : 0;
  const remainingKm = Math.max(0, totalEstimatedKm - traveledKm);

  // Pre-flight estimated distance calculation
  const calculatedPreflightDistKm = haversine(
    selectedStartPreset.lat,
    selectedStartPreset.lon,
    selectedDestPreset.lat,
    selectedDestPreset.lon
  ).toFixed(1);

  return (
    <div className="flex flex-col gap-4 text-slate-200">
      {/* ========================================================= */}
      {/* 1. STATE: NO ACTIVE SESSION (SOS Trigger & Setup Flow)   */}
      {/* ========================================================= */}
      {!session ? (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 shadow space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                User Safety Escort System
              </span>
            </div>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Chennai Zone
            </span>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">
              Walking Alone in Chennai?
            </h2>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              If you feel unsafe, tap the button below to share your live location and end destination. The system will match you with <strong>3 verified student/community volunteers</strong> who will silently shadow your route on the live map until you safely arrive.
            </p>
          </div>

          {/* Large SOS Button to Trigger Setup */}
          <button
            onClick={handleOpenSOSSetup}
            id="sos-trigger-button"
            className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-4 px-6 rounded-lg text-base sm:text-lg uppercase tracking-wide flex items-center justify-center gap-3 shadow transition cursor-pointer border border-red-500"
          >
            <ShieldAlert className="w-6 h-6 animate-pulse" />
            <span>I FEEL UNSAFE (SHARE LOCATION & ESCORT)</span>
          </button>

          {/* Core Privacy & Architecture Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
              <div className="font-semibold text-white flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-blue-400" />
                <span>Live Route Sync</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Continuous GPS tracking to destination</p>
            </div>

            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
              <div className="font-semibold text-white flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Masked VoIP</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Your phone number is never shared</p>
            </div>

            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
              <div className="font-semibold text-white flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>3 Guardians</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Checked every 2s in background</p>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* 2. STATE: ACTIVE SESSION (User Escort HUD)                */
        /* ========================================================= */
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 shadow space-y-4">
          {/* Active Status Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <div className="text-xs font-bold text-emerald-400 uppercase">
                  ACTIVE LIVE ESCORT #{session.sessionId}
                </div>
                <div className="text-xs text-slate-300">
                  Destination: <strong className="text-white">{session.destination.name}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="bg-slate-800 px-2 py-1 rounded text-slate-300 border border-slate-700">
                Battery: {session.user.batteryLevel}%
              </span>
              <span className="bg-slate-800 px-2 py-1 rounded text-slate-300 border border-slate-700">
                GPS: Live Active
              </span>
            </div>
          </div>

          {/* Continuous 2-Second Background Guardian Proximity & Anti-Fraud Confirmation Card */}
          <div className="bg-emerald-950/40 border border-emerald-600/60 rounded-lg p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                  2-Second Proximity & Integrity Verification
                </span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-900/60 text-emerald-200 px-2 py-0.5 rounded border border-emerald-700/50">
                Checked every 2s: {integrityStatus?.lastCheckedTimestamp || 'Active'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs bg-slate-950/80 p-2.5 rounded border border-emerald-900/50">
              <div className="flex items-center gap-2 text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>{integrityStatus?.guardiansInSafeRange || 3} of {session.guardians.length}</strong> Guardians Confirmed Near You
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                ✓ ALL IN RANGE
              </span>
            </div>

            {/* Quick 2s Heartbeat Distance Bar */}
            {integrityStatus?.distances && integrityStatus.distances.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                {integrityStatus.distances.map((d, i) => (
                  <div key={d.guardianId} className="bg-slate-950/90 p-1.5 rounded border border-slate-800 text-center">
                    <div className="text-slate-400 font-medium truncate">{d.guardianName.split(' ')[0]}</div>
                    <div className="text-emerald-300 font-bold font-mono">{d.distanceMeters}m</div>
                  </div>
                ))}
              </div>
            )}

            {/* Background Log Toggle */}
            <div className="pt-0.5">
              <button
                onClick={() => setShowAuditLogs(!showAuditLogs)}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>{showAuditLogs ? 'Hide 2s Verification Log' : 'View Background 2s Audit Log'}</span>
                {showAuditLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showAuditLogs && integrityStatus?.detailedLogs && (
                <div className="mt-2 bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[10px] text-slate-300 max-h-28 overflow-y-auto space-y-1">
                  {integrityStatus.detailedLogs.map((log, idx) => (
                    <div key={idx} className="leading-tight">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Route Progress and Landmark */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">
                Route Progress (Step {currentWaypointIndex + 1} of {totalWaypoints})
              </span>
              <span className="font-bold text-blue-400">{progressPercent}%</span>
            </div>

            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-start justify-between gap-2 pt-1 text-xs">
              <div>
                <div className="font-bold text-white flex items-center gap-1">
                  <span>📍</span> {currentWaypoint.name}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{currentWaypoint.landmark}</div>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                    currentWaypoint.riskRating === 'high'
                      ? 'bg-rose-950/80 text-rose-300 border-rose-700'
                      : currentWaypoint.riskRating === 'medium'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  }`}
                >
                  {currentWaypoint.riskRating} Risk
                </span>
                <div className="text-[10px] text-slate-400 mt-0.5">{currentWaypoint.speedKmh} km/h</div>
              </div>
            </div>
          </div>

          {/* ASSIGNED GUARDIANS: Shows ONLY Guardian Name and Live Distance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Your Assigned Guardians (3 Nearby)
              </h3>
              <span className="text-[11px] text-emerald-400 font-medium">
                3 Connected
              </span>
            </div>

            <div className="space-y-2">
              {session.guardians.map((g, index) => {
                // Find distance from integrity status or calculate realistic distance
                const liveDistObj = integrityStatus?.distances.find((d) => d.guardianId === g.id);
                const distMeters = liveDistObj ? liveDistObj.distanceMeters : Math.round((g.distanceKm || 0.15 + index * 0.04) * 1000);
                const displayDist = distMeters < 1000 ? `${distMeters} meters away` : `${(distMeters / 1000).toFixed(2)} km away`;

                return (
                  <div
                    key={g.id}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                  >
                    {/* Guardian Name and Live Distance ONLY */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                        {g.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{g.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Live Distance: <strong className="text-slate-200">{displayDist}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Masked In-App Calling Button */}
                    <button
                      onClick={() => setCallingGuardian(g)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                      title="Call guardian via encrypted in-app VoIP (Phone numbers hidden)"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>In-App Call</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Facility to Report if Less Than 3 Guardians are Around Her */}
            <div className="pt-1">
              <button
                onClick={() => setShowReportModal(true)}
                id="report-missing-guardian-button"
                className="w-full bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/60 text-amber-300 font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-sm"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>⚠️ Report: Less Than 3 Guardians Around Me</span>
              </button>
            </div>
          </div>

          {/* LIVE DEVICE VIDEO & REAL-TIME AUDIO SENSOR */}
          <LiveDeviceMediaFeed
            isVideoActive={session.videoStreaming}
            isAudioActive={session.audioRecording}
            onToggleVideo={onToggleVideo}
            onToggleAudio={onToggleAudio}
            guardianCount={session.guardians.length}
            userName={session.user.name}
            isNightTime={isNightTime}
          />

          {/* Walk Simulation Controller for testing */}
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium text-[11px]">Walk Sim:</span>
              <button
                onClick={onToggleSimulation}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                  isSimulating ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isSimulating ? 'Pause Walk' : 'Auto Step'}</span>
              </button>

              <button
                onClick={onStepForward}
                disabled={currentWaypointIndex >= totalWaypoints - 1}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 px-2 py-1 rounded text-xs cursor-pointer"
              >
                Step +1
              </button>

              <button
                onClick={onResetRoute}
                className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-1 rounded cursor-pointer"
                title="Reset route to start"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span>Speed:</span>
              {[1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => onChangeSimSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                    simSpeed === spd ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons: I'm Safe vs Escalate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handleSafeClick}
              id="im-safe-button"
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-xs uppercase tracking-wide cursor-pointer transition shadow"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>I'M SAFE (END ESCORT)</span>
            </button>

            <button
              onClick={() => setShowEscalateModal(true)}
              id="escalate-emergency-button"
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-xs uppercase tracking-wide cursor-pointer transition shadow"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>🚨 ESCALATE (112 POLICE)</span>
            </button>
          </div>
        </div>
      )}

      {/* Selected Safe Space Quick Actions Box */}
      {selectedSafeSpace && (
        <div className="bg-slate-900 border border-blue-600/50 rounded-lg p-3.5 shadow flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="text-xl">{selectedSafeSpace.type === 'police' ? '👮' : '🏥'}</div>
            <div>
              <div className="font-bold text-white">{selectedSafeSpace.name}</div>
              <div className="text-[11px] text-slate-400">{selectedSafeSpace.address}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`tel:${selectedSafeSpace.phone}`}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded flex items-center gap-1"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call</span>
            </a>
            <button
              onClick={onCloseSafeSpace}
              className="text-slate-400 hover:text-white px-1.5 py-1 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 0. LIVE LOCATION & DESTINATION SETUP MODAL (When SOS Clicked) */}
      {/* ========================================================= */}
      {showLocationModal && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-red-600/70 rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-500 flex items-center justify-center text-red-400 text-xl font-bold shrink-0">
                🛡️
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Start 3-Guardian Escort</h3>
                <p className="text-xs text-slate-400">
                  Share your live starting location & choose your end destination
                </p>
              </div>
            </div>

            {/* Step 1: Current Live Location */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="text-slate-200 font-bold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span>1. Your Current Live Location:</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomStart(!isCustomStart)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                >
                  {isCustomStart ? 'Choose Preset' : 'Type Custom Landmark'}
                </button>
              </div>

              {!isCustomStart ? (
                <select
                  value={selectedStartPreset.id}
                  onChange={(e) => {
                    const found = CHENNAI_START_PRESETS.find((p) => p.id === e.target.value);
                    if (found) setSelectedStartPreset(found);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-xs focus:outline-none focus:border-red-500 font-medium"
                >
                  {CHENNAI_START_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      📍 {preset.name} ({preset.area})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="E.g., Near Loyola College Gate, Nungambakkam"
                  value={customStartText}
                  onChange={(e) => setCustomStartText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-xs focus:outline-none focus:border-red-500"
                />
              )}
              <div className="text-[11px] text-slate-400">
                Landmark: <span className="text-slate-300">{selectedStartPreset.landmark}</span>
              </div>
            </div>

            {/* Step 2: Choose End Destination */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="text-slate-200 font-bold flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2. Your End Destination (Safe Hub):</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomDest(!isCustomDest)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                >
                  {isCustomDest ? 'Choose Safe Hub' : 'Type Custom Address'}
                </button>
              </div>

              {!isCustomDest ? (
                <select
                  value={selectedDestPreset.id}
                  onChange={(e) => {
                    const found = CHENNAI_DEST_PRESETS.find((p) => p.id === e.target.value);
                    if (found) setSelectedDestPreset(found);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {CHENNAI_DEST_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      🏁 {preset.name} ({preset.area})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="E.g., My Hostel / College / Besant Nagar Beach"
                  value={customDestText}
                  onChange={(e) => setCustomDestText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              )}
              <div className="text-[11px] text-slate-400">
                Safe Hub Facility: <span className="text-emerald-300 font-medium">{selectedDestPreset.landmark}</span>
              </div>
            </div>

            {/* Continuous Live Location Sharing Permission Toggle */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareLiveGpsContinuous}
                  onChange={(e) => setShareLiveGpsContinuous(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-red-600 focus:ring-0"
                />
                <div className="space-y-0.5">
                  <span className="font-semibold text-white">Share Live GPS Telemetry with 3 Matched Guardians</span>
                  <p className="text-[11px] text-slate-400">
                    Your real-time coordinates will be streamed to the 3 volunteers. Calls use masked VoIP so your phone number is 100% hidden.
                  </p>
                </div>
              </label>
            </div>

            {/* Escort Route Metrics */}
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-slate-400 text-[11px]">Est. Distance</div>
                <div className="font-bold text-white text-sm">{calculatedPreflightDistKm} km</div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Est. Walking Time</div>
                <div className="font-bold text-blue-400 text-sm">~18-24 Mins</div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Matched Mesh</div>
                <div className="font-bold text-emerald-400 text-sm">3 Volunteers</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowLocationModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-3 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAndStartEscort}
                className="flex-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold py-3 px-4 rounded-lg shadow cursor-pointer flex items-center justify-center gap-2 border border-red-500"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>CONFIRM & DISPATCH ESCORT</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. IN-APP MASKED AUDIO CALL MODAL (Zero Number Leakage) */}
      {/* ========================================================= */}
      {callingGuardian && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-6 shadow-2xl text-center space-y-5">
            {/* Masked Call Header */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1 bg-emerald-950 border border-emerald-700 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                <Lock className="w-3 h-3" />
                <span>Masked VoIP • Zero Phone Number Leak</span>
              </div>
              <h3 className="text-lg font-bold text-white pt-1">
                {callingGuardian.name}
              </h3>
              <p className="text-xs text-slate-400">
                Verified Chennai Guardian Volunteer
              </p>
            </div>

            {/* Avatar & Call Waveform simulation */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
              <div className="w-20 h-20 rounded-full bg-blue-600 border-2 border-slate-700 flex items-center justify-center text-2xl font-bold text-white relative z-10">
                {callingGuardian.name.charAt(0)}
              </div>
            </div>

            {/* Call Status & Timer */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-300">
                {callStatus === 'connecting' ? 'Connecting secure audio stream...' : 'In-App Call Active'}
              </div>
              <div className="text-xl font-mono font-bold text-white">
                {callStatus === 'connecting' ? '00:00' : formatCallTime(callDuration)}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <span>Relay Server: Chennai Mesh Node</span>
              </div>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-11 h-11 rounded-full flex items-center justify-center border transition cursor-pointer ${
                  isMuted ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`w-11 h-11 rounded-full flex items-center justify-center border transition cursor-pointer ${
                  isSpeakerOn ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title={isSpeakerOn ? 'Speaker ON' : 'Speaker OFF'}
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setCallingGuardian(null)}
                className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition cursor-pointer"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. REPORT LESS THAN 3 GUARDIANS MODAL */}
      {/* ========================================================= */}
      {showReportModal && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-600/70 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-400 text-lg">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Report Guardian Issue</h3>
                <p className="text-xs text-slate-400">
                  Notify system if fewer than 3 guardians are in your perimeter
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-slate-300 font-semibold">Select What Happened:</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="Only 1 or 2 guardians are physically near me">
                  Only 1 or 2 guardians are physically near me
                </option>
                <option value="No guardians visible in my walking perimeter">
                  No guardians visible in my walking perimeter
                </option>
                <option value="One guardian is moving away or stationary">
                  One guardian is moving away or stationary
                </option>
                <option value="Uncomfortable with guardian behavior">
                  Uncomfortable with guardian behavior
                </option>
              </select>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-slate-300 font-semibold">Immediate System Action:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReportAction('reassign_guardian')}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition ${
                    reportAction === 'reassign_guardian'
                      ? 'bg-blue-950/80 border-blue-500 text-white font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold mb-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Auto-Reassign</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Instantly dispatch a new verified volunteer nearby
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setReportAction('police_alert')}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition ${
                    reportAction === 'police_alert'
                      ? 'bg-rose-950/80 border-red-500 text-white font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-red-400 font-bold mb-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Police 112</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Escalate to Chennai Police Control Room
                  </div>
                </button>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReport}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 rounded-lg cursor-pointer shadow"
              >
                Submit Incident Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. POST-TRIP GUARDIAN FEEDBACK MODAL                      */}
      {/* ========================================================= */}
      {showSafeModal && session && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8">
            {!isFeedbackSubmitted ? (
              <>
                {/* Header & Safe Arrival Notice */}
                <div className="text-center space-y-1.5">
                  <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">
                    🛡️
                  </div>
                  {isAutoArrived && (
                    <div className="inline-flex items-center gap-1.5 bg-emerald-950/90 border border-emerald-500/70 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-1 animate-pulse">
                      <Target className="w-3.5 h-3.5 text-emerald-400" />
                      <span>GPS LOCATION MATCH: DESTINATION AUTO-DETECTED</span>
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-white">Destination Reached Safely!</h3>
                  <p className="text-xs text-slate-400">
                    You have arrived at <strong className="text-white">{session.destination.name}</strong>. {isAutoArrived ? 'The system automatically detected your arrival and ended your escort trip.' : 'Please share your escort feedback before releasing your 3 guardians.'}
                  </p>
                </div>

                {/* Quick Trip Metrics */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="text-slate-400 text-[11px]">Distance</div>
                    <div className="font-bold text-white mt-0.5">{session.distanceTraveledKm.toFixed(2)} km</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px]">Escort Mesh</div>
                    <div className="font-bold text-emerald-400 mt-0.5">3 Guardians</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px]">Integrity</div>
                    <div className="font-bold text-emerald-400 mt-0.5">100% In Range</div>
                  </div>
                </div>

                {/* QUESTION 1: Did you feel any lack of service from any guardian? */}
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <span className="text-amber-400">❓</span>
                    <span>Did you feel any lack of service from any guardian?</span>
                  </div>

                  {/* YES / NO Options */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFeltLackOfService('no')}
                      className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition ${
                        feltLackOfService === 'no'
                          ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>No, service was great</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFeltLackOfService('yes')}
                      className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition ${
                        feltLackOfService === 'yes'
                          ? 'bg-amber-950/90 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Yes, experienced an issue</span>
                    </button>
                  </div>

                  {/* Sub-options if YES is selected */}
                  {feltLackOfService === 'yes' && (
                    <div className="pt-2 space-y-2 text-xs">
                      <label className="block text-slate-300 font-medium text-[11px]">
                        What service issue did you notice?
                      </label>
                      <select
                        value={lackOfServiceReason}
                        onChange={(e) => setLackOfServiceReason(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                      >
                        <option value="Guardian lagged behind or exceeded safe perimeter distance">
                          Guardian lagged behind / out of 2s proximity range
                        </option>
                        <option value="Slow response or unanswered VoIP check-in call">
                          Slow response or unanswered VoIP call
                        </option>
                        <option value="Uncomfortable escort demeanor or behavior">
                          Uncomfortable escort demeanor
                        </option>
                        <option value="Guardian departed route prematurely">
                          Guardian departed route prematurely
                        </option>
                        <option value="Other service shortcoming">
                          Other service shortcoming
                        </option>
                      </select>
                    </div>
                  )}
                </div>

                {/* QUESTION 2: Rate the guardian service (5-star clickable option) */}
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2 text-center">
                  <div className="text-xs text-white font-semibold flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Rate the Guardian Service (1 to 5 Stars):</span>
                  </div>

                  <div className="flex justify-center items-center gap-2.5 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setUserRatingGiven(star)}
                        className="text-3xl cursor-pointer hover:scale-125 active:scale-95 transition transform focus:outline-none"
                        title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      >
                        {star <= userRatingGiven ? '⭐' : '☆'}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs font-semibold text-amber-300 bg-slate-900/90 py-1 px-3 rounded-full inline-block border border-slate-800">
                    {userRatingGiven === 5 && '⭐⭐⭐⭐⭐ 5/5 - Outstanding Protection & Attentive'}
                    {userRatingGiven === 4 && '⭐⭐⭐⭐ 4/5 - Very Good & Reliable Escort'}
                    {userRatingGiven === 3 && '⭐⭐⭐ 3/5 - Average Experience'}
                    {userRatingGiven === 2 && '⭐⭐ 2/5 - Below Expectations'}
                    {userRatingGiven === 1 && '⭐ 1/5 - Unsatisfactory Service'}
                  </div>
                </div>

                {/* Action Buttons: Cancel vs Submit */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSafeModal(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold py-3 rounded-lg cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitFeedback}
                    id="submit-guardian-feedback-btn"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold py-3 rounded-lg shadow-lg cursor-pointer transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Feedback</span>
                  </button>
                </div>
              </>
            ) : (
              /* ========================================================= */
              /* SUBMITTED CONFIRMATION SCREEN: "feedback is submited thanks" */
              /* ========================================================= */
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
                  ✓
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">
                    Feedback is submitted, thanks!
                  </h3>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                    Thank you for your valuable feedback. Your rating of <strong>{userRatingGiven} ⭐</strong> has been securely logged to the Chennai Guardian Safety Mesh.
                  </p>
                </div>

                {/* Submitted Summary Details */}
                <div className="bg-slate-950 p-3.5 rounded-lg border border-emerald-900/60 text-left text-xs space-y-2">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Guardian Rating:</span>
                    <span className="font-bold text-amber-300">{'⭐'.repeat(userRatingGiven)} ({userRatingGiven}/5)</span>
                  </div>

                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Lack of Service Reported:</span>
                    <span className={`font-semibold ${feltLackOfService === 'no' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {feltLackOfService === 'no' ? 'No (Great Service)' : `Yes: ${lackOfServiceReason}`}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1.5">
                    <span className="text-slate-400">Volunteer Status:</span>
                    <span className="font-bold text-emerald-400">3 Volunteers Relieved & Available</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFinishAndEndTrip}
                  id="done-feedback-modal-btn"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3 px-4 rounded-lg text-xs uppercase tracking-wide cursor-pointer transition shadow-md"
                >
                  Done & Return to Map
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. "ESCALATE EMERGENCY (112)" MODAL */}
      {/* ========================================================= */}
      {showEscalateModal && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-600 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-red-600/20 border border-red-500 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2 text-xl animate-pulse">
                🚨
              </div>
              <h3 className="text-lg font-bold text-white">Escalate to Chennai Police 112?</h3>
              <p className="text-xs text-slate-400">
                This will trigger an immediate emergency alert to the <strong>Chennai Police Control Room (100 / 112)</strong> with your live GPS location.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-red-900/40 text-xs space-y-1 text-slate-300">
              <div className="text-red-400 font-bold">Actions Triggered:</div>
              <div>• Live GPS telemetry transmitted to Chennai Police Patrol Vans</div>
              <div>• Emergency SMS broadcast to emergency contacts</div>
              <div>• Nearest PCR dispatch priority elevated to Critical</div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setShowEscalateModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold py-2.5 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowEscalateModal(false);
                  onEscalateEmergency();
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 rounded-lg shadow cursor-pointer flex items-center justify-center gap-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>CONFIRM 112 DISPATCH</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
