import {
  TRACK_CENTER_X,
  TRACK_CENTER_Y,
  TRACK_RADIUS_X,
  TRACK_RADIUS_Y,
  TRACK_SEGMENTS,
  TRACK_WIDTH,
  WALL_PUSH_DISTANCE,
} from './config';
import { TTrackPoint } from './types';

/**
 * Generate the track centerline as an array of waypoints.
 *
 * The ellipse is centered at (TRACK_CENTER_X, TRACK_CENTER_Y) with
 * radii TRACK_RADIUS_X and TRACK_RADIUS_Y.
 *
 * Direction is CLOCKWISE in screen coordinates (y-down), starting
 * from the bottom center of the ellipse.
 *
 * Math:
 *   angle = pi/2 - t   where t goes 0 -> 2*pi
 *   At t=0: angle=pi/2 -> (cos(pi/2), sin(pi/2)) = (0, 1) -> bottom center
 *   As t increases slightly: angle < pi/2 -> cos > 0 -> moves right
 *   So the path goes bottom -> right -> top -> left -> bottom (clockwise).
 */
export function generateTrackCenterline(): TTrackPoint[] {
  const points: TTrackPoint[] = [];

  for (let i = 0; i < TRACK_SEGMENTS; i++) {
    const t = (i / TRACK_SEGMENTS) * Math.PI * 2;
    const angle = Math.PI / 2 - t;

    points.push({
      x: TRACK_CENTER_X + TRACK_RADIUS_X * Math.cos(angle),
      y: TRACK_CENTER_Y + TRACK_RADIUS_Y * Math.sin(angle),
    });
  }

  return points;
}

/**
 * Find the index of the closest centerline point to a given position.
 * Uses squared distance to avoid expensive sqrt calls.
 */
export function findClosestSegment(
  x: number,
  y: number,
  centerline: TTrackPoint[]
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
  segmentIdx: number
): number {
  const dx = x - centerline[segmentIdx].x;
  const dy = y - centerline[segmentIdx].y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a position is outside the track bounds.
 * If it is, push it back inside and flag as collided.
 *
 * The track boundary is TRACK_WIDTH/2 from the centerline.
 * When a collision occurs, the position is pushed to
 * (TRACK_WIDTH/2 - WALL_PUSH_DISTANCE) from the centerline.
 */
export function checkWallCollision(
  x: number,
  y: number,
  centerline: TTrackPoint[]
): { x: number; y: number; collided: boolean } {
  const segIdx = findClosestSegment(x, y, centerline);
  const dist = distanceToCenter(x, y, centerline, segIdx);
  const halfWidth = TRACK_WIDTH / 2;

  if (dist > halfWidth) {
    // Push back inside the track
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
 *
 * Only counts CLOCKWISE crossing:
 *   prevSegIdx near the end of the array -> currSegIdx near the start.
 *
 * A threshold of totalSegments/4 prevents false positives from small
 * movements or jitter near the start line.
 */
export function checkLapCross(
  prevSegIdx: number,
  currSegIdx: number,
  totalSegments: number
): boolean {
  const threshold = totalSegments / 4;

  // Clockwise: segment index wraps from high (near end) to low (near start)
  return prevSegIdx > totalSegments - threshold && currSegIdx < threshold;
}

/**
 * Generate inner and outer wall points for rendering.
 *
 * For each centerline point, compute the perpendicular normal
 * (pointing outward from center) and offset by TRACK_WIDTH/2.
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

    // Tangent direction along the track
    const tx = next.x - curr.x;
    const ty = next.y - curr.y;
    const tLen = Math.sqrt(tx * tx + ty * ty);

    // Perpendicular normal pointing outward from ellipse center.
    // For a clockwise path, the left-hand perpendicular (-ty, tx)
    // points outward (away from center).
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
 *
 * The position is the first centerline point (bottom center).
 * The angle points from centerline[0] toward centerline[1],
 * i.e. the initial direction of travel (clockwise).
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
