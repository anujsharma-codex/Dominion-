import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Guardian, SafeZone, SafeSpace, RouteWaypoint, RouteOption } from '../types';
import { Plus, Minus, LocateFixed, Shield, Crosshair } from 'lucide-react';

interface MapContainerProps {
  userLocation: { lat: number; lon: number };
  startLocation: { lat: number; lon: number; name: string };
  destination: { lat: number; lon: number; name: string };
  assignedGuardians: Guardian[];
  allGuardians: Guardian[];
  safeZones: SafeZone[];
  safeSpaces: SafeSpace[];
  routeWaypoints: RouteWaypoint[];
  allRoutes?: RouteOption[];
  selectedRouteIndex?: number;
  onSelectRouteIndex?: (index: number) => void;
  currentWaypointIndex: number;
  isSessionActive: boolean;
  onSelectSafeSpace?: (space: SafeSpace) => void;
  isMapPickActive?: 'start' | 'dest' | null;
  onMapClickLocation?: (lat: number, lon: number) => void;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  userLocation,
  startLocation,
  destination,
  assignedGuardians,
  allGuardians,
  safeZones,
  safeSpaces,
  routeWaypoints,
  allRoutes = [],
  selectedRouteIndex = 0,
  onSelectRouteIndex,
  currentWaypointIndex,
  isSessionActive,
  onSelectSafeSpace,
  isMapPickActive = null,
  onMapClickLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    userMarker?: L.Marker;
    startMarker?: L.Marker;
    destMarker?: L.Marker;
    guardianMarkers: L.Marker[];
    safeZoneCircles: L.Circle[];
    safeSpaceMarkers: L.Marker[];
    routeLine?: L.Polyline;
    alternativeRouteLines: L.Polyline[];
    progressLine?: L.Polyline;
    escortMeshLines: L.Polyline[];
  }>({
    guardianMarkers: [],
    safeZoneCircles: [],
    safeSpaceMarkers: [],
    alternativeRouteLines: [],
    escortMeshLines: [],
  });

  // Initialize Map Centered on Chennai
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [13.0450, 80.2600], // Center on Chennai central/beach area
      zoom: 13,
      zoomControl: false,
    });

    // High quality CartoDB Voyager tiles (Google Maps-like clean style)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Map Click Handler for "Pick on Map" mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (isMapPickActive && onMapClickLocation) {
        onMapClickLocation(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [isMapPickActive, onMapClickLocation]);

  // Update Elements on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const layers = layersRef.current;

    // Change cursor style if in map picking mode
    if (mapContainerRef.current) {
      mapContainerRef.current.style.cursor = isMapPickActive ? 'crosshair' : 'grab';
    }

    // 1. Draw Safe Zones (Green Circles)
    layers.safeZoneCircles.forEach((c) => c.remove());
    layers.safeZoneCircles = safeZones.map((zone) => {
      const circle = L.circle([zone.lat, zone.lon], {
        radius: zone.radiusMeters,
        color: '#10B981',
        weight: 1.5,
        fillColor: '#10B981',
        fillOpacity: 0.12,
      }).addTo(map);

      circle.bindPopup(`
        <div style="font-family: inherit; font-size: 12px;">
          <div style="font-weight: bold; color: #10B981; margin-bottom: 2px;">🛡️ Safe Zone: ${zone.name}</div>
          <div style="color: #64748B; font-size: 11px;">${zone.description}</div>
          <div style="color: #94A3B8; font-size: 10px; margin-top: 3px;">Perimeter Radius: ${zone.radiusMeters}m</div>
        </div>
      `);
      return circle;
    });

    // 2. Draw Safe Spaces (Police / Hospitals in Chennai)
    layers.safeSpaceMarkers.forEach((m) => m.remove());
    layers.safeSpaceMarkers = safeSpaces.map((space) => {
      const isPolice = space.type === 'police';
      const iconHtml = `
        <div style="
          background: ${isPolice ? '#1E40AF' : '#DC2626'};
          color: white;
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          border: 1.5px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
          ${isPolice ? '👮' : '🏥'}
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'safe-space-marker',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([space.lat, space.lon], { icon: customIcon }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px;">
          <div style="font-weight: bold; color: #1E293B;">${isPolice ? '👮' : '🏥'} ${space.name}</div>
          <div style="color: #64748B; font-size: 11px; margin-top: 2px;">${space.address}</div>
          <div style="color: #2563EB; font-weight: 600; font-size: 11px; margin-top: 3px;">📞 ${space.phone}</div>
        </div>
      `);

      if (onSelectSafeSpace) {
        marker.on('click', () => onSelectSafeSpace(space));
      }

      return marker;
    });

    // 3. Draw Alternative & Primary Routes (Google Maps Style)
    // Remove old polylines
    layers.alternativeRouteLines.forEach((l) => l.remove());
    layers.alternativeRouteLines = [];
    if (layers.routeLine) layers.routeLine.remove();
    if (layers.progressLine) layers.progressLine.remove();

    // If we have alternative routes (when not active session)
    if (!isSessionActive && allRoutes.length > 0) {
      allRoutes.forEach((r, idx) => {
        const isSelected = idx === selectedRouteIndex;
        const coords: [number, number][] = r.waypoints.map((w) => [w.lat, w.lon]);

        if (!isSelected) {
          // Alternative inactive route: Muted slate-gray line, click to select!
          const altPolyline = L.polyline(coords, {
            color: '#94A3B8',
            weight: 5,
            opacity: 0.6,
            dashArray: '8, 6',
          }).addTo(map);

          altPolyline.bindTooltip(
            `<div style="font-size: 11px; font-weight: bold;">📍 ${r.title} (${r.durationMins} min • ${r.distanceKm} km)<br/><span style="color:#2563EB;">Click to select this route</span></div>`,
            { sticky: true }
          );

          altPolyline.on('click', () => {
            if (onSelectRouteIndex) onSelectRouteIndex(idx);
          });

          layers.alternativeRouteLines.push(altPolyline);
        }
      });
    }

    // Primary Selected Route Line
    const fullRouteCoords: [number, number][] = routeWaypoints.map((w) => [w.lat, w.lon]);
    layers.routeLine = L.polyline(fullRouteCoords, {
      color: '#2563EB', // Google Maps vibrant route blue
      weight: 6,
      opacity: 0.9,
    }).addTo(map);

    // Traveled Progress Line (during active simulation)
    if (isSessionActive && currentWaypointIndex > 0) {
      const progressCoords = fullRouteCoords.slice(0, currentWaypointIndex + 1);
      layers.progressLine = L.polyline(progressCoords, {
        color: '#DC2626',
        weight: 6,
        opacity: 0.95,
      }).addTo(map);
    }

    // 4. Origin Marker (A / Start Point)
    if (layers.startMarker) layers.startMarker.remove();
    const startIcon = L.divIcon({
      html: `
        <div style="
          background: #10B981;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 900;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        ">
          A
        </div>
      `,
      className: 'start-marker',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    layers.startMarker = L.marker([startLocation.lat, startLocation.lon], { icon: startIcon }).addTo(map);
    layers.startMarker.bindPopup(`
      <div style="font-size: 12px;">
        <strong style="color: #10B981;">📍 Starting Point (Origin)</strong>
        <p style="margin: 2px 0 0; color: #475569; font-size: 11px;">${startLocation.name}</p>
      </div>
    `);

    // 5. Destination Marker (B / Safe Hub Sanctuary)
    if (layers.destMarker) layers.destMarker.remove();
    const destIcon = L.divIcon({
      html: `
        <div style="
          background: #DC2626;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 900;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        ">
          🏁
        </div>
      `,
      className: 'dest-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    layers.destMarker = L.marker([destination.lat, destination.lon], { icon: destIcon }).addTo(map);
    layers.destMarker.bindPopup(`
      <div style="font-size: 12px;">
        <strong style="color: #DC2626;">🏁 Destination Safe Sanctuary (B)</strong>
        <p style="margin: 2px 0 0; color: #475569; font-size: 11px;">${destination.name}</p>
      </div>
    `);

    // 6. Guardian Markers & Escort Mesh
    layers.guardianMarkers.forEach((m) => m.remove());
    layers.guardianMarkers = [];
    layers.escortMeshLines.forEach((l) => l.remove());
    layers.escortMeshLines = [];

    const guardiansToDisplay = isSessionActive ? assignedGuardians : allGuardians.slice(0, 6);

    // If active session, draw triangular escort perimeter mesh connecting guardians & user
    if (isSessionActive && assignedGuardians.length > 0) {
      // Connect each guardian to user
      assignedGuardians.forEach((g) => {
        const line = L.polyline(
          [
            [userLocation.lat, userLocation.lon],
            [g.lat, g.lon],
          ],
          {
            color: '#10B981',
            weight: 2,
            dashArray: '4, 4',
            opacity: 0.75,
          }
        ).addTo(map);
        layers.escortMeshLines.push(line);
      });

      // Connect guardians in polygon mesh
      if (assignedGuardians.length >= 3) {
        const polygonCoords = assignedGuardians.map((g) => [g.lat, g.lon] as [number, number]);
        polygonCoords.push([assignedGuardians[0].lat, assignedGuardians[0].lon]);
        const meshPolygon = L.polyline(polygonCoords, {
          color: '#059669',
          weight: 1.5,
          dashArray: '3, 3',
          opacity: 0.6,
        }).addTo(map);
        layers.escortMeshLines.push(meshPolygon);
      }
    }

    layers.guardianMarkers = guardiansToDisplay.map((g, idx) => {
      const isAssigned = assignedGuardians.some((ag) => ag.id === g.id);
      const roleName = idx === 0 ? 'Lead Scout (Point)' : idx === 1 ? 'Rear Sentinel (Tail)' : 'Flank Escort (Sidewalk)';

      const guardianHtml = `
        <div style="
          background: ${isAssigned ? '#10B981' : '#059669'};
          color: white;
          width: ${isAssigned ? '30px' : '26px'};
          height: ${isAssigned ? '30px' : '26px'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isAssigned ? '13px' : '11px'};
          font-weight: bold;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.5);
        ">
          🛡️
        </div>
      `;

      const gIcon = L.divIcon({
        html: guardianHtml,
        className: 'guardian-marker',
        iconSize: isAssigned ? [30, 30] : [26, 26],
        iconAnchor: isAssigned ? [15, 15] : [13, 13],
      });

      const gMarker = L.marker([g.lat, g.lon], { icon: gIcon }).addTo(map);
      gMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; min-width: 170px;">
          <div style="font-weight: bold; color: #0F172A;">${g.name}</div>
          <div style="font-size: 11px; color: #10B981; font-weight: 700; margin-top: 1px;">
            ${isAssigned ? `🟢 ${roleName}` : 'Verified Volunteer'}
          </div>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
            Live Distance: <strong style="color:#0F172A;">${g.distanceKm ? `${Math.round(g.distanceKm * 1000)}m` : '25m'}</strong>
          </div>
          <div style="font-size: 10px; color: #059669; margin-top: 2px;">
            ✓ Proximity integrity confirmed
          </div>
        </div>
      `);

      return gMarker;
    });

    // 7. Live User Marker
    if (layers.userMarker) layers.userMarker.remove();

    const userHtml = `
      <div style="
        background: #DC2626;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        border: 2px solid white;
        box-shadow: 0 2px 10px rgba(220, 38, 38, 0.5);
      ">
        👤
      </div>
    `;

    const userIcon = L.divIcon({
      html: userHtml,
      className: 'user-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    layers.userMarker = L.marker([userLocation.lat, userLocation.lon], { icon: userIcon }).addTo(map);
    layers.userMarker.bindPopup(`
      <div style="font-size: 12px;">
        <strong style="color: #DC2626;">Kavitha Raman (You)</strong>
        <p style="margin: 2px 0 0; font-size: 11px; color: #64748B;">
          ${isSessionActive ? '🟢 Active 3-Guardian Escort in Progress' : '📍 Current Position (Chennai)'}
        </p>
      </div>
    `);

    // Smooth pan when active session or changing start location
    if (isSessionActive) {
      map.panTo([userLocation.lat, userLocation.lon], { animate: true, duration: 0.6 });
    }
  }, [
    userLocation,
    startLocation,
    destination,
    assignedGuardians,
    allGuardians,
    safeZones,
    safeSpaces,
    routeWaypoints,
    allRoutes,
    selectedRouteIndex,
    currentWaypointIndex,
    isSessionActive,
    onSelectSafeSpace,
    isMapPickActive,
    onSelectRouteIndex,
  ]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleRecenter = () => {
    mapInstanceRef.current?.setView([userLocation.lat, userLocation.lon], 14, { animate: true });
  };

  const handleFitRouteBounds = () => {
    const map = mapInstanceRef.current;
    if (!map || routeWaypoints.length === 0) return;
    const bounds = L.latLngBounds(routeWaypoints.map((w) => [w.lat, w.lon]));
    map.fitBounds(bounds, { padding: [40, 40] });
  };

  const progressPercent = Math.round(((currentWaypointIndex + 1) / Math.max(1, routeWaypoints.length)) * 100);

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Picking Active Banner (Overlay at Top of Map) */}
      {isMapPickActive && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600 text-white px-4 py-2 rounded-full shadow-2xl font-bold text-xs flex items-center gap-2 border border-blue-400 animate-bounce pointer-events-auto">
          <Crosshair className="w-4 h-4" />
          <span>Click anywhere on map to set {isMapPickActive === 'start' ? 'Starting Point (A)' : 'Destination (B)'}</span>
        </div>
      )}

      {/* Floating Info Overlay (Top-Right) */}
      <div className="absolute top-3 right-3 z-[1000] bg-slate-900/95 p-3 rounded-lg border border-slate-700 w-48 shadow text-xs pointer-events-auto">
        <div className="text-slate-400 font-medium text-[11px]">Route Status</div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-slate-300">Est. Time</span>
          <span className="font-bold text-white">
            {Math.max(2, Math.round((routeWaypoints.length - currentWaypointIndex) * 1.4))} Mins
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-red-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Floating Safe Space Nearby Banner (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/95 rounded-lg p-2.5 border border-slate-700 max-w-[240px] shadow text-xs pointer-events-auto hidden sm:block">
        <div className="text-emerald-400 flex items-center gap-1 font-bold text-[11px]">
          <Shield className="w-3 h-3 text-emerald-400" />
          <span>Safe Space Nearby</span>
        </div>
        <div className="font-bold text-white mt-0.5">D-6 Marina Police Station</div>
        <div className="text-[11px] text-slate-400">350m away • 24/7 Police Assistance</div>
      </div>

      {/* Zoom, Recenter, and Fit Route Controls (Bottom-Right) */}
      <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-1.5 pointer-events-auto">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 rounded-md flex items-center justify-center cursor-pointer shadow"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 rounded-md flex items-center justify-center cursor-pointer shadow"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleRecenter}
          className="w-8 h-8 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700 rounded-md flex items-center justify-center cursor-pointer shadow"
          title="Center on My Location"
        >
          <LocateFixed className="w-4 h-4" />
        </button>
      </div>

      {/* Map Legend (Top-Left) */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-900/95 px-3 py-2 rounded-lg border border-slate-700 text-[11px] space-y-1 shadow pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 font-bold text-[9px] text-white flex items-center justify-center">A</span>
          <span className="text-white font-medium">Start (Origin)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 font-bold text-[9px] text-white flex items-center justify-center">B</span>
          <span className="text-white font-medium">Destination Safe Hub</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-300">3 Escort Volunteers</span>
        </div>
      </div>
    </div>
  );
};
