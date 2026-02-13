export type TGameAssets = {
  playerWalk: HTMLImageElement;
  bossWalk: HTMLImageElement;
  shuriken: HTMLImageElement;
  grass: HTMLImageElement;
};

let loadedAssets: TGameAssets | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function loadAssets(): Promise<TGameAssets> {
  const [playerWalk, bossWalk, shuriken, grass] = await Promise.all([
    loadImage('/kustom/_assets/player_walk.png'),
    loadImage('/kustom/_assets/boss_walk.png'),
    loadImage('/kustom/_assets/Shuriken.png'),
    loadImage('/kustom/_assets/grass.png'),
  ]);
  loadedAssets = { playerWalk, bossWalk, shuriken, grass };
  return loadedAssets;
}

export function getAssets(): TGameAssets | null {
  return loadedAssets;
}
