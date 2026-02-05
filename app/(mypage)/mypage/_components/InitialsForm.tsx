'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useLocale } from '@/provider/LocaleProvider';
import { Delete, Space } from 'lucide-react';

interface IProps {
  currentInitials?: string | null;
  onUpdate: (initials: string) => Promise<void>;
}

const KEYS_GRID = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  'DEL',
  'SPC',
];
const COLS = 7;
const ROWS = 4;

function InitialsForm({ currentInitials, onUpdate }: IProps) {
  const { t } = useLocale();
  const [initials, setInitials] = useState(currentInitials || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleKeyClick = useCallback((key: string) => {
    if (key === 'DEL') {
      setInitials((prev) => prev.slice(0, -1));
    } else if (key === 'SPC') {
      setInitials((prev) => (prev.length < 5 ? prev + ' ' : prev));
    } else {
      setInitials((prev) => (prev.length < 5 ? prev + key : prev));
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const { code } = e;

      if (code === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev - 1 + KEYS_GRID.length) % KEYS_GRID.length);
        e.preventDefault();
      } else if (code === 'ArrowRight') {
        setSelectedIndex((prev) => (prev + 1) % KEYS_GRID.length);
        e.preventDefault();
      } else if (code === 'ArrowUp') {
        setSelectedIndex((prev) => {
          const newIndex = prev - COLS;
          return newIndex < 0 ? prev + COLS * (ROWS - 1) : newIndex;
        });
        e.preventDefault();
      } else if (code === 'ArrowDown') {
        setSelectedIndex((prev) => {
          const newIndex = prev + COLS;
          return newIndex >= KEYS_GRID.length ? prev % COLS : newIndex;
        });
        e.preventDefault();
      } else if (code === 'Enter' || code === 'NumpadEnter') {
        handleKeyClick(KEYS_GRID[selectedIndex]);
        e.preventDefault();
      } else if (code === 'Backspace') {
        handleKeyClick('DEL');
        e.preventDefault();
      }
    },
    [selectedIndex, handleKeyClick],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSubmit = async () => {
    if (initials.length === 0) {
      toast.error(t.myPage.initialsRequired);
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdate(initials);
      toast.success(t.myPage.initialsUpdated);
    } catch {
      toast.error(t.myPage.initialsUpdateFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const paddedInitials = (initials + '_____').slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-arcade-text">
          {t.myPage.yourInitials}
        </label>
        <p className="text-xs text-arcade-text/60">
          {t.myPage.initialsDescription}
        </p>
      </div>

      {/* 이니셜 표시 영역 */}
      <div
        className={cn(
          'flex justify-center items-center gap-2 py-4',
          'bg-arcade-surface rounded-lg border border-arcade-border',
        )}>
        {paddedInitials.split('').map((char, i) => (
          <span
            key={i}
            className={cn(
              'w-10 h-12 flex items-center justify-center',
              'text-2xl font-mono font-bold',
              'border-b-2',
              char === '_'
                ? 'text-arcade-text/30 border-arcade-border'
                : 'text-arcade-cyan border-arcade-cyan',
            )}>
            {char === '_' ? '' : char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </div>

      {/* 키보드 그리드 */}
      <div className="grid grid-cols-7 gap-1.5">
        {KEYS_GRID.map((key, index) => {
          const isSelected = selectedIndex === index;
          const isSpecial = key === 'DEL' || key === 'SPC';

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSelectedIndex(index);
                handleKeyClick(key);
              }}
              className={cn(
                'h-10 rounded-md text-sm font-mono font-medium',
                'transition-all duration-150',
                'border',
                isSelected
                  ? 'bg-arcade-cyan/20 border-arcade-cyan text-arcade-cyan scale-105'
                  : 'bg-arcade-surface border-arcade-border text-arcade-text hover:bg-arcade-border/50',
                isSpecial && 'text-xs',
              )}>
              {key === 'DEL' ? (
                <Delete size={16} className="mx-auto" />
              ) : key === 'SPC' ? (
                <Space size={16} className="mx-auto" />
              ) : (
                key
              )}
            </button>
          );
        })}
      </div>

      {/* 안내 문구 */}
      <p className="text-xs text-arcade-text/50 text-center">
        {t.myPage.keyboardHint || '방향키로 이동, Enter로 선택'}
      </p>

      {/* 저장 버튼 */}
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || initials.length === 0}
        className={cn(
          'w-full h-11',
          'bg-gradient-to-r from-arcade-cyan/20 to-arcade-magenta/20',
          'hover:from-arcade-cyan/30 hover:to-arcade-magenta/30',
          'border border-arcade-cyan/50 hover:border-arcade-cyan',
          'text-arcade-text hover:text-white',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}>
        {isSubmitting ? t.common.saving : t.common.save}
      </Button>
    </div>
  );
}

export default InitialsForm;
