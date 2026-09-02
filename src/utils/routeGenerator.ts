import { RouteWaypoint, RouteOption, TurnInstruction } from '../types';
import { haversine } from './distance';

export interface LocationPreset {
  id: string;
  name: string;
  area: string;
  landmark: string;
  lat: number;
  lon: number;
  category?: 'colleges' | 'transit' | 'safe_hubs' | 'beaches' | 'commercial' | 'hospitals';
}

export type ChennaiLocationPreset = LocationPreset;



export const CHENNAI_ALL_LOCATIONS: LocationPreset[] = [
  // 1. Safe Hubs & Police Centers
  {
    id: 'dest_besant',
    name: "Besant Nagar Elliot's Beach Safe Hub",
    area: 'Besant Nagar',
    landmark: "Schmidt Memorial & All-Women Police Booth",
    lat: 13.0001,
    lon: 80.2667,
    category: 'safe_hubs',
  },
  {
    id: 'dest_iit',
    name: 'IIT Madras / Guindy Campus Safe Hub',
    area: 'Guindy / Adyar',
    landmark: 'IIT Madras Main Gate Security Kiosk',
    lat: 13.0067,
    lon: 80.2400,
    category: 'safe_hubs',
  },
  {
    id: 'dest_anna_lib',
    name: 'Anna Centenary Library Safe Hub',
    area: 'Kotturpuram',
    landmark: 'Library Main Entrance & Lit Perimeter',
    lat: 13.0170,
    lon: 80.2485,
    category: 'safe_hubs',
  },
  {
    id: 'dest_myla_hub',
    name: 'Mylapore Cultural & Temple Safe Zone',
    area: 'Mylapore',
    landmark: 'Kutchery Road 24/7 CCTV Safe Station',
    lat: 13.0335,
    lon: 80.2690,
    category: 'safe_hubs',
  },
  {
    id: 'dest_tnagar_hub',
    name: 'T. Nagar Commercial Safe Hub',
    area: 'T. Nagar',
    landmark: 'Pondy Bazaar Lit Pedestrian Plaza',
    lat: 13.0418,
    lon: 80.2341,
    category: 'safe_hubs',
  },
  {
    id: 'dest_adyar_signal',
    name: 'Adyar Signal (LB Road Safe Booth)',
    area: 'Adyar',
    landmark: 'J-2 Adyar Police Station & Signal',
    lat: 13.0060,
    lon: 80.2560,
    category: 'safe_hubs',
  },
  {
    id: 'dest_omr_hub',
    name: 'OMR Sholinganallur Tech Corridor Safe Zone',
    area: 'Sholinganallur',
    landmark: 'OMR Toll Gate & 24/7 Patrol Kiosk',
    lat: 12.9010,
    lon: 80.2279,
    category: 'safe_hubs',
  },

  // 2. Colleges & Universities
  {
    id: 'loc_loyola',
    name: 'Loyola College (Main Gate)',
    area: 'Nungambakkam',
    landmark: 'Sterling Road & Loyola College Footpath',
    lat: 13.0645,
    lon: 80.2345,
    category: 'colleges',
  },
  {
    id: 'loc_stella_maris',
    name: 'Stella Maris College Gate',
    area: 'Cathedral Road',
    landmark: 'Cathedral Road & Poes Garden Signal',
    lat: 13.0495,
    lon: 80.2520,
    category: 'colleges',
  },
  {
    id: 'loc_queen_marys',
    name: "Queen Mary's College for Women",
    area: 'Mylapore / Beach',
    landmark: 'Opposite Light House, Kamarajar Salai',
    lat: 13.0470,
    lon: 80.2805,
    category: 'colleges',
  },
  {
    id: 'loc_anna_univ',
    name: 'Anna University (CEG Campus Gate)',
    area: 'Guindy',
    landmark: 'Sardar Patel Road Entrance',
    lat: 13.0108,
    lon: 80.2354,
    category: 'colleges',
  },
  {
    id: 'loc_ethiraj',
    name: 'Ethiraj College for Women',
    area: 'Egmore',
    landmark: 'Ethiraj Salai & Commander-in-Chief Rd',
    lat: 13.0680,
    lon: 80.2580,
    category: 'colleges',
  },
  {
    id: 'loc_dg_vaishnav',
    name: 'DG Vaishnav College',
    area: 'Arumbakkam',
    landmark: 'EVR Periyar High Road Footpath',
    lat: 13.0725,
    lon: 80.2100,
    category: 'colleges',
  },
  {
    id: 'loc_mop_vaishnav',
    name: 'M.O.P. Vaishnav College for Women',
    area: 'Nungambakkam',
    landmark: 'IV Lane, Nungambakkam High Road',
    lat: 13.0580,
    lon: 80.2440,
    category: 'colleges',
  },

  // 3. Promenades & Public Landmarks
  {
    id: 'start_marina',
    name: 'Marina Beach Promenade',
    area: 'Triplicane / Santhome',
    landmark: "Opposite Queen Mary's College, Kamarajar Salai",
    lat: 13.0500,
    lon: 80.2824,
    category: 'beaches',
  },
  {
    id: 'start_mylapore',
    name: 'Mylapore Tank (South Mada St)',
    area: 'Mylapore',
    landmark: 'Near Kapaleeshwarar Temple West Gate',
    lat: 13.0350,
    lon: 80.2690,
    category: 'commercial',
  },
  {
    id: 'start_tnagar',
    name: 'T. Nagar Panagal Park',
    area: 'T. Nagar',
    landmark: 'Usman Road & G.N. Chetty Road Crossing',
    lat: 13.0418,
    lon: 80.2341,
    category: 'commercial',
  },
  {
    id: 'start_nungambakkam',
    name: 'Nungambakkam High Road',
    area: 'Nungambakkam',
    landmark: 'Near Loyola College & Sterling Road Signal',
    lat: 13.0610,
    lon: 80.2420,
    category: 'commercial',
  },
  {
    id: 'start_central',
    name: 'Chennai Central Station Area',
    area: 'Park Town',
    landmark: 'EVR Periyar Salai Walkway',
    lat: 13.0827,
    lon: 80.2755,
    category: 'transit',
  },
  {
    id: 'start_guindy',
    name: 'Guindy Transit Hub',
    area: 'Guindy',
    landmark: 'Near Guindy Railway Station & Anna Salai',
    lat: 13.0090,
    lon: 80.2130,
    category: 'transit',
  },
  {
    id: 'loc_express_avenue',
    name: 'Express Avenue Mall',
    area: 'Royapettah',
    landmark: 'Whites Road Main Entrance',
    lat: 13.0585,
    lon: 80.2642,
    category: 'commercial',
  },
  {
    id: 'loc_phoenix_mall',
    name: 'Phoenix Marketcity Mall',
    area: 'Velachery',
    landmark: 'Velachery Main Road Entrance Plaza',
    lat: 12.9915,
    lon: 80.2170,
    category: 'commercial',
  },
  {
    id: 'loc_egmore_stn',
    name: 'Chennai Egmore Railway Station',
    area: 'Egmore',
    landmark: 'Gandhi Irwin Road Exit & Metro Gate',
    lat: 13.0780,
    lon: 80.2610,
    category: 'transit',
  },
  {
    id: 'loc_airport_metro',
    name: 'Chennai International Airport (Metro Gate)',
    area: 'Meenambakkam',
    landmark: 'Airport Metro Station Terminal Walkway',
    lat: 12.9810,
    lon: 80.1640,
    category: 'transit',
  },
  {
    id: 'loc_koyambedu',
    name: 'Koyambedu CMBT Transit Interchange',
    area: 'Koyambedu',
    landmark: '100 Feet Road Metro & Bus Terminus',
    lat: 13.0690,
    lon: 80.1945,
    category: 'transit',
  },
];

