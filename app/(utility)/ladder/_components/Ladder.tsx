'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MIN_PARTICIPANTS,
  MAX_PARTICIPANTS,
  PARTICIPANT_PRESETS,
  RESULT_PRESETS,
  LADDER_COLORS,
  generateParticipantNames,
  generateResultNames,
} from '../_lib/config';
import {
  LadderPhase,
  PresetType,
  ResultPresetType,
  LadderLine,
  LadderPath,
} from '../_lib/types';
import { generateLadderLines, calculatePath, shuffleArray } from '../_lib/utils';

const LADDER_WIDTH = 500;
const LADDER_HEIGHT = 400;
const ROW_COUNT = 8;

type ActiveAnimation = {
  path: LadderPath;
  progress: number;
};

function Ladder() {
  const [phase, setPhase] = useState<LadderPhase>('setup');
  const [participantCount, setParticipantCount] = useState(4);
  const [participantPreset, setParticipantPreset] = useState<PresetType>('number');
  const [resultPreset, setResultPreset] = useState<ResultPresetType>('winlose');
  const [participants, setParticipants] = useState<string[]>([]);
  const [results, setResults] = useState<string[]>([]);
  const [ladderLines, setLadderLines] = useState<LadderLine[]>([]);
  const [revealedResults, setRevealedResults] = useState<Set<number>>(new Set());

  // 여러 애니메이션을 동시에 관리 (인덱스 → 애니메이션 상태)
  const [activeAnimations, setActiveAnimations] = useState<Map<number, ActiveAnimation>>(new Map());
  const animationRefs = useRef<Map<number, number>>(new Map());

  // 참가자 수 변경
  const handleCountChange = useCallback((value: string) => {
    const count = parseInt(value);
    setParticipantCount(count);
    setParticipants(generateParticipantNames(count, participantPreset));
    setResults(generateResultNames(count, resultPreset));
  }, [participantPreset, resultPreset]);

  // 프리셋 변경
  const handleParticipantPresetChange = useCallback((value: PresetType) => {
    setParticipantPreset(value);
    if (value !== 'custom') {
      setParticipants(generateParticipantNames(participantCount, value));
    }
  }, [participantCount]);

  const handleResultPresetChange = useCallback((value: ResultPresetType) => {
    setResultPreset(value);
    if (value !== 'custom') {
      setResults(generateResultNames(participantCount, value));
    }
  }, [participantCount]);

  // 참가자명 수정
  const handleParticipantChange = useCallback((index: number, value: string) => {
    setParticipants(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  // 결과명 수정
  const handleResultChange = useCallback((index: number, value: string) => {
    setResults(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  // 초기화
  useEffect(() => {
    setParticipants(generateParticipantNames(participantCount, participantPreset));
    setResults(generateResultNames(participantCount, resultPreset));
  }, []);

  // 게임 시작
  const handleStart = useCallback(() => {
    const lines = generateLadderLines(participantCount, ROW_COUNT);
    setLadderLines(lines);
    // 결과를 섞어서 배치
    setResults(prev => shuffleArray(prev));
    setPhase('ready');
    setRevealedResults(new Set());
    setActiveAnimations(new Map());
  }, [participantCount]);

  // 사다리 선택
  const handleSelectLadder = useCallback((index: number) => {
    // 이미 reveal되었거나 애니메이션 중인 참가자는 선택 불가
    if (phase !== 'ready' || revealedResults.has(index) || activeAnimations.has(index)) return;

    const path = calculatePath(
      index,
      ladderLines,
      participantCount,
      ROW_COUNT,
      LADDER_WIDTH,
      LADDER_HEIGHT
    );

    // 애니메이션 추가
    setActiveAnimations(prev => {
      const next = new Map(prev);
      next.set(index, { path, progress: 0 });
      return next;
    });

    // 애니메이션 시작
    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setActiveAnimations(prev => {
        const next = new Map(prev);
        const current = next.get(index);
        if (current) {
          next.set(index, { ...current, progress });
        }
        return next;
      });

      if (progress < 1) {
        const rafId = requestAnimationFrame(animate);
        animationRefs.current.set(index, rafId);
      } else {
        // 애니메이션 완료 - reveal에 추가하고 activeAnimations에서 제거
        setRevealedResults(prev => new Set([...prev, index]));
        setActiveAnimations(prev => {
          const next = new Map(prev);
          next.delete(index);
          return next;
        });
        animationRefs.current.delete(index);
      }
    };

    const rafId = requestAnimationFrame(animate);
    animationRefs.current.set(index, rafId);
  }, [phase, ladderLines, participantCount, revealedResults, activeAnimations]);

  // 리셋
  const handleReset = useCallback(() => {
    // 진행 중인 모든 애니메이션 취소
    animationRefs.current.forEach(rafId => cancelAnimationFrame(rafId));
    animationRefs.current.clear();

    setPhase('setup');
    setActiveAnimations(new Map());
    setRevealedResults(new Set());
    setLadderLines([]);
  }, []);

  // 한 번에 확인 (모든 결과 표시)
  const handleRevealAll = useCallback(() => {
    // 진행 중인 모든 애니메이션 취소
    animationRefs.current.forEach(rafId => cancelAnimationFrame(rafId));
    animationRefs.current.clear();

    const allIndices = new Set<number>();
    for (let i = 0; i < participantCount; i++) {
      allIndices.add(i);
    }
    setRevealedResults(allIndices);
    setActiveAnimations(new Map());
  }, [participantCount]);

  // SVG 경로 문자열 생성 함수
  const getPathD = useCallback((path: LadderPath) => {
    const points = path.points;
    if (points.length === 0) return '';

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  }, []);

  // 경로 길이 계산 함수
  const getPathLength = useCallback((path: LadderPath) => {
    let totalLength = 0;
    const points = path.points;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }
    return totalLength;
  }, []);

  const columnWidth = LADDER_WIDTH / (participantCount + 1);
  const rowHeight = LADDER_HEIGHT / (ROW_COUNT + 1);

  // 현재 선택된(애니메이션 중인) 인덱스들
  const animatingIndices = useMemo(() => new Set(activeAnimations.keys()), [activeAnimations]);

  return (
    <div className="w-full h-full flex gap-6 items-start justify-center">
      {/* 설정 패널 */}
      <aside className="shrink-0 w-72 space-y-4">
        <div className="p-4 border border-border rounded-lg space-y-4">
          <h3 className="font-bold text-lg">설정</h3>

          {/* 참가자 수 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">참가자 수</label>
            <Select
              value={String(participantCount)}
              onValueChange={handleCountChange}
              disabled={phase !== 'setup'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from(
                  { length: MAX_PARTICIPANTS - MIN_PARTICIPANTS + 1 },
                  (_, i) => MIN_PARTICIPANTS + i
                ).map(n => (
                  <SelectItem key={n} value={String(n)}>
                    {n}명
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 참가자 프리셋 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">참가자 이름</label>
            <Select
              value={participantPreset}
              onValueChange={(v) => handleParticipantPresetChange(v as PresetType)}
              disabled={phase !== 'setup'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARTICIPANT_PRESETS.map(p => (
                  <SelectItem key={p.type} value={p.type}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 결과 프리셋 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">결과 종류</label>
            <Select
              value={resultPreset}
              onValueChange={(v) => handleResultPresetChange(v as ResultPresetType)}
              disabled={phase !== 'setup'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESULT_PRESETS.map(p => (
                  <SelectItem key={p.type} value={p.type}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 버튼 */}
          <div className="pt-2 space-y-2">
            {phase === 'setup' && (
              <Button onClick={handleStart} className="w-full">
                사다리 생성
              </Button>
            )}
            {phase === 'ready' && (
              <>
                {revealedResults.size < participantCount && (
                  <Button onClick={handleRevealAll} variant="secondary" className="w-full">
                    한 번에 확인
                  </Button>
                )}
                <Button onClick={handleReset} variant="outline" className="w-full">
                  처음부터
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 참가자 입력 */}
        {phase === 'setup' && participantPreset === 'custom' && (
          <div className="p-4 border border-border rounded-lg space-y-2">
            <h4 className="font-medium text-sm">참가자 이름</h4>
            {participants.map((name, i) => (
              <Input
                key={i}
                value={name}
                onChange={(e) => handleParticipantChange(i, e.target.value)}
                placeholder={`참가자 ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* 결과 입력 */}
        {phase === 'setup' && resultPreset === 'custom' && (
          <div className="p-4 border border-border rounded-lg space-y-2">
            <h4 className="font-medium text-sm">결과 입력</h4>
            {results.map((name, i) => (
              <Input
                key={i}
                value={name}
                onChange={(e) => handleResultChange(i, e.target.value)}
                placeholder={`결과 ${i + 1}`}
              />
            ))}
          </div>
        )}
      </aside>

      {/* 사다리 영역 */}
      <div className="flex-1 max-w-[600px] flex flex-col items-center gap-4">
        {phase === 'setup' ? (
          <div className="w-full aspect-square max-w-[500px] border border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground">
            설정을 완료하고 사다리를 생성하세요
          </div>
        ) : (
          <>
            {/* 참가자 버튼 */}
            <div className="flex gap-2 justify-center" style={{ width: LADDER_WIDTH }}>
              {participants.map((name, i) => {
                const isRevealed = revealedResults.has(i);
                const isAnimating = animatingIndices.has(i);

                return (
                  <button
                    key={i}
                    onClick={() => handleSelectLadder(i)}
                    disabled={isRevealed || isAnimating}
                    className="flex-1 py-2 px-1 text-sm font-bold rounded-lg transition-all disabled:opacity-50"
                    style={{
                      backgroundColor: isRevealed
                        ? LADDER_COLORS[i % LADDER_COLORS.length] + '80'
                        : isAnimating
                        ? LADDER_COLORS[i % LADDER_COLORS.length]
                        : LADDER_COLORS[i % LADDER_COLORS.length] + '40',
                      color: isRevealed || isAnimating ? '#fff' : '#000',
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            {/* SVG 사다리 */}
            <svg
              width={LADDER_WIDTH}
              height={LADDER_HEIGHT}
              className="border border-border rounded-lg bg-background"
            >
              {/* 세로선 */}
              {Array.from({ length: participantCount }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={columnWidth * (i + 1)}
                  y1={0}
                  x2={columnWidth * (i + 1)}
                  y2={LADDER_HEIGHT}
                  stroke="#666"
                  strokeWidth={2}
                />
              ))}

              {/* 가로선 */}
              {ladderLines.map((line, i) => (
                <line
                  key={`h-${i}`}
                  x1={columnWidth * (line.fromColumn + 1)}
                  y1={rowHeight * line.row}
                  x2={columnWidth * (line.toColumn + 1)}
                  y2={rowHeight * line.row}
                  stroke="#666"
                  strokeWidth={2}
                />
              ))}

              {/* 여러 애니메이션 경로 동시 렌더링 */}
              {Array.from(activeAnimations.entries()).map(([index, { path, progress }]) => {
                const pathD = getPathD(path);
                const pathLength = getPathLength(path);

                return (
                  <path
                    key={`anim-${index}`}
                    d={pathD}
                    fill="none"
                    stroke={LADDER_COLORS[index % LADDER_COLORS.length]}
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={pathLength}
                    strokeDashoffset={pathLength * (1 - progress)}
                  />
                );
              })}
            </svg>

            {/* 결과 표시 */}
            <div className="flex gap-2 justify-center" style={{ width: LADDER_WIDTH }}>
              {results.map((name, i) => {
                // 이 결과가 공개되었는지 확인
                const revealedEntry = Array.from(revealedResults).find(startIdx => {
                  const path = calculatePath(
                    startIdx,
                    ladderLines,
                    participantCount,
                    ROW_COUNT,
                    LADDER_WIDTH,
                    LADDER_HEIGHT
                  );
                  return path.endIndex === i;
                });
                const isRevealed = revealedEntry !== undefined;

                // 현재 애니메이션 중인 경로가 이 결과를 가리키는지 확인
                let animatingEntry: number | undefined;
                activeAnimations.forEach((anim, startIdx) => {
                  if (anim.path.endIndex === i && anim.progress === 1) {
                    animatingEntry = startIdx;
                  }
                });
                const isCurrentTarget = animatingEntry !== undefined;

                return (
                  <div
                    key={i}
                    className="flex-1 py-2 px-1 text-sm font-bold rounded-lg text-center transition-all"
                    style={{
                      backgroundColor: isRevealed || isCurrentTarget
                        ? LADDER_COLORS[(revealedEntry ?? animatingEntry ?? 0) % LADDER_COLORS.length]
                        : '#333',
                      color: '#fff',
                      opacity: isRevealed || isCurrentTarget ? 1 : 0.3,
                    }}
                  >
                    {isRevealed || isCurrentTarget ? name : '?'}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Ladder;
