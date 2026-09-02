/**
 * Guardian Circle - Chennai Women & Student Safety System
 * Google Maps-Style Route Selection & 3-Volunteer Silent Escort Mesh
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { MapContainer } from './components/MapContainer';
import { RouteSelectorGoogleMaps } from './components/RouteSelectorGoogleMaps';
import { UserSOSView } from './components/UserSOSView';

import {
  SAMPLE_GUARDIANS,
  SAFE_ZONES,
  SAFE_SPACES,
  INITIAL_USER,
} from './data/sampleData';
import {
  Guardian,
  User,
  SafetySession,
  SafeSpace,
  RouteWaypoint,
  RouteOption,
  IntegrityCheckStatus,
  LocationPreset,
} from './types';
import { MatchingEngine } from './core/matchingEngine';
import { FraudDetector } from './core/fraudDetector';
import {
  CHENNAI_ALL_LOCATIONS,
  computeAlternativeRoutes,
  findNearestLocation,
} from './utils/routeGenerator';
import { haversine, isWithinRadius } from './utils/distance';
import {
  generateGuardiansForRoute,
  calculateTacticalEscortPositions,
} from './utils/guardianUtils';

export default function App() {
  const [isNightTime, setIsNightTime] = useState<boolean>(false);
  const [user, setUser] = useState<User>(INITIAL_USER);
  const [guardians, setGuardians] = useState<Guardian[]>(SAMPLE_GUARDIANS);
  const [activeSession, setActiveSession] = useState<SafetySession | null>(null);

  // Google Maps Origin and Destination State
  const [startLocation, setStartLocation] = useState<{
    lat: number;
    lon: number;
    name: string;
    landmark?: string;
    area?: string;
  }>({
    lat: 13.0500,
    lon: 80.2824,
    name: 'Marina Beach Promenade (Origin A)',
    landmark: "Opposite Queen Mary's College, Kamarajar Salai",
    area: 'Triplicane / Santhome',
  });

  const [destinationLocation, setDestinationLocation] = useState<{
    lat: number;
    lon: number;
    name: string;
    landmark?: string;
    area?: string;
  }>({
    lat: 13.0001,
    lon: 80.2667,
    name: "Besant Nagar Elliot's Beach Safe Hub (Dest B)",
    landmark: "Schmidt Memorial & All-Women Police Booth",
    area: 'Besant Nagar',
  });

  // Travel Mode ('walking' | 'driving' | 'transit')
  const [travelMode, setTravelMode] = useState<'walking' | 'driving' | 'transit'>('walking');

  // Alternative Routes generated dynamically
  const alternativeRoutes: RouteOption[] = useMemo(() => {
    return computeAlternativeRoutes(startLocation, destinationLocation, travelMode);
  }, [startLocation, destinationLocation, travelMode]);

  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);

  // Map click picking state ('start' | 'dest' | null)
  const [isMapPickActive, setIsMapPickActive] = useState<'start' | 'dest' | null>(null);

  // Simulation playback state
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [selectedSafeSpace, setSelectedSafeSpace] = useState<SafeSpace | null>(null);

  // Background 2-second integrity and proximity status
  const [integrityStatus, setIntegrityStatus] = useState<IntegrityCheckStatus | null>(null);

  // Toast banner state
  const [toastMessage, setToastMessage] = useState<{ text: string; icon: string; type?: 'info' | 'success' | 'danger' } | null>({
    text: 'Google Maps route selection active. Pick your start & destination or click on the map to choose routes.',
    icon: '🗺️',
  });

  const matchingEngine = useMemo(() => new MatchingEngine(guardians), [guardians]);
  const fraudDetector = useMemo(() => new FraudDetector(), []);

  // Selected active route
  const currentRoute = alternativeRoutes[selectedRouteIndex] || alternativeRoutes[0];
  const routeWaypoints = currentRoute.waypoints;

  // When route or origin/destination changes (and no active session),
  // dynamically position active volunteers along the selected route corridor!
  useEffect(() => {
    if (!activeSession && routeWaypoints.length > 0) {
      const routeStationedGuardians = generateGuardiansForRoute(
        routeWaypoints,
        startLocation,
        SAMPLE_GUARDIANS
      );
      setGuardians(routeStationedGuardians);
    }
  }, [routeWaypoints, startLocation, activeSession]);

  // Current user coordinates based on active route
  const currentWaypoint = routeWaypoints[currentWaypointIndex] || routeWaypoints[0];
  const userCoordinates = {
    lat: currentWaypoint.lat,
    lon: currentWaypoint.lon,
  };

  // Toast notification helper
  const showToast = (text: string, icon: string = '🛡️', type: 'info' | 'success' | 'danger' = 'info') => {
    setToastMessage({ text, icon, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  // Handle map click when in location-picking mode
  const handleMapClickLocation = (lat: number, lon: number) => {
    const nearest = findNearestLocation(lat, lon);
    const customPoint = {
      lat,
      lon,
      name: `Point near ${nearest.name}`,
      landmark: `Selected on map near ${nearest.landmark} (${nearest.area})`,
      area: nearest.area,
    };

    if (isMapPickActive === 'start') {
      setStartLocation(customPoint);
      setCurrentWaypointIndex(0);
      showToast(`📍 Start Point updated to: ${customPoint.name}`, '📍', 'success');
    } else if (isMapPickActive === 'dest') {
      setDestinationLocation(customPoint);
      setCurrentWaypointIndex(0);
      showToast(`🏁 Destination updated to: ${customPoint.name}`, '🏁', 'success');
    }

    setIsMapPickActive(null);
  };

  // 1. Trigger SOS & Start Escort with Selected Google Maps Route
  const handleStartEscort = () => {
    setCurrentWaypointIndex(0);

    // Match 3 closest verified volunteers in Chennai near the starting location
    const matchResults = matchingEngine.findBestGuardians(startLocation.lat, startLocation.lon, 3);

    if (matchResults.length < 3) {
      showToast('Insufficient volunteers nearby. Escalating immediately to Chennai Police (112).', '⚠️', 'danger');
      return;
    }

    const matchedGuardians = matchResults.map((m) => m.guardian);

    // Compute tactical 3-guardian escort formation directly along the route at waypoint 0
    const positionedGuardians = calculateTacticalEscortPositions(
      routeWaypoints,
      0,
      matchedGuardians
    ).map((g) => ({ ...g, isAvailable: false }));

    // Mark matched guardians as busy in pool
    setGuardians((prev) =>
      prev.map((g) => {
        const isMatched = positionedGuardians.some((mg) => mg.id === g.id);
        return isMatched ? { ...g, isAvailable: false } : g;
      })
    );

    const perimeterOffsets = [
      { latOffset: 0.0003, lonOffset: 0.0001 },
      { latOffset: -0.0003, lonOffset: -0.0001 },
      { latOffset: 0.0001, lonOffset: 0.0002 },
    ];

    const newSession: SafetySession = {
      sessionId: `CHN_${Math.floor(1000 + Math.random() * 9000)}`,
      userId: user.id,
      user: { ...user, lat: startLocation.lat, lon: startLocation.lon },
      guardians: positionedGuardians,
      status: 'active',
      startTime: new Date().toLocaleTimeString(),
      currentWaypointIndex: 0,
      currentLocation: { lat: startLocation.lat, lon: startLocation.lon },
      destination: {
        lat: destinationLocation.lat,
        lon: destinationLocation.lon,
        name: destinationLocation.name,
      },
      audioRecording: true,
      videoStreaming: true,
      riskLevel: currentRoute.riskRating,
      distanceTraveledKm: 0,
      emergencyTriggered: false,
      guardianPerimeterOffsets: perimeterOffsets,
      incidentReports: [],
    };

    setActiveSession(newSession);
    setIsSimulating(true);

    // Run initial 2-second background check
    const initialCheck = fraudDetector.verifyIntegrityEvery2Seconds(newSession, user, positionedGuardians);
    setIntegrityStatus(initialCheck);

    showToast(
      `✅ 3 Verified Guardians Dispatched: ${matchedGuardians.map((g) => g.name).join(', ')}`,
      '🛡️',
      'success'
    );
  };

  // 2. Continuous 2-Second Background Guardian Proximity & Anti-Fraud Engine
  useEffect(() => {
    if (!activeSession) {
      setIntegrityStatus(null);
      return;
    }

    const runBackgroundIntegrityCheck = () => {
      const checkResult = fraudDetector.verifyIntegrityEvery2Seconds(
        activeSession,
        user,
        activeSession.guardians
      );
      setIntegrityStatus(checkResult);
    };

    // Run immediately
    runBackgroundIntegrityCheck();

    // Checked every 2 seconds in background
    const interval = setInterval(runBackgroundIntegrityCheck, 2000);
    return () => clearInterval(interval);
  }, [activeSession, user, currentWaypointIndex]);

  // 3. Complete Session Safely
  const handleEndSessionSafe = (ratingGiven: number) => {
    if (!activeSession) return;

    // Release assigned guardians
    setGuardians((prev) =>
      prev.map((g) => {
        const wasAssigned = activeSession.guardians.some((ag) => ag.id === g.id);
        if (wasAssigned) {
          return {
            ...g,
            isAvailable: true,
            totalSessions: g.totalSessions + 1,
            successfulSessions: g.successfulSessions + 1,
          };
        }
        return g;
      })
    );

    setActiveSession(null);
    setIsSimulating(false);
    setIntegrityStatus(null);
    setCurrentWaypointIndex(0);

    showToast(
      `🎉 You reached ${destinationLocation.name} safely! Rated (${ratingGiven} ⭐). Volunteers relieved.`,
      '✨',
      'success'
    );
  };

  // 4. Escalate Emergency (112 Police)
  const handleEscalateEmergency = () => {
    if (!activeSession) return;

    setGuardians((prev) =>
      prev.map((g) => {
        const wasAssigned = activeSession.guardians.some((ag) => ag.id === g.id);
        return wasAssigned ? { ...g, isAvailable: true } : g;
      })
    );

    setActiveSession(null);
    setIsSimulating(false);
    setIntegrityStatus(null);
    setCurrentWaypointIndex(0);

    showToast(
      '🚨 Emergency Escalated! Dispatched to Chennai Police Control Room (100 / 112) with live GPS telemetry.',
      '⚠️',
      'danger'
    );
  };

  // 5. Report Missing Guardians
  const handleReportMissingGuardians = (reason: string, action: 'reassign_guardian' | 'police_alert') => {
    if (!activeSession) return;

    if (action === 'police_alert') {
      handleEscalateEmergency();
      return;
    }

    const availableGuardians = guardians.filter(
      (g) => g.isAvailable && !activeSession.guardians.some((ag) => ag.id === g.id)
    );

    if (availableGuardians.length > 0) {
      const replacement = availableGuardians[0];

      setGuardians((prev) =>
        prev.map((g) => (g.id === replacement.id ? { ...g, isAvailable: false } : g))
      );

      const updatedGuardiansList = [
        activeSession.guardians[0],
        activeSession.guardians[1],
        {
          ...replacement,
          lat: userCoordinates.lat - 0.0004,
          lon: userCoordinates.lon - 0.0007,
          isAvailable: false,
        },
      ];

      setActiveSession({
        ...activeSession,
        guardians: updatedGuardiansList,
        incidentReports: [
          ...(activeSession.incidentReports || []),
          {
            id: `INC_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            reason,
            action: 'reassign_guardian',
            status: 'resolved',
          },
        ],
      });

      showToast(
        `⚠️ Incident Logged: Replacement guardian (${replacement.name}) dispatched to restore 3-guardian perimeter.`,
        '🔄',
        'success'
      );
    } else {
      showToast(
        '⚠️ No backup volunteers nearby. Increasing alert priority & dispatching police notification.',
        '⚠️',
        'danger'
      );
    }
  };

  // Step Forward Along Waypoint Route
  const stepForwardRoute = () => {
    if (currentWaypointIndex < routeWaypoints.length - 1) {
      const nextIndex = currentWaypointIndex + 1;
      const prevCoord = routeWaypoints[currentWaypointIndex];
      const nextCoord = routeWaypoints[nextIndex];
      const segmentDist = haversine(prevCoord.lat, prevCoord.lon, nextCoord.lat, nextCoord.lon);

      setCurrentWaypointIndex(nextIndex);

      // Check if user entered a Safe Zone
      const matchingSafeZone = SAFE_ZONES.find((sz) =>
        isWithinRadius(nextCoord.lat, nextCoord.lon, sz.lat, sz.lon, sz.radiusMeters)
      );
      if (matchingSafeZone) {
        showToast(`📍 Safe Zone Entered: ${matchingSafeZone.name}`, '🛡️', 'success');
      }

      if (activeSession) {
        // Move assigned 3 guardians in tactical escort formation directly along the route!
        const updatedGuardians = calculateTacticalEscortPositions(
          routeWaypoints,
          nextIndex,
          activeSession.guardians
        );

        setActiveSession({
          ...activeSession,
          currentWaypointIndex: nextIndex,
          currentLocation: { lat: nextCoord.lat, lon: nextCoord.lon },
          distanceTraveledKm: activeSession.distanceTraveledKm + segmentDist,
          riskLevel: nextCoord.riskRating,
          guardians: updatedGuardians,
        });
      }

      if (nextIndex === routeWaypoints.length - 1) {
        setIsSimulating(false);
        showToast(`🏁 Reached Destination Safe Hub: ${destinationLocation.name}!`, '🎉', 'success');
      }
    } else {
      setIsSimulating(false);
    }
  };

  // Reset route
  const resetRoute = () => {
    setCurrentWaypointIndex(0);
    setIsSimulating(false);
    if (activeSession) {
      const resetGuardians = calculateTacticalEscortPositions(
        routeWaypoints,
        0,
        activeSession.guardians
      );
      setActiveSession({
        ...activeSession,
        currentWaypointIndex: 0,
        currentLocation: {
          lat: routeWaypoints[0].lat,
          lon: routeWaypoints[0].lon,
        },
        guardians: resetGuardians,
        distanceTraveledKm: 0,
      });
    }
    showToast('Route reset to starting point.', '📍');
  };

  // Simulation Timer Loop (2s per step / simSpeed)
  useEffect(() => {
    if (!isSimulating) return;

    const intervalMs = Math.max(500, 2000 / simSpeed);
    const timer = setInterval(() => {
      stepForwardRoute();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isSimulating, currentWaypointIndex, simSpeed, activeSession, routeWaypoints]);

  // Media toggles
  const handleToggleAudio = () => {
    if (!activeSession) return;
    const newState = !activeSession.audioRecording;
    setActiveSession({ ...activeSession, audioRecording: newState });
    showToast(newState ? '🎙️ Live Audio recording started (encrypted stream).' : 'Audio recording paused.', '🎙️');
  };

  const handleToggleVideo = () => {
    if (!activeSession) return;
    const newState = !activeSession.videoStreaming;
    setActiveSession({ ...activeSession, videoStreaming: newState });
    showToast(newState ? '📹 Live Video camera streaming active.' : 'Video camera paused.', '📹');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Navbar
        isNightTime={isNightTime}
        onToggleNightTime={() => {
          setIsNightTime((prev) => !prev);
          showToast(!isNightTime ? '🌙 Night mode risk factor activated.' : '☀️ Day mode active.', '🌙');
        }}
        isSessionActive={activeSession !== null}
        integrityStatus={integrityStatus}
      />

      {/* Floating Alert / Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-[2000] max-w-md bg-slate-900 border border-slate-700 text-slate-100 px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 text-xs">
          <span className="text-lg">{toastMessage.icon}</span>
          <span className="flex-1 font-medium">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive Leaflet Map (Supports Multi-Route & Click to Pick) */}
          <div className="lg:col-span-7 h-[460px] sm:h-[540px] lg:h-[620px]">
            <MapContainer
              userLocation={userCoordinates}
              startLocation={startLocation}
              destination={destinationLocation}
              assignedGuardians={activeSession ? activeSession.guardians : []}
              allGuardians={guardians}
              safeZones={SAFE_ZONES}
              safeSpaces={SAFE_SPACES}
              routeWaypoints={routeWaypoints}
              allRoutes={alternativeRoutes}
              selectedRouteIndex={selectedRouteIndex}
              onSelectRouteIndex={setSelectedRouteIndex}
              currentWaypointIndex={currentWaypointIndex}
              isSessionActive={activeSession !== null}
              onSelectSafeSpace={setSelectedSafeSpace}
              isMapPickActive={isMapPickActive}
              onMapClickLocation={handleMapClickLocation}
            />
          </div>

          {/* Right Column: Google Maps Route Selector OR Live Escort HUD */}
          <div className="lg:col-span-5 flex flex-col justify-start">
            {!activeSession ? (
              <RouteSelectorGoogleMaps
                startLocation={startLocation}
                destinationLocation={destinationLocation}
                onUpdateStartLocation={(loc) => {
                  setStartLocation(loc);
                  setCurrentWaypointIndex(0);
                }}
                onUpdateDestinationLocation={(loc) => {
                  setDestinationLocation(loc);
                  setCurrentWaypointIndex(0);
                }}
                routes={alternativeRoutes}
                selectedRouteIndex={selectedRouteIndex}
                onSelectRouteIndex={setSelectedRouteIndex}
                onStartEscort={handleStartEscort}
                isMapPickActive={isMapPickActive}
                onToggleMapPick={setIsMapPickActive}
                travelMode={travelMode}
                onChangeTravelMode={setTravelMode}
                isNightTime={isNightTime}
              />
            ) : (
              <UserSOSView
                session={activeSession}
                onStartEscortWithRoute={(start, dest) => {
                  setStartLocation(start);
                  setDestinationLocation(dest);
                  handleStartEscort();
                }}
                onEndSessionSafe={handleEndSessionSafe}
                onEscalateEmergency={handleEscalateEmergency}
                onToggleAudio={handleToggleAudio}
                onToggleVideo={handleToggleVideo}
                isSimulating={isSimulating}
                onToggleSimulation={() => setIsSimulating(!isSimulating)}
                onStepForward={stepForwardRoute}
                onResetRoute={resetRoute}
                simSpeed={simSpeed}
                onChangeSimSpeed={setSimSpeed}
                currentWaypoint={currentWaypoint}
                totalWaypoints={routeWaypoints.length}
                currentWaypointIndex={currentWaypointIndex}
                selectedSafeSpace={selectedSafeSpace}
                onCloseSafeSpace={() => setSelectedSafeSpace(null)}
                isNightTime={isNightTime}
                onReportMissingGuardians={handleReportMissingGuardians}
                integrityStatus={integrityStatus}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4 px-6 text-center">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>Guardian Circle — Google Maps-Style Route Selection & Chennai Women Safety System</span>
          <span>Anonymous In-App VoIP • 3-Volunteer Triangulation Mesh • Background 2s Proximity Checks</span>
        </div>
      </footer>
    </div>
  );
}
