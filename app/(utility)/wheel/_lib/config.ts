import { ItemPresetType, WheelItem } from './types';

export const MIN_ITEMS = 2;
export const MAX_ITEMS = 12;

export const ITEM_PRESETS: { type: ItemPresetType; label: string }[] = [
  { type: 'custom', label: '직접 입력' },
  { type: 'winlose', label: '당첨 / 꽝' },
  { type: 'yesno', label: '예 / 아니오' },
  { type: 'number', label: '1, 2, 3...' },
  { type: 'alphabet', label: 'A, B, C...' },
];

export const WHEEL_COLORS = [
  '#FF6B6B', // 빨강
  '#4ECDC4', // 청록
  '#FFE66D', // 노랑
  '#95E1D3', // 민트
  '#F38181', // 코랄
  '#AA96DA', // 보라
  '#FCBAD3', // 핑크
  '#A8D8EA', // 하늘
  '#F8B500', // 금색
  '#00B894', // 에메랄드
  '#6C5CE7', // 인디고
  '#FD79A8', // 핫핑크
];

export const generateItems = (
  count: number,
  preset: ItemPresetType
): WheelItem[] => {
  let labels: string[];

  switch (preset) {
    case 'winlose': {
      labels = Array(count).fill('꽝');
      labels[0] = '당첨';
      break;
    }
    case 'yesno': {
      labels = count === 2 ? ['예', '아니오'] : Array.from({ length: count }, (_, i) =>
        i % 2 === 0 ? '예' : '아니오'
      );
      break;
    }
    case 'number':
      labels = Array.from({ length: count }, (_, i) => String(i + 1));
      break;
    case 'alphabet':
      labels = Array.from({ length: count }, (_, i) =>
        String.fromCharCode(65 + i)
      );
      break;
    default:
      labels = Array.from({ length: count }, (_, i) => `항목 ${i + 1}`);
  }

  return labels.map((label, i) => ({
    label,
    color: WHEEL_COLORS[i % WHEEL_COLORS.length],
  }));
};
