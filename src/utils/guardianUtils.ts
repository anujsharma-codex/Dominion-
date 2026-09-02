import { Guardian, RouteWaypoint } from '../types';
import { haversine } from './distance';

/**
 * Distribute available community volunteer guardians along & around the selected route corridor
 * so that when looking at any selected route in Chennai, active verified guardians are positioned
 * realistically along that corridor.
 */
export function generateGuardiansForRoute(
  routeWaypoints: RouteWaypoint[],
  startLoc: { lat: number; lon: number },
  baseGuardians: Guardian[]
): Guardian[] {
  if (!routeWaypoints || routeWaypoints.length === 0) {
    return baseGuardians;
  }

  const totalPoints = routeWaypoints.length;
  // Position markers at key fractions along the route
  const fractionSteps = [0.1, 0.3, 0.5, 0.7, 0.85, 0.95];

  return baseGuardians.map((g, idx) => {
    const stepIdx = idx % fractionSteps.length;
    const fraction = fractionSteps[stepIdx];
    const targetIdx = Math.floor(fraction * (totalPoints - 1));
    const targetWaypoint = routeWaypoints[targetIdx] || routeWaypoints[0];

    // Subtle natural sidewalk/corridor offset (~20-40 meters)
    const seed = (idx * 9301 + 49297) % 233280;
    const rnd = seed / 233280;
    const angle = (idx * (2 * Math.PI)) / 6;
    const offsetDist = 0.00025 + rnd * 0.0002; // ~25 to 45 meters

    const lat = targetWaypoint.lat + Math.cos(angle) * offsetDist;
    const lon = targetWaypoint.lon + Math.sin(angle) * offsetDist;
    const distanceKm = haversine(startLoc.lat, startLoc.lon, lat, lon);

    return {
      ...g,
      lat,
      lon,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      isAvailable: true,
    };
  });
}

/**
 * Calculates the 3-guardian synchronized tactical escort positions for a specific waypoint
 * along the selected route.
 * - Guardian 1 (Point / Lead Scout): ~25-30m ahead on the route trajectory
 * - Guardian 2 (Tail / Rear Sentinel): ~25-30m behind on the route trajectory
 * - Guardian 3 (Flank / Side Wing): ~15-20m perpendicular on the sidewalk
 */
export function calculateTacticalEscortPositions(
  routeWaypoints: RouteWaypoint[],
  currentIdx: number,
  guardians: Guardian[]
): Guardian[] {
  if (!routeWaypoints || routeWaypoints.length === 0) {
    return guardians;
  }

  const currentWp = routeWaypoints[currentIdx] || routeWaypoints[0];
  const nextWp = routeWaypoints[Math.min(routeWaypoints.length - 1, currentIdx + 1)];
  const prevWp = routeWaypoints[Math.max(0, currentIdx - 1)];

  // Heading vector of the current road segment
  let dLat = nextWp.lat - prevWp.lat;
  let dLon = nextWp.lon - prevWp.lon;
  const len = Math.sqrt(dLat * dLat + dLon * dLon) || 0.0001;

  // Normalized forward and perpendicular unit vectors
  const fLat = dLat / len;
  const fLon = dLon / len;
  const pLat = -fLon; // Perpendicular (sidewalk)
  const pLon = fLat;

  // 3-Guardian Tactical Formation
  const roles = [
    { title: 'Lead Scout (Point)', forwardMeters: 0.0003, perpMeters: 0.00008, fallbackIdx: Math.min(routeWaypoints.length - 1, currentIdx + 1) },
    { title: 'Rear Sentinel (Tail)', forwardMeters: -0.0003, perpMeters: -0.00008, fallbackIdx: Math.max(0, currentIdx - 1) },
    { title: 'Flank Escort (Sidewalk)', forwardMeters: 0.00005, perpMeters: 0.00018, fallbackIdx: currentIdx },
  ];

  return guardians.slice(0, 3).map((g, i) => {
    const role = roles[i] || roles[0];
    const targetWp = routeWaypoints[role.fallbackIdx] || currentWp;

    // Position tightly coupled to the route segment
    const lat = targetWp.lat + fLat * role.forwardMeters * 0.5 + pLat * role.perpMeters;
    const lon = targetWp.lon + fLon * role.forwardMeters * 0.5 + pLon * role.perpMeters;
    const distMeters = Math.round(haversine(currentWp.lat, currentWp.lon, lat, lon) * 1000);

    return {
      ...g,
      lat,
      lon,
      distanceKm: distMeters / 1000,
    };
  });
}
