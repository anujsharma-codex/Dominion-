import { Guardian } from '../types';
import { haversine } from '../utils/distance';

export interface MatchResult {
  guardian: Guardian;
  distanceKm: number;
  distanceScore: number;
  ratingScore: number;
  readinessScore: number;
  experienceScore: number;
  finalScore: number;
}

export class MatchingEngine {
  private guardians: Guardian[];

  constructor(guardians: Guardian[]) {
    this.guardians = guardians;
  }

  /**
   * Finds the best N guardians using multi-factor weighted scoring:
   * - Distance (40% weight): Closer is better (inverse normalized)
   * - Rating (30% weight): 0 to 5 normalized
   * - Readiness score (20% weight): 0 to 100 normalized
   * - Experience (10% weight): Number of sessions compared to maximum
   */
  public findBestGuardians(
    userLat: number,
    userLon: number,
    count: number = 3,
    minRating: number = 3.5,
    minReadiness: number = 60
  ): MatchResult[] {
    // 1. Filter available and verified guardians
    const candidates = this.guardians.filter(
      (g) =>
        g.isAvailable &&
        g.verified &&
        g.rating >= minRating &&
        g.readinessScore >= minReadiness
    );

    if (candidates.length === 0) {
      return [];
    }

    // 2. Compute distances using Haversine formula
    const candidatesWithDistance = candidates.map((g) => {
      const dist = haversine(userLat, userLon, g.lat, g.lon);
      return {
        guardian: g,
        distanceKm: dist,
      };
    });

    // 3. Normalization parameters
    const maxDist = Math.max(
      ...candidatesWithDistance.map((c) => c.distanceKm),
      1.0
    );
    const maxSessions = Math.max(
      ...candidatesWithDistance.map((c) => c.guardian.totalSessions),
      1
    );

    // 4. Calculate individual factor scores and weighted sum
    const scoredCandidates: MatchResult[] = candidatesWithDistance.map(
      ({ guardian, distanceKm }) => {
        // Distance score: 1.0 (right next to user) to 0.0 (farthest in candidate pool)
        const distanceScore = Math.max(0, 1 - distanceKm / maxDist);

        // Rating score: 0.0 to 1.0
        const ratingScore = Math.min(1, guardian.rating / 5.0);

        // Readiness score: 0.0 to 1.0
        const readinessScore = Math.min(1, guardian.readinessScore / 100);

        // Experience score: 0.0 to 1.0
        const experienceScore = Math.min(
          1,
          guardian.totalSessions / maxSessions
        );

        // Weights: 40% Distance, 30% Rating, 20% Readiness, 10% Experience
        const finalScore =
          distanceScore * 0.4 +
          ratingScore * 0.3 +
          readinessScore * 0.2 +
          experienceScore * 0.1;

        return {
          guardian: {
            ...guardian,
            distanceKm,
            scoreBreakdown: {
              distanceScore: Math.round(distanceScore * 100),
              ratingScore: Math.round(ratingScore * 100),
              readinessScore: Math.round(readinessScore * 100),
              expScore: Math.round(experienceScore * 100),
              finalScore: Math.round(finalScore * 100),
            },
          },
          distanceKm,
          distanceScore,
          ratingScore,
          readinessScore,
          experienceScore,
          finalScore,
        };
      }
    );

    // 5. Sort descending by finalScore
    scoredCandidates.sort((a, b) => b.finalScore - a.finalScore);

    return scoredCandidates.slice(0, count);
  }

  public getAvailableCount(): number {
    return this.guardians.filter((g) => g.isAvailable).length;
  }
}
