export interface Guardian {
  id: string;
  name: string;
  lat: number;
  lon: number;
  rating: number;
  verified: boolean;
  isAvailable: boolean;
  readinessScore: number; // 0-100
  totalSessions: number;
  successfulSessions: number;
  distanceKm?: number;
  maskedPhone?: string;
  scoreBreakdown?: {
    distanceScore: number;
    ratingScore: number;
    readinessScore: number;
    expScore: number;
    finalScore: number;
  };
}

export interface User {
  id: string;
  name: string;
  lat: number;
  lon: number;
  phone: string;
  safetyRating: number;
  batteryLevel: number;
  signalStrength: number; // 1-5
}

export interface SafeZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radiusMeters: number;
  description: string;
}

export interface SafeSpace {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: 'police' | 'hospital' | 'metro' | 'women_booth';
  phone: string;
  address: string;
}

export interface RouteWaypoint {
  lat: number;
  lon: number;
  name: string;
  landmark: string;
  speedKmh: number;
  riskRating: 'low' | 'medium' | 'high';
}

export interface TurnInstruction {
  id: string;
  instruction: string;
  distanceMeters: number;
  turnType: 'straight' | 'left' | 'right' | 'arrive' | 'safe_booth';
  landmark?: string;
  isSafeHighlight?: boolean;
}

export interface RouteOption {
  id: string;
  title: string;
  summary: string;
  via: string;
  distanceKm: number;
  durationMins: number;
  riskRating: 'low' | 'medium' | 'high';
  safetyScore: number; // e.g. 98%
  waypoints: RouteWaypoint[];
  steps: TurnInstruction[];
  tag?: string; // e.g. "RECOMMENDED SAFEST", "FASTEST", "COASTAL CORRIDOR"
  color: string;
}

export interface LocationPreset {
  id: string;
  name: string;
  area: string;
  landmark: string;
  lat: number;
  lon: number;
  category?: 'colleges' | 'transit' | 'safe_hubs' | 'beaches' | 'commercial' | 'hospitals';
}

export interface IncidentReport {
  id: string;
  timestamp: string;
  reason: string;
  action: 'reassign_guardian' | 'police_alert' | 'log_only';
  status: 'resolved' | 'dispatched';
}

export interface SafetySession {
  sessionId: string;
  userId: string;
  user: User;
  guardians: Guardian[];
  status: 'waiting' | 'active' | 'completed' | 'escalated';
  startTime: string;
  endTime?: string;
  currentWaypointIndex: number;
  currentLocation: { lat: number; lon: number };
  destination: { lat: number; lon: number; name: string };
  audioRecording: boolean;
  videoStreaming: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  distanceTraveledKm: number;
  userNotes?: string;
  emergencyTriggered: boolean;
  guardianPerimeterOffsets: { latOffset: number; lonOffset: number }[];
  incidentReports?: IncidentReport[];
}

export interface GuardianDistanceLive {
  guardianId: string;
  guardianName: string;
  distanceMeters: number;
  status: 'in_perimeter' | 'warning' | 'out_of_range';
}

export interface IntegrityCheckStatus {
  lastCheckedTimestamp: string;
  secondsSinceLastCheck: number;
  guardiansInSafeRange: number; // e.g. 3
  totalGuardians: number; // 3
  deviceIntegrityPassed: boolean;
  antiSpoofingPassed: boolean;
  velocitiesNormal: boolean;
  overallStatus: 'VERIFIED' | 'WARNING' | 'ALERT';
  detailedLogs: string[];
  distances: GuardianDistanceLive[];
}

export interface FraudAlert {
  id: string;
  type: 'DEVICE_MATCH' | 'UNNATURAL_SPEED' | 'PERFECT_RATING' | 'STAGNANT_SESSION' | 'TELEPORTATION';
  severity: 'high' | 'medium' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  affectedGuardianId?: string;
  affectedUserId?: string;
}

