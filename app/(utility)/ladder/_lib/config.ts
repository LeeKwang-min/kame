import { PresetType, ResultPresetType } from './types';

export const MIN_PARTICIPANTS = 2;
export const MAX_PARTICIPANTS = 8;

export const PARTICIPANT_PRESETS: { type: PresetType; label: string }[] = [
  { type: 'custom', label: '직접 입력' },
  { type: 'number', label: '1, 2, 3...' },
  { type: 'alphabet', label: 'A, B, C...' },
  { type: 'team', label: '팀1, 팀2...' },
];

export const RESULT_PRESETS: { type: ResultPresetType; label: string }[] = [
  { type: 'custom', label: '직접 입력' },
  { type: 'winlose', label: '당첨 / 꽝' },
  { type: 'rank', label: '1등, 2등...' },
];

export const LADDER_COLORS = [
  '#FF6B6B', // 빨강
  '#4ECDC4', // 청록
  '#FFE66D', // 노랑
  '#95E1D3', // 민트
  '#F38181', // 코랄
  '#AA96DA', // 보라
  '#FCBAD3', // 핑크
  '#A8D8EA', // 하늘
];

export const generateParticipantNames = (
  count: number,
  preset: PresetType
): string[] => {
  switch (preset) {
    case 'number':
      return Array.from({ length: count }, (_, i) => String(i + 1));
    case 'alphabet':
      return Array.from({ length: count }, (_, i) =>
        String.fromCharCode(65 + i)
      );
    case 'team':
      return Array.from({ length: count }, (_, i) => `팀${i + 1}`);
    default:
      return Array.from({ length: count }, (_, i) => `참가자${i + 1}`);
  }
};

export const generateResultNames = (
  count: number,
  preset: ResultPresetType
): string[] => {
  switch (preset) {
    case 'winlose': {
      const results = Array(count).fill('꽝');
      results[Math.floor(Math.random() * count)] = '당첨';
      return results;
    }
    case 'rank':
      return Array.from({ length: count }, (_, i) => `${i + 1}등`);
    default:
      return Array.from({ length: count }, () => '');
  }
};