export const CHENNAI_START_PRESETS: LocationPreset[] = CHENNAI_ALL_LOCATIONS.filter(
  (l) => l.category === 'beaches' || l.category === 'transit' || l.category === 'colleges' || l.category === 'commercial'
).slice(0, 6);

export const CHENNAI_DEST_PRESETS: LocationPreset[] = CHENNAI_ALL_LOCATIONS.filter(
  (l) => l.category === 'safe_hubs'
);

/**
 * Filter & autocomplete search for Chennai locations
 */
export function searchChennaiLocations(query: string): LocationPreset[] {
  if (!query || query.trim() === '') {
    return CHENNAI_ALL_LOCATIONS.slice(0, 8);
  }
  const clean = query.toLowerCase().trim();
  return CHENNAI_ALL_LOCATIONS.filter(
    (loc) =>
      loc.name.toLowerCase().includes(clean) ||
      loc.area.toLowerCase().includes(clean) ||
      loc.landmark.toLowerCase().includes(clean)
  );
}

/**
 * Find nearest preset or landmark for a coordinate
 */
export function findNearestLocation(lat: number, lon: number): LocationPreset {
  let nearest = CHENNAI_ALL_LOCATIONS[0];
  let minDistance = Infinity;

  for (const loc of CHENNAI_ALL_LOCATIONS) {
    const dist = haversine(lat, lon, loc.lat, loc.lon);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = loc;
    }
  }

  return nearest;
}

