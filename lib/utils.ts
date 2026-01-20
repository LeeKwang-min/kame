
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

export const circleCircleHit = (ax: number, ay: number, ar: number, bx: number, by: number, br: number) => {
  const dx = ax - bx;
  const dy = ay - by;
  const rr = ar + br;
  return dx * dx + dy * dy <= rr * rr;
};

export const rectRectHit = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) => {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
};

export const pointRectHit = (px: number, py: number, rx: number, ry: number, rw: number, rh: number) => {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
};

export const pointCircleHit = (px: number, py: number, cx: number, cy: number, cr: number) => {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= cr * cr;
};