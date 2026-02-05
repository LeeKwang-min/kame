'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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

function Ladder() {
  const [phase, setPhase] = useState<LadderPhase>('setup');
  const [participantCount, setParticipantCount] = useState(4);
  const [participantPreset, setParticipantPreset] = useState<PresetType>('number');
  const [resultPreset, setResultPreset] = useState<ResultPresetType>('winlose');
  const [participants, setParticipants] = useState<string[]>([]);
  const [results, setResults] = useState<string[]>([]);
  const [ladderLines, setLadderLines] = useState<LadderLine[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [currentPath, setCurrentPath] = useState<LadderPath | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [revealedResults, setRevealedResults] = useState<Set<number>>(new Set());

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
    setSelectedIndex(null);
    setCurrentPath(null);
  }, [participantCount]);

  // 사다리 선택
  const handleSelectLadder = useCallback((index: number) => {
    if (phase !== 'ready' || revealedResults.has(index)) return;

    setSelectedIndex(index);
    const path = calculatePath(
      index,
      ladderLines,
      participantCount,
      ROW_COUNT,
      LADDER_WIDTH,
      LADDER_HEIGHT
    );
    setCurrentPath(path);
    setAnimationProgress(0);
    setPhase('running');

    // 애니메이션
    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setAnimationProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setRevealedResults(prev => new Set([...prev, index]));
        setPhase('result');
      }
    };

    requestAnimationFrame(animate);
  }, [phase, ladderLines, participantCount, revealedResults]);

  // 리셋
  const handleReset = useCallback(() => {
    setPhase('setup');
    setSelectedIndex(null);
    setCurrentPath(null);
    setAnimationProgress(0);
    setRevealedResults(new Set());
    setLadderLines([]);
  }, []);

  // 다시 뽑기 (같은 사다리로)
  const handleContinue = useCallback(() => {
    setSelectedIndex(null);
    setCurrentPath(null);
    setAnimationProgress(0);
    setPhase('ready');
  }, []);

  // SVG 경로 문자열 생성
  const pathD = useMemo(() => {
    if (!currentPath) return '';
    const points = currentPath.points;
    if (points.length === 0) return '';

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  }, [currentPath]);

  // 애니메이션된 경로 길이
  const animatedPathLength = useMemo(() => {
    if (!currentPath) return 0;
    let totalLength = 0;
    const points = currentPath.points;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }
    return totalLength;
  }, [currentPath]);

  const columnWidth = LADDER_WIDTH / (participantCount + 1);
  const rowHeight = LADDER_HEIGHT / (ROW_COUNT + 1);

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
            {(phase === 'ready' || phase === 'result') && (
              <>
                {phase === 'result' && revealedResults.size < participantCount && (
                  <Button onClick={handleContinue} className="w-full">
                    다음 뽑기
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
              {participants.map((name, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectLadder(i)}
                  disabled={phase !== 'ready' || revealedResults.has(i)}
                  className="flex-1 py-2 px-1 text-sm font-bold rounded-lg transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: revealedResults.has(i)
                      ? LADDER_COLORS[i % LADDER_COLORS.length] + '80'
                      : selectedIndex === i
                      ? LADDER_COLORS[i % LADDER_COLORS.length]
                      : LADDER_COLORS[i % LADDER_COLORS.length] + '40',
                    color: revealedResults.has(i) || selectedIndex === i ? '#fff' : '#000',
                  }}
                >
                  {name}
                </button>
              ))}
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

              {/* 애니메이션 경로 */}
              {currentPath && selectedIndex !== null && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={LADDER_COLORS[selectedIndex % LADDER_COLORS.length]}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={animatedPathLength}
                  strokeDashoffset={animatedPathLength * (1 - animationProgress)}
                />
              )}
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
                const isCurrentTarget = currentPath?.endIndex === i && animationProgress === 1;

                return (
                  <div
                    key={i}
                    className="flex-1 py-2 px-1 text-sm font-bold rounded-lg text-center transition-all"
                    style={{
                      backgroundColor: isRevealed || isCurrentTarget
                        ? LADDER_COLORS[revealedEntry ?? selectedIndex ?? 0]
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