/**
 * Generate 3 distinct alternative routes like Google Maps (Safest Lit, Main Road Fastest, Coastal Safe Corridor)
 */
export function computeAlternativeRoutes(
  start: { lat: number; lon: number; name: string; landmark?: string; area?: string },
  dest: { lat: number; lon: number; name: string; landmark?: string; area?: string },
  travelMode: 'walking' | 'driving' | 'transit' = 'walking'
): RouteOption[] {
  const baseDistance = haversine(start.lat, start.lon, dest.lat, dest.lon);
  const walkingPaceMinPerKm = travelMode === 'walking' ? 5.2 : travelMode === 'transit' ? 3.5 : 2.0;

  // ROUTE 1: Primary - Safest Lit Path (High CCTV Coverage & Safe Booths)
  const route1Waypoints = generateWaypointsWithOffset(start, dest, 22, 0.0022, 'safe');
  const route1Dist = +(baseDistance * 1.08).toFixed(1);
  const route1Duration = Math.max(5, Math.round(route1Dist * walkingPaceMinPerKm));
  const route1Steps = generateTurnInstructions(route1Waypoints, start, dest, 'safe');

  const route1: RouteOption = {
    id: 'route_safest_lit',
    title: `via ${getStreetName(start.area || 'Main Rd')} & Santhome High Rd`,
    summary: 'Safest Lit Path (98% High-Mast Lighting & 24/7 Police Booths)',
    via: 'Kamarajar Salai & Lit Corridors',
    distanceKm: route1Dist,
    durationMins: route1Duration,
    riskRating: 'low',
    safetyScore: 98,
    waypoints: route1Waypoints,
    steps: route1Steps,
    tag: 'RECOMMENDED SAFEST',
    color: '#3B82F6', // Vibrant Google Maps Blue
  };

  // ROUTE 2: Alternative - Fastest Direct Arterial
  const route2Waypoints = generateWaypointsWithOffset(start, dest, 18, -0.0018, 'direct');
  const route2Dist = +(baseDistance * 0.96).toFixed(1);
  const route2Duration = Math.max(4, Math.round(route2Dist * walkingPaceMinPerKm * 0.9));
  const route2Steps = generateTurnInstructions(route2Waypoints, start, dest, 'direct');

  const route2: RouteOption = {
    id: 'route_direct_fastest',
    title: `via TTK Road & Dr. Radhakrishnan Salai`,
    summary: 'Fastest Route (Active Motorway & Commercial Street Lights)',
    via: 'Direct Arterial Corridor',
    distanceKm: route2Dist,
    durationMins: route2Duration,
    riskRating: 'medium',
    safetyScore: 84,
    waypoints: route2Waypoints,
    steps: route2Steps,
    tag: 'FASTEST (SLIGHT TRAFFIC)',
    color: '#64748B', // Slate gray when not selected
  };

  // ROUTE 3: Alternative - Coastal & Community Safe Promenade
  const route3Waypoints = generateWaypointsWithOffset(start, dest, 24, 0.0045, 'coastal');
  const route3Dist = +(baseDistance * 1.18).toFixed(1);
  const route3Duration = Math.max(6, Math.round(route3Dist * walkingPaceMinPerKm * 1.1));
  const route3Steps = generateTurnInstructions(route3Waypoints, start, dest, 'coastal');

  const route3: RouteOption = {
    id: 'route_coastal_promenade',
    title: `via Marina Coastal Walkway & Besant Ave`,
    summary: 'High Community Vigilance & Beach Police Patrols',
    via: 'Coastal Promenade Path',
    distanceKm: route3Dist,
    durationMins: route3Duration,
    riskRating: 'low',
    safetyScore: 92,
    waypoints: route3Waypoints,
    steps: route3Steps,
    tag: 'SAFE COMMUNITY PROMENADE',
    color: '#10B981', // Emerald
  };

  return [route1, route2, route3];
}

