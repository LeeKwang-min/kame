import {
  TRACK_SEGMENTS,
  TRACK_WIDTH,
  WALL_PUSH_DISTANCE,
} from './config';
import { TTrackPoint } from './types';

/**
 * Waypoints defining the technical circuit shape.
 * The circuit is a closed loop traced clockwise in screen coordinates (y-down).
 *
 * Course layout:
 *   1. Start/finish straight (bottom)
 *   2. Medium-speed right turn (90°)
 *   3. S-curve (left-right transitions)
 *   4. Long back straight (top speed zone)
 *   5. Tight hairpin (hard braking + drift zone)
 *   6. Short acceleration zone
 *   7. Chicane (left-right-left quick transitions)
 *   8. Gentle left turn back to start
 */
const WAYPOINTS: TTrackPoint[] = [
  { x: 400, y: 410 },  // Start/finish (bottom center)
  { x: 560, y: 400 },  // Right approach
  { x: 650, y: 340 },  // Right turn entry
  { x: 660, y: 260 },  // Right turn apex
  { x: 620, y: 190 },  // S-curve entry
  { x: 530, y: 210 },  // S-curve mid-left
  { x: 470, y: 160 },  // S-curve mid-right
  { x: 380, y: 130 },  // S-curve exit
  { x: 240, y: 110 },  // Back straight end
  { x: 150, y: 140 },  // Hairpin entry
  { x: 120, y: 210 },  // Hairpin apex
  { x: 150, y: 280 },  // Hairpin exit
  { x: 220, y: 320 },  // Chicane entry
  { x: 180, y: 370 },  // Chicane mid
  { x: 250, y: 410 },  // Chicane exit
];

/**
 * Catmull-Rom spline interpolation between four control points.
 * Uses the standard centripetal parameterization with alpha=0 (uniform).
 *
 * @param p0 - control point before segment
 * @param p1 - segment start
 * @param p2 - segment end
 * @param p3 - control point after segment
 * @param t  - interpolation parameter [0, 1]
 */
function catmullRom(
  p0: TTrackPoint,
  p1: TTrackPoint,
  p2: TTrackPoint,
  p3: TTrackPoint,
  t: number,
): TTrackPoint {
  const t2 = t * t;
  const t3 = t2 * t;

  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

  return { x, y };
}

/**
 * Generate the track centerline using Catmull-Rom spline interpolation
 * over the waypoints. The spline forms a closed loop.
 */
export function generateTrackCenterline(): TTrackPoint[] {
  const points: TTrackPoint[] = [];
  const n = WAYPOINTS.length;
  const segmentsPerWaypoint = Math.ceil(TRACK_SEGMENTS / n);
  const totalPoints = segmentsPerWaypoint * n;

  for (let i = 0; i < n; i++) {
    const p0 = WAYPOINTS[(i - 1 + n) % n];
    const p1 = WAYPOINTS[i];
    const p2 = WAYPOINTS[(i + 1) % n];
    const p3 = WAYPOINTS[(i + 2) % n];

    for (let j = 0; j < segmentsPerWaypoint; j++) {
      const t = j / segmentsPerWaypoint;
      points.push(catmullRom(p0, p1, p2, p3, t));
    }
  }

  // Trim or pad to exactly TRACK_SEGMENTS
  while (points.length > TRACK_SEGMENTS) points.pop();
  while (points.length < TRACK_SEGMENTS) {
    // Duplicate last point (shouldn't happen with typical values)
    points.push(points[points.length - 1]);
  }

  // Re-parameterize by arc length for even spacing
  return reparameterize(points, totalPoints);
}

/**
 * Re-parameterize points by arc length so segments have roughly equal spacing.
 * This prevents bunching in tight curves and stretching on straights.
 */
