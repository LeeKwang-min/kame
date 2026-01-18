
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