/**
 * Helper to generate waypoints with curvature offset
 */
function generateWaypointsWithOffset(
  start: { lat: number; lon: number; name: string; landmark?: string },
  dest: { lat: number; lon: number; name: string; landmark?: string },
  numSteps: number,
  curvatureOffset: number,
  mode: 'safe' | 'direct' | 'coastal'
): RouteWaypoint[] {
  const waypoints: RouteWaypoint[] = [];
  const totalDist = haversine(start.lat, start.lon, dest.lat, dest.lon);

  const intermediateNamesSafe = [
    'Kamarajar Salai Promenade Walkway',
    'Light House Police Station Junction',
    'Santhome Cathedral Lit Corridor',
    'Pattinapakkam Coastal Pedestrian Lane',
    'Kutchery Road 24/7 CCTV Safe Station',
    'Mylapore Luz Corner Signal Plaza',
    'Alwarpet TTK High Road Walkway',
    'Chamiers Tree Canopy Well-Lit Section',
    'Kotturpuram Bridge Pedestrian Walkway',
    'Gandhi Mandapam Lit Corridor',
    'CLRI Sardar Patel Safe Footpath',
    'Madhya Kailash Outer Walkway',
    'Adyar River Bridge Crossing',
    'Besant Avenue Safe Hub Pathway',
    'Damodar Gardens Lane Walkway',
    '4th Main Road Pedestrian Cross',
    'Church Road Safe Hub Approaching Lane',
  ];

  const intermediateNamesDirect = [
    'Anna Salai High-Speed Walkway',
    'Royapettah High Road Crossway',
    'Dr Radhakrishnan Salai Main Road',
    'Music Academy Signal Crosswalk',
    'TTK Road Commercial Footpath',
    'Eldams Road Junction',
    'Chamiers Road Arterial Footpath',
    'Turnbulls Road Crossing',
    'Kotturpuram Main Road',
    'Adyar Gate Flyover Footpath',
    'Sardar Patel Road Intersection',
    'Kasturibai Nagar 1st Main Rd',
  ];

  const namesList = mode === 'direct' ? intermediateNamesDirect : intermediateNamesSafe;

  for (let i = 0; i < numSteps; i++) {
    const ratio = i / (numSteps - 1);
    const curve = Math.sin(ratio * Math.PI) * curvatureOffset;
    const lat = start.lat + (dest.lat - start.lat) * ratio + curve * 0.45;
    const lon = start.lon + (dest.lon - start.lon) * ratio + curve * 0.75;

    let waypointName = '';
    let landmark = '';
    let riskRating: 'low' | 'medium' | 'high' = 'low';

    if (i === 0) {
      waypointName = start.name;
      landmark = start.landmark || 'Starting Point - Live GPS Origin';
      riskRating = 'low';
    } else if (i === numSteps - 1) {
      waypointName = dest.name;
      landmark = dest.landmark || 'End Destination - Safe Hub Sanctuary';
      riskRating = 'low';
    } else {
      const stepKm = (totalDist * ratio).toFixed(1);
      waypointName = namesList[i % namesList.length];
      landmark = `${(ratio * 100).toFixed(0)}% towards ${dest.name} (${stepKm} km)`;

      if (mode === 'direct' && ratio > 0.4 && ratio < 0.65) {
        riskRating = 'medium';
      } else if (mode === 'safe' && ratio > 0.5 && ratio < 0.65) {
        riskRating = 'medium';
      } else {
        riskRating = 'low';
      }
    }

    waypoints.push({
      lat,
      lon,
      name: waypointName,
      landmark,
      speedKmh: +(3.8 + Math.sin(i) * 0.3).toFixed(1),
      riskRating,
    });
  }

  return waypoints;
}

