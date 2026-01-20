
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

export const rand = (min: number, max: number) => {
  return min + Math.random() * (max - min);
}

export const clamp = (v: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, v));
};

export const circleRectHit = (cx: number, cy: number, cr: number, rx: number, ry: number, rw: number, rh: number) => {
  const px = clamp(cx, rx, rx + rw);
  const py = clamp(cy, ry, ry + rh);
  const dx = cx - px;
  const dy = cy - py;
  return dx * dx + dy * dy <= cr * cr;
};