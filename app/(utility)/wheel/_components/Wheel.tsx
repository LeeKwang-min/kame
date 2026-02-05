'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  MIN_ITEMS,
  MAX_ITEMS,
  ITEM_PRESETS,
  generateItems,
} from '../_lib/config';
import { WheelPhase, ItemPresetType, WheelItem } from '../_lib/types';

const WHEEL_SIZE = 400;
const CENTER = WHEEL_SIZE / 2;
const RADIUS = WHEEL_SIZE / 2 - 10;

function Wheel() {
  const [phase, setPhase] = useState<WheelPhase>('setup');
  const [itemCount, setItemCount] = useState(4);
  const [itemPreset, setItemPreset] = useState<ItemPresetType>('winlose');
  const [items, setItems] = useState<WheelItem[]>([]);
  const [rotation, setRotation] = useState(0);
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const wheelRef = useRef<SVGGElement>(null);

  // 초기화
  useEffect(() => {
    setItems(generateItems(itemCount, itemPreset));
  }, []);

  // 항목 수 변경
  const handleCountChange = useCallback((value: string) => {
    const count = parseInt(value);
    setItemCount(count);
    setItems(generateItems(count, itemPreset));
  }, [itemPreset]);

  // 프리셋 변경
  const handlePresetChange = useCallback((value: ItemPresetType) => {
    setItemPreset(value);
    if (value !== 'custom') {
      setItems(generateItems(itemCount, value));
    }
  }, [itemCount]);

  // 항목 수정
  const handleItemChange = useCallback((index: number, value: string) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], label: value };
      return next;
    });
  }, []);

  // 게임 준비
  const handleReady = useCallback(() => {
    setPhase('ready');
    setResultIndex(null);
    setRotation(0);
  }, []);

  // 결과 인덱스 계산 함수
  const calculateResultIndex = useCallback((totalRotation: number) => {
    // 정규화된 회전 각도 (0-360)
    const normalizedRotation = ((totalRotation % 360) + 360) % 360;
    const anglePerItem = 360 / items.length;
    // 화살표(12시 방향)가 가리키는 슬라이스 계산
    // 휠이 시계방향으로 회전하면, 화살표 위치에는 반대 방향의 슬라이스가 옴
    const offsetAngle = (360 - normalizedRotation) % 360;
    return Math.floor(offsetAngle / anglePerItem) % items.length;
  }, [items.length]);

  // 돌림판 돌리기
  const handleSpin = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    setPhase('spinning');
    setResultIndex(null);

    // 랜덤 회전 (5~10바퀴 + 랜덤 각도)
    const spins = 5 + Math.random() * 5;
    const extraDegrees = Math.random() * 360;
    const totalRotation = rotation + spins * 360 + extraDegrees;

    setRotation(totalRotation);

    // 결과 계산 (3초 후)
    setTimeout(() => {
      const selectedIndex = calculateResultIndex(totalRotation);
      setResultIndex(selectedIndex);
      setPhase('result');
      setIsAnimating(false);
    }, 3000);
  }, [rotation, isAnimating, calculateResultIndex]);

  // 한 번에 결과 보기
  const handleInstantResult = useCallback(() => {
    // 랜덤 결과 선택
    const randomIndex = Math.floor(Math.random() * items.length);
    // 해당 인덱스가 화살표에 오도록 회전 각도 계산
    const anglePerItem = 360 / items.length;
    const targetAngle = (randomIndex + 0.5) * anglePerItem; // 슬라이스 중앙
    const finalRotation = 360 - targetAngle;

    setRotation(finalRotation);
    setResultIndex(randomIndex);
    setPhase('result');
  }, [items.length]);

  // 리셋
  const handleReset = useCallback(() => {
    setPhase('setup');
    setRotation(0);
    setResultIndex(null);
    setIsAnimating(false);
  }, []);

  // SVG 파이 조각 경로 생성
  const createSlicePath = (index: number, total: number) => {
    const anglePerSlice = (2 * Math.PI) / total;
    const startAngle = index * anglePerSlice - Math.PI / 2;
    const endAngle = (index + 1) * anglePerSlice - Math.PI / 2;

    const x1 = CENTER + RADIUS * Math.cos(startAngle);
    const y1 = CENTER + RADIUS * Math.sin(startAngle);
    const x2 = CENTER + RADIUS * Math.cos(endAngle);
    const y2 = CENTER + RADIUS * Math.sin(endAngle);

    const largeArcFlag = anglePerSlice > Math.PI ? 1 : 0;

    return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  // 텍스트 위치 계산
  const getTextPosition = (index: number, total: number) => {
    const anglePerSlice = (2 * Math.PI) / total;
    const midAngle = (index + 0.5) * anglePerSlice - Math.PI / 2;
    const textRadius = RADIUS * 0.65;

    return {
      x: CENTER + textRadius * Math.cos(midAngle),
      y: CENTER + textRadius * Math.sin(midAngle),
      angle: (midAngle * 180) / Math.PI + 90,
    };
  };

  return (
    <div className="w-full h-full flex gap-6 items-start justify-center">
      {/* 설정 패널 */}
      <aside className="shrink-0 w-72 space-y-4">
        <div className="p-4 border border-border rounded-lg space-y-4">
          <h3 className="font-bold text-lg">설정</h3>

          {/* 항목 수 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">항목 수</label>
            <Select
              value={String(itemCount)}
              onValueChange={handleCountChange}
              disabled={phase !== 'setup'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from(
                  { length: MAX_ITEMS - MIN_ITEMS + 1 },
                  (_, i) => MIN_ITEMS + i
                ).map(n => (
                  <SelectItem key={n} value={String(n)}>
                    {n}개
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 프리셋 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">항목 종류</label>
            <Select
              value={itemPreset}
              onValueChange={(v) => handlePresetChange(v as ItemPresetType)}
              disabled={phase !== 'setup'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_PRESETS.map(p => (
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
              <Button onClick={handleReady} className="w-full">
                돌림판 생성
              </Button>
            )}
            {phase === 'ready' && (
              <>
                <Button onClick={handleSpin} className="w-full">
                  돌리기!
                </Button>
                <Button onClick={handleReset} variant="outline" className="w-full">
                  처음부터
                </Button>
              </>
            )}
            {phase === 'spinning' && (
              <Button disabled className="w-full">
                돌아가는 중...
              </Button>
            )}
            {phase === 'result' && (
              <>
                <Button onClick={handleSpin} className="w-full">
                  다시 돌리기
                </Button>
                <Button onClick={handleReset} variant="outline" className="w-full">
                  처음부터
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 항목 입력 */}
        {phase === 'setup' && itemPreset === 'custom' && (
          <div className="p-4 border border-border rounded-lg space-y-2 max-h-80 overflow-y-auto">
            <h4 className="font-medium text-sm">항목 입력</h4>
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <Input
                  value={item.label}
                  onChange={(e) => handleItemChange(i, e.target.value)}
                  placeholder={`항목 ${i + 1}`}
                />
              </div>
            ))}
          </div>
        )}

        {/* 결과 표시 */}
        {phase === 'result' && resultIndex !== null && (
          <div
            className="p-6 rounded-lg text-center"
            style={{ backgroundColor: items[resultIndex].color }}
          >
            <p className="text-white text-sm mb-2">결과</p>
            <p className="text-white text-3xl font-bold">
              {items[resultIndex].label}
            </p>
          </div>
        )}
      </aside>

      {/* 돌림판 영역 */}
      <div className="flex-1 max-w-[500px] flex flex-col items-center gap-4">
        {phase === 'setup' ? (
          <div className="w-full aspect-square max-w-[400px] border border-dashed border-border rounded-full flex items-center justify-center text-muted-foreground">
            설정을 완료하고 돌림판을 생성하세요
          </div>
        ) : (
          <div className="relative">
            {/* 화살표 (위쪽) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
              <div
                className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[30px] border-l-transparent border-r-transparent border-t-red-500"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
              />
            </div>

            {/* 돌림판 SVG */}
            <svg
              width={WHEEL_SIZE}
              height={WHEEL_SIZE}
              className="drop-shadow-lg cursor-pointer"
              onClick={() => {
                if (phase === 'ready' || phase === 'result') {
                  handleSpin();
                }
              }}
            >
              <g
                ref={wheelRef}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: 'center',
                  transition: isAnimating
                    ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                    : 'none',
                }}
              >
                {items.map((item, i) => (
                  <g key={i}>
                    {/* 파이 조각 */}
                    <path
                      d={createSlicePath(i, items.length)}
                      fill={item.color}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                    {/* 텍스트 */}
                    {(() => {
                      const pos = getTextPosition(i, items.length);
                      return (
                        <text
                          x={pos.x}
                          y={pos.y}
                          fill="#fff"
                          fontSize={items.length > 6 ? 14 : 18}
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${pos.angle}, ${pos.x}, ${pos.y})`}
                          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                        >
                          {item.label.length > 6
                            ? item.label.slice(0, 6) + '...'
                            : item.label}
                        </text>
                      );
                    })()}
                  </g>
                ))}

                {/* 중앙 원 */}
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={30}
                  fill="#fff"
                  stroke="#ddd"
                  strokeWidth={2}
                />
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={20}
                  fill="#333"
                />
              </g>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

export default Wheel;
