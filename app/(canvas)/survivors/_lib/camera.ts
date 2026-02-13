import { TCamera, TPlayer } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config';

export function createCamera(): TCamera {
  return { x: 0, y: 0 };
}

// Update camera to keep player centered on screen
export function updateCamera(camera: TCamera, player: TPlayer): void {
  camera.x = player.x - CANVAS_WIDTH / 2;
  camera.y = player.y - CANVAS_HEIGHT / 2;
}

// Convert world coordinates to screen coordinates
export function worldToScreen(
  worldX: number,
  worldY: number,
  camera: TCamera
): { x: number; y: number } {
  return {
    x: worldX - camera.x,
    y: worldY - camera.y,
  };
}

// Check if a world position is within the viewport (with margin for spawning/culling)
export function isInViewport(
  worldX: number,
  worldY: number,
  camera: TCamera,
  margin: number = 100
): boolean {
  const sx = worldX - camera.x;
  const sy = worldY - camera.y;
  return (
    sx > -margin &&
    sx < CANVAS_WIDTH + margin &&
    sy > -margin &&
    sy < CANVAS_HEIGHT + margin
  );
}
