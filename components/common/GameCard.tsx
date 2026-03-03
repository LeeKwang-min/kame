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
  Swords,
  Crosshair,
  Brain,
  Grid2X2,
  Keyboard,
  Paintbrush,
  Lightbulb,
  PanelTop,
  TableProperties,
  Link2,
  Compass,
  Shield,
  Grip,
  Gem,
  Plane,
  ArrowDownToLine,
  LayoutGrid as BlockGrid,
  Crown,
  Waves,
  Spade,
  Cherry,
  CupSoda,
  Hexagon,
  Car,
  Pencil,
} from 'lucide-react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { useLocale } from '@/provider/LocaleProvider';

export const GAME_ICONS: Record<string, LucideIcon> = {
  '/tetrix': Grid3X3,
  '/snake': Bug,
  '/kero33': Sparkles,
  '/pacmaze': Cookie,
  '/2048': Gamepad2,
  '/burger': Ham,
  '/endlessstairs': Footprints,
  '/dodge': Target,
  '/flappywings': Bird,
  '/brickout': LayoutGrid,
  '/asteroid': Rocket,
  '/paddlerally': Circle,
  '/dino': Footprints,
  '/doodlehop': ArrowUpDown,
  '/spaceraiders': Ghost,
  '/missileguard': Bomb,
  '/platformer': Zap,
  '/enhance': TrendingUp,
  '/slot': Dice6,
  '/highlow': ArrowUpDown,
  '/roulette': CircleDot,
  '/rps': Hand,
  '/roadcross': TreePine,
  '/towerblocks': Layers,
  '/fruitslash': Sword,
  '/aimtrainer': Crosshair,
  '/colormemory': Brain,
  '/matchpairs': Grid2X2,
  '/bubbleshooter': CircleDot,
  '/typingfall': Keyboard,
  '/colorflood': Paintbrush,
  '/lightsout': Lightbulb,
  '/slidingpuzzle': PanelTop,
  '/nonogram': TableProperties,
  '/numberchain': Link2,
  '/minesweeper': Bomb,
  '/maze': Compass,
  '/randomdefense': Shield,
  '/jellypop': Grip,
  '/jewelcrush': Gem,
  '/kustom': Swords,
  '/survivors': Shield,
  '/helicopter': Plane,
  '/dropwell': ArrowDownToLine,
  '/blockpuzzle': BlockGrid,
  '/queens': Crown,
  '/ripple': Waves,
  '/solitaire': Spade,
  '/suikagame': Cherry,
  '/tapempire': Crown,
  '/cookiebakery': Cookie,
  '/lemonadestand': CupSoda,
  '/dungeonmerchant': Sword,
  '/stocktrader': TrendingUp,
  '/spacecolony': Rocket,
  '/hexaspin': Hexagon,
  '/kracing': Car,
  '/kracing2': Car,
  '/ladder': Sparkles,
  '/wheel': CircleDot,
  '/whiteboard': Pencil,
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
    <Link href={menu.href} target={menu.target ?? '_self'} aria-label={gameName}>
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
          aria-hidden="true"
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