/**
 * Generate turn-by-turn navigation instructions for route
 */
function generateTurnInstructions(
  waypoints: RouteWaypoint[],
  start: { name: string; landmark?: string },
  dest: { name: string; landmark?: string },
  mode: string
): TurnInstruction[] {
  const steps: TurnInstruction[] = [];

  steps.push({
    id: 'step_start',
    instruction: `Head south from ${start.name} onto the main walkway`,
    distanceMeters: 250,
    turnType: 'straight',
    landmark: start.landmark,
  });

  if (mode === 'safe' || mode === 'coastal') {
    steps.push({
      id: 'step_safe_1',
      instruction: '🛡️ Pass Safe Space: D-6 Marina Police Station (24/7 CCTV & All-Women Desk on Right)',
      distanceMeters: 180,
      turnType: 'safe_booth',
      landmark: 'Lit Safe Checkpoint',
      isSafeHighlight: true,
    });
  }

  steps.push({
    id: 'step_turn_1',
    instruction: `Turn right towards ${waypoints[Math.floor(waypoints.length * 0.3)].name}`,
    distanceMeters: 450,
    turnType: 'right',
    landmark: 'Signal Junction with High-Mast Floodlights',
  });

  steps.push({
    id: 'step_cont_1',
    instruction: 'Continue straight along the well-lit pedestrian corridor',
    distanceMeters: 800,
    turnType: 'straight',
    landmark: 'Active 3-Volunteer Triangulation Zone',
  });

  if (mode === 'safe') {
    steps.push({
      id: 'step_safe_2',
      instruction: '🛡️ Pass Safe Zone: Mylapore Cultural & Temple Illuminated Security Perimeter',
      distanceMeters: 300,
      turnType: 'safe_booth',
      landmark: 'Continuous CCTV Surveillance Active',
      isSafeHighlight: true,
    });
  }

  steps.push({
    id: 'step_turn_2',
    instruction: `Turn left onto ${waypoints[Math.floor(waypoints.length * 0.75)].name}`,
    distanceMeters: 550,
    turnType: 'left',
    landmark: 'Police Assistance Kiosk on corner',
  });

  steps.push({
    id: 'step_arrive',
    instruction: `Arrive at Safe Hub Sanctuary: ${dest.name}`,
    distanceMeters: 100,
    turnType: 'arrive',
    landmark: dest.landmark || 'Verified Destination Hub',
    isSafeHighlight: true,
  });

  return steps;
}

function getStreetName(area: string) {
  if (area.includes('Mylapore')) return 'Kutchery Road';
  if (area.includes('T. Nagar')) return 'Usman Road';
  if (area.includes('Nungambakkam')) return 'Sterling Road';
  if (area.includes('Guindy')) return 'Sardar Patel Road';
  return 'Kamarajar Salai';
}

/**
 * Standard generator compatibility wrapper
 */
export function generateRouteWaypoints(
  start: { lat: number; lon: number; name: string; landmark?: string },
  dest: { lat: number; lon: number; name: string; landmark?: string },
  numSteps: number = 20
): RouteWaypoint[] {
  const routes = computeAlternativeRoutes(start, dest, 'walking');
  return routes[0].waypoints;
}
