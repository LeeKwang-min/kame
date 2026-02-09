'use client';

import { TMenu } from '@/@types/menus';
import { cn } from '@/lib/utils';
import {
  Gamepad2,
  Bug,
  LayoutGrid,
  Rocket,
  Bird,
  Dice6,
  TrendingUp,
  Target,
  Footprints,
  ArrowUpDown,
  CircleDot,
  Hand,
  Circle,
  Bomb,
  Zap,
  Ghost,
  Grid3X3,
  Lock,
  Sparkles,
  Cookie,
  Ham,
  TreePine,
  Layers,
  Sword,
  Crosshair,
  Brain,
} from 'lucide-react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { useLocale } from '@/provider/LocaleProvider';

const GAME_ICONS: Record<string, LucideIcon> = {
  '/tetris': Grid3X3,
  '/snake': Bug,
  '/kero33': Sparkles,
  '/pacman': Cookie,
  '/2048': Gamepad2,
  '/burger': Ham,
  '/stairs': Footprints,
  '/dodge': Target,
  '/flappybird': Bird,
  '/breakout': LayoutGrid,
  '/asteroid': Rocket,
  '/pong': Circle,
  '/dino': Footprints,
  '/doodle': ArrowUpDown,
  '/spaceinvaders': Ghost,
  '/missilecommand': Bomb,
  '/platformer': Zap,
  '/enhance': TrendingUp,
  '/slot': Dice6,
  '/highlow': ArrowUpDown,
  '/roulette': CircleDot,
  '/rps': Hand,
  '/crossyroad': TreePine,
  '/towerblocks': Layers,
  '/fruitninja': Sword,
  '/aimtrainer': Crosshair,
  '/simon': Brain,
  '/ladder': Sparkles,
  '/wheel': CircleDot,
};

interface IProps {
  menu: TMenu;
}

function GameCard({ menu }: IProps) {
  const { locale } = useLocale();
  const Icon = GAME_ICONS[menu.href] || Gamepad2;
  const gameName = locale === 'ko' ? menu.name.kor : menu.name.eng;

  if (menu.disabled) {
    return (
      <div
        className={cn(
          'relative flex flex-col items-center justify-center',
          'aspect-square p-4 rounded-lg',
          'bg-arcade-surface border border-arcade-border',
          'cursor-not-allowed opacity-50',
          'transition-all duration-300',
        )}>
        <Lock className="absolute top-2 right-2 w-4 h-4 text-arcade-text/50" />
        <Icon className="w-12 h-12 text-arcade-text/30 mb-2" />
        <span className="text-sm font-bold text-arcade-text/50 text-center">
          {gameName}
        </span>
      </div>
    );
  }

  return (
    <Link href={menu.href} target={menu.target ?? '_self'}>
      <div
        className={cn(
          'group relative flex flex-col items-center justify-center',
          'aspect-square p-4 rounded-lg',
          'bg-arcade-surface border border-arcade-border',
          'cursor-pointer',
          'transition-all duration-300',
          'hover:scale-105',
          'hover:border-arcade-cyan',
          'hover:shadow-[0_0_20px_rgba(0,255,245,0.3)]',
        )}>
        <div
          className={cn(
            'absolute inset-0 rounded-lg opacity-0',
            'bg-gradient-to-br from-arcade-cyan/10 to-arcade-magenta/10',
            'group-hover:opacity-100 transition-opacity duration-300',
          )}
        />
        <Icon
          className={cn(
            'w-12 h-12 mb-2 relative z-10',
            'text-arcade-cyan/70',
            'group-hover:text-arcade-cyan',
            'transition-colors duration-300',
          )}
        />
        <span
          className={cn(
            'text-sm font-bold text-center relative z-10',
            'text-arcade-text/80',
            'group-hover:text-arcade-text',
            'transition-colors duration-300',
          )}>
          {gameName}
        </span>
      </div>
    </Link>
  );
}

export default GameCard;
