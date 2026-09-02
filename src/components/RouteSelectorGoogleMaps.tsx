import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Navigation,
  ArrowUpDown,
  Footprints,
  Car,
  Bus,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Crosshair,
  ShieldAlert,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { RouteOption, LocationPreset, TurnInstruction } from '../types';
import {
  CHENNAI_ALL_LOCATIONS,
  searchChennaiLocations,
  computeAlternativeRoutes,
  findNearestLocation,
} from '../utils/routeGenerator';

interface RouteSelectorGoogleMapsProps {
  startLocation: { lat: number; lon: number; name: string; landmark?: string; area?: string };
  destinationLocation: { lat: number; lon: number; name: string; landmark?: string; area?: string };
  onUpdateStartLocation: (loc: { lat: number; lon: number; name: string; landmark?: string; area?: string }) => void;
  onUpdateDestinationLocation: (loc: { lat: number; lon: number; name: string; landmark?: string; area?: string }) => void;
  routes: RouteOption[];
  selectedRouteIndex: number;
  onSelectRouteIndex: (index: number) => void;
  onStartEscort: () => void;
  isMapPickActive: 'start' | 'dest' | null;
  onToggleMapPick: (target: 'start' | 'dest' | null) => void;
  travelMode: 'walking' | 'driving' | 'transit';
  onChangeTravelMode: (mode: 'walking' | 'driving' | 'transit') => void;
  isNightTime: boolean;
}