function reparameterize(
  rawPoints: TTrackPoint[],
  _targetCount: number,
): TTrackPoint[] {
  // Compute cumulative arc lengths
  const n = rawPoints.length;
  const cumLen: number[] = [0];

  for (let i = 1; i < n; i++) {
    const dx = rawPoints[i].x - rawPoints[i - 1].x;
    const dy = rawPoints[i].y - rawPoints[i - 1].y;
    cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }

  // Also include the closing segment length
  const dx = rawPoints[0].x - rawPoints[n - 1].x;
  const dy = rawPoints[0].y - rawPoints[n - 1].y;
  const totalLength = cumLen[n - 1] + Math.sqrt(dx * dx + dy * dy);

  // Sample TRACK_SEGMENTS evenly-spaced points along the total arc
  const result: TTrackPoint[] = [];
  const step = totalLength / TRACK_SEGMENTS;

  for (let i = 0; i < TRACK_SEGMENTS; i++) {
    const targetDist = i * step;

    // Find the segment in rawPoints where this distance falls
    let segIdx = 0;
    while (segIdx < n - 1 && cumLen[segIdx + 1] < targetDist) {
      segIdx++;
    }

    if (segIdx >= n - 1) {
      // In the closing segment (last point → first point)
      const segStart = cumLen[n - 1];
      const closeDx = rawPoints[0].x - rawPoints[n - 1].x;
      const closeDy = rawPoints[0].y - rawPoints[n - 1].y;
      const segLen = Math.sqrt(closeDx * closeDx + closeDy * closeDy);
      const t = segLen > 0 ? (targetDist - segStart) / segLen : 0;
      result.push({
        x: rawPoints[n - 1].x + closeDx * t,
        y: rawPoints[n - 1].y + closeDy * t,
      });
    } else {
      const segStart = cumLen[segIdx];
      const segEnd = cumLen[segIdx + 1];
      const segLen = segEnd - segStart;
      const t = segLen > 0 ? (targetDist - segStart) / segLen : 0;
      result.push({
        x: rawPoints[segIdx].x + (rawPoints[segIdx + 1].x - rawPoints[segIdx].x) * t,
        y: rawPoints[segIdx].y + (rawPoints[segIdx + 1].y - rawPoints[segIdx].y) * t,
      });
    }
  }

  return result;
}

/**
 * Find the index of the closest centerline point to a given position.
 * Uses squared distance to avoid expensive sqrt calls.
 */
export function findClosestSegment(
  x: number,
  y: number,
  centerline: TTrackPoint[],
): number {
  let minDistSq = Infinity;
  let closestIdx = 0;

  for (let i = 0; i < centerline.length; i++) {
    const dx = x - centerline[i].x;
    const dy = y - centerline[i].y;
    const distSq = dx * dx + dy * dy;

    if (distSq < minDistSq) {
      minDistSq = distSq;
      closestIdx = i;
    }
  }

  return closestIdx;
}

/**
 * Calculate the actual distance from a point to a specific centerline point.
 */
export function distanceToCenter(
  x: number,
  y: number,
  centerline: TTrackPoint[],
  segmentIdx: number,
): number {
  const dx = x - centerline[segmentIdx].x;
  const dy = y - centerline[segmentIdx].y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a position is outside the track bounds.
 * If it is, push it back inside and flag as collided.
 */
export function checkWallCollision(
  x: number,
  y: number,
  centerline: TTrackPoint[],
): { x: number; y: number; collided: boolean } {
  const segIdx = findClosestSegment(x, y, centerline);
  const dist = distanceToCenter(x, y, centerline, segIdx);
  const halfWidth = TRACK_WIDTH / 2;

  if (dist > halfWidth) {
    const center = centerline[segIdx];
    const dx = x - center.x;
    const dy = y - center.y;
    const pushDist = halfWidth - WALL_PUSH_DISTANCE;
    const scale = pushDist / dist;

    return {
      x: center.x + dx * scale,
      y: center.y + dy * scale,
      collided: true,
    };
  }

  return { x, y, collided: false };
}

/**
 * Detect if the car crossed the start/finish line (segment 0).
 * Only counts CLOCKWISE crossing.
 */
export function checkLapCross(
  prevSegIdx: number,
  currSegIdx: number,
  totalSegments: number,
): boolean {
  const threshold = totalSegments / 4;
  return prevSegIdx > totalSegments - threshold && currSegIdx < threshold;
}

/**
 * Generate inner and outer wall points for rendering.
 */
export function generateTrackWalls(centerline: TTrackPoint[]): {
  outer: TTrackPoint[];
  inner: TTrackPoint[];
} {
  const outer: TTrackPoint[] = [];
  const inner: TTrackPoint[] = [];
  const halfWidth = TRACK_WIDTH / 2;
  const len = centerline.length;

  for (let i = 0; i < len; i++) {
    const curr = centerline[i];
    const next = centerline[(i + 1) % len];

    const tx = next.x - curr.x;
    const ty = next.y - curr.y;
    const tLen = Math.sqrt(tx * tx + ty * ty);

    const nx = -ty / tLen;
    const ny = tx / tLen;

    outer.push({
      x: curr.x + nx * halfWidth,
      y: curr.y + ny * halfWidth,
    });

    inner.push({
      x: curr.x - nx * halfWidth,
      y: curr.y - ny * halfWidth,
    });
  }

  return { outer, inner };
}

/**
 * Get the position and direction angle at the start of the track.
 */
export function getStartLinePosition(centerline: TTrackPoint[]): {
  x: number;
  y: number;
  angle: number;
} {
  const start = centerline[0];
  const next = centerline[1];
  const angle = Math.atan2(next.y - start.y, next.x - start.x);

  return {
    x: start.x,
    y: start.y,
    angle,
  };
}
