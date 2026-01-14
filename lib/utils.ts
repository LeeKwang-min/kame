import { Point } from "@/@types/canvas";
import { TMenuList } from "@/@types/menus";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const makeCategoryMenuList = (menuList: TMenuList) => {
  return menuList.reduce((acc, menu) => {
    acc[menu.category] = [...(acc[menu.category] || []), menu];
    return acc;
  }, {} as Record<string, TMenuList>);
};

export const getCanvasPos = (
  e: PointerEvent,
  canvas: HTMLCanvasElement
): Point => {
  const rect = canvas.getBoundingClientRect();

  const x = ((e.clientX - rect.left) / rect.width) * rect.width;
  const y = ((e.clientY - rect.top) / rect.height) * rect.height;
  return { x, y };
};

export const isClicked = (p: Point, dot: Point, r: number = 10) => {
  const dx = p.x - dot.x;
  const dy = p.y - dot.y;
  return dx * dx + dy * dy <= r * r;
};