export const RouteSelectorGoogleMaps: React.FC<RouteSelectorGoogleMapsProps> = ({
  startLocation,
  destinationLocation,
  onUpdateStartLocation,
  onUpdateDestinationLocation,
  routes,
  selectedRouteIndex,
  onSelectRouteIndex,
  onStartEscort,
  isMapPickActive,
  onToggleMapPick,
  travelMode,
  onChangeTravelMode,
  isNightTime,
}) => {
  // Input search text states
  const [startQuery, setStartQuery] = useState(startLocation.name);
  const [destQuery, setDestQuery] = useState(destinationLocation.name);
  const [showStartDropdown, setShowStartDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

  // Sync inputs when props change (e.g. from map click)
  useEffect(() => {
    setStartQuery(startLocation.name);
  }, [startLocation.name]);

  useEffect(() => {
    setDestQuery(destinationLocation.name);
  }, [destinationLocation.name]);

  const startSuggestions = searchChennaiLocations(startQuery);
  const destSuggestions = searchChennaiLocations(destQuery);

  const selectedRoute = routes[selectedRouteIndex] || routes[0];

  const handleSelectStartPreset = (loc: LocationPreset) => {
    onUpdateStartLocation({
      lat: loc.lat,
      lon: loc.lon,
      name: loc.name,
      landmark: loc.landmark,
      area: loc.area,
    });
    setStartQuery(loc.name);
    setShowStartDropdown(false);
  };

  const handleSelectDestPreset = (loc: LocationPreset) => {
    onUpdateDestinationLocation({
      lat: loc.lat,
      lon: loc.lon,
      name: loc.name,
      landmark: loc.landmark,
      area: loc.area,
    });
    setDestQuery(loc.name);
    setShowDestDropdown(false);
  };

  const handleSwapLocations = () => {
    const tempStart = { ...startLocation };
    const tempDest = { ...destinationLocation };
    onUpdateStartLocation(tempDest);
    onUpdateDestinationLocation(tempStart);
  };

  const handleUseCurrentGps = () => {
    onUpdateStartLocation({
      lat: 13.0500,
      lon: 80.2824,
      name: 'Your Current Live Location (Marina Beach)',
      landmark: 'Live GPS Coordinates Acquired',
      area: 'Triplicane',
    });
    setStartQuery('Your Current Live Location (Marina Beach)');
    setShowStartDropdown(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 sm:p-5 shadow-2xl space-y-4 text-slate-200">
      {/* Header: Google Maps Navigation Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow">
            🗺️
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
              <span>Google Maps Route Planner</span>
              <span className="text-[10px] bg-blue-950 text-blue-300 font-mono px-1.5 py-0.5 rounded border border-blue-700">
                Chennai Live Mesh
              </span>
            </h2>
          </div>
        </div>

        {/* Travel Mode Selector */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1 text-xs">
          <button
            type="button"
            onClick={() => onChangeTravelMode('walking')}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition cursor-pointer ${
              travelMode === 'walking'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Safe Walking Route (High Lighting & Patrols)"
          >
            <Footprints className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Walking</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeTravelMode('transit')}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition cursor-pointer ${
              travelMode === 'transit'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Bus & Metro Corridors"
          >
            <Bus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Transit</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeTravelMode('driving')}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition cursor-pointer ${
              travelMode === 'driving'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Cab & Auto Escort"
          >
            <Car className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vehicle</span>
          </button>
        </div>
      </div>

      {/* Origin & Destination Inputs with Swap & Map Picker */}
      <div className="relative space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
        {/* Origin / Starting Point */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="w-6 flex flex-col items-center shrink-0">
              <span className="w-3 h-3 rounded-full border-2 border-emerald-400 bg-emerald-500" />
              <div className="w-0.5 h-6 bg-slate-700 my-0.5" />
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                value={startQuery}
                onFocus={() => setShowStartDropdown(true)}
                onChange={(e) => {
                  setStartQuery(e.target.value);
                  setShowStartDropdown(true);
                }}
                placeholder="Choose starting point or live GPS..."
                className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-3 pr-20 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
              />

              <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleUseCurrentGps}
                  title="Use Live GPS Location"
                  className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onToggleMapPick(isMapPickActive === 'start' ? null : 'start')}
                  title="Click on map to select start point"
                  className={`p-1 rounded text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                    isMapPickActive === 'start'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  <span className="text-[10px] hidden sm:inline">Pick</span>
                </button>
              </div>
            </div>
          </div>

          {/* Autocomplete Dropdown for Start Location */}
          {showStartDropdown && (
            <div className="absolute left-8 right-0 top-full mt-1 z-[1500] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-800">
              <div className="p-2 bg-slate-950/80 text-[11px] font-bold text-slate-400 flex items-center justify-between">
                <span>Select Starting Point in Chennai:</span>
                <button
                  onClick={() => setShowStartDropdown(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
              <button
                type="button"
                onClick={handleUseCurrentGps}
                className="w-full text-left p-2.5 hover:bg-slate-800 text-xs flex items-center gap-2 text-emerald-400 font-medium transition cursor-pointer"
              >
                <Crosshair className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold">Your Live Location (GPS)</div>
                  <div className="text-[11px] text-slate-400">Marina Beach Promenade, Chennai</div>
                </div>
              </button>
              {startSuggestions.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => handleSelectStartPreset(loc)}
                  className="w-full text-left p-2.5 hover:bg-slate-800 text-xs flex items-center gap-2.5 text-slate-200 transition cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <div className="overflow-hidden">
                    <div className="font-semibold text-white truncate">{loc.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{loc.landmark} ({loc.area})</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Destination Point */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="w-6 flex items-center justify-center shrink-0">
              <span className="w-3.5 h-3.5 rounded-sm border-2 border-red-500 bg-red-600" />
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                value={destQuery}
                onFocus={() => setShowDestDropdown(true)}
                onChange={(e) => {
                  setDestQuery(e.target.value);
                  setShowDestDropdown(true);
                }}
                placeholder="Choose destination safe hub in Chennai..."
                className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-3 pr-16 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-medium"
              />

              <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onToggleMapPick(isMapPickActive === 'dest' ? null : 'dest')}
                  title="Click on map to select destination point"
                  className={`p-1 rounded text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                    isMapPickActive === 'dest'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  <span className="text-[10px] hidden sm:inline">Pick</span>
                </button>
              </div>
            </div>
          </div>

          {/* Autocomplete Dropdown for Destination */}
          {showDestDropdown && (
            <div className="absolute left-8 right-0 top-full mt-1 z-[1500] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-800">
              <div className="p-2 bg-slate-950/80 text-[11px] font-bold text-slate-400 flex items-center justify-between">
                <span>Select Destination Safe Sanctuary:</span>
                <button
                  onClick={() => setShowDestDropdown(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
              {destSuggestions.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => handleSelectDestPreset(loc)}
                  className="w-full text-left p-2.5 hover:bg-slate-800 text-xs flex items-center gap-2.5 text-slate-200 transition cursor-pointer"
                >
                  <span className="text-sm shrink-0">🏁</span>
                  <div className="overflow-hidden">
                    <div className="font-semibold text-white truncate">{loc.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{loc.landmark} ({loc.area})</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Swap Button on Right side */}
        <button
          type="button"
          onClick={handleSwapLocations}
          title="Swap starting point and destination"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full flex items-center justify-center border border-slate-700 shadow transition cursor-pointer"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Map Click Pick Indicator Alert */}
      {isMapPickActive && (
        <div className="bg-blue-950/90 border border-blue-500 rounded-lg p-2.5 text-xs text-blue-200 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Click anywhere on the map to place <strong>{isMapPickActive === 'start' ? 'Starting Point' : 'Destination'}</strong>
            </span>
          </div>
          <button
            onClick={() => onToggleMapPick(null)}
            className="text-blue-300 hover:text-white text-[11px] underline font-bold"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Quick Destination Presets Chips */}
      <div className="space-y-1.5">
        <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
          <span>Popular Chennai Safe Hubs:</span>
          <span className="text-emerald-400 text-[10px]">24/7 Monitored</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CHENNAI_ALL_LOCATIONS.filter((l) => l.category === 'safe_hubs')
            .slice(0, 4)
            .map((hub) => (
              <button
                key={hub.id}
                type="button"
                onClick={() => handleSelectDestPreset(hub)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition cursor-pointer ${
                  destinationLocation.name === hub.name
                    ? 'bg-red-950/80 border-red-500 text-red-200 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                🏁 {hub.name.split(' ')[0]} {hub.name.split(' ')[1]}
              </button>
            ))}
        </div>
      </div>

      {/* Alternative Routes Selector (Google Maps Style) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wide">
            Available Route Options ({routes.length})
          </span>
          <span className="text-[11px] text-slate-400">
            Click on route card or map line to select
          </span>
        </div>

        <div className="space-y-2">
          {routes.map((route, idx) => {
            const isSelected = selectedRouteIndex === idx;
            return (
              <div
                key={route.id}
                onClick={() => onSelectRouteIndex(idx)}
                className={`rounded-lg p-3 border transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-950 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-slate-600 bg-transparent'
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {route.title}
                        </span>
                        {route.tag && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              idx === 0
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {route.tag}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                        {route.summary}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-white font-mono">
                      {route.durationMins} min
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {route.distanceKm} km
                    </div>
                  </div>
                </div>

                {/* Safety Score Bar */}
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Safety Score: <strong>{route.safetyScore}%</strong></span>
                  </div>
                  <span className="text-slate-400 text-[10px]">
                    {route.riskRating === 'low' ? '🟢 Lit & High Patrol' : '🟡 Active Traffic'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Turn-by-Turn Navigation & Steps Drawer (Collapsible) */}
      <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setShowDetailsDrawer(!showDetailsDrawer)}
          className="w-full p-2.5 flex items-center justify-between text-slate-300 hover:text-white font-semibold cursor-pointer transition"
        >
          <div className="flex items-center gap-2">
            <Navigation className="w-3.5 h-3.5 text-blue-400" />
            <span>Turn-by-Turn Directions & Safe Points ({selectedRoute.steps.length} Steps)</span>
          </div>
          {showDetailsDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetailsDrawer && (
          <div className="p-3 border-t border-slate-800 space-y-2.5 max-h-52 overflow-y-auto divide-y divide-slate-900">
            {selectedRoute.steps.map((step, sIdx) => (
              <div key={step.id} className="pt-2 first:pt-0 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0 mt-0.5">
                  {sIdx + 1}
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${step.isSafeHighlight ? 'text-emerald-300 font-semibold' : 'text-slate-200'}`}>
                    {step.instruction}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{step.distanceMeters}m</span>
                    {step.landmark && <span>• {step.landmark}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Button: Start Safe Escort on Selected Google Maps Route */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onStartEscort}
          id="confirm-route-start-escort-button"
          className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-3.5 px-5 rounded-lg text-sm sm:text-base uppercase tracking-wide flex items-center justify-center gap-2.5 shadow-xl transition cursor-pointer border border-red-500"
        >
          <ShieldAlert className="w-5 h-5 animate-pulse" />
          <span>START SAFE ESCORT ON THIS ROUTE</span>
        </button>
        <p className="text-center text-[11px] text-slate-400 mt-1.5">
          Matches 3 verified volunteers who silently escort you along this {selectedRoute.distanceKm} km path.
        </p>
      </div>
    </div>
  );
};
