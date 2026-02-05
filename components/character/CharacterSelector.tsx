'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CHARACTER_CONFIG, TCharacterType } from '@/lib/character/config';
import CharacterSprite from './CharacterSprite';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/provider/LocaleProvider';

interface IProps {
  currentCharacter?: TCharacterType | null;
  onSelect: (character: TCharacterType) => Promise<void>;
}

function CharacterSelector({ currentCharacter, onSelect }: IProps) {
  const { t } = useLocale();
  const [selected, setSelected] = useState<TCharacterType | null>(
    currentCharacter || null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredCharacter, setHoveredCharacter] = useState<TCharacterType | null>(null);

  const handleSelect = (type: TCharacterType) => {
    setSelected(type);
  };

  const handleSave = async () => {
    if (!selected) return;

    setIsSubmitting(true);
    try {
      await onSelect(selected);
      toast.success(t.myPage.characterUpdated);
    } catch {
      toast.error(t.myPage.characterUpdateFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanged = selected !== currentCharacter;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-arcade-text">
          {t.myPage.selectCharacter}
        </label>
        <p className="text-xs text-arcade-text/60">
          {t.myPage.characterDescription}
        </p>
      </div>

      {/* 캐릭터 선택 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        {CHARACTER_CONFIG.types.map((type) => {
          const isSelected = selected === type;
          const isHovered = hoveredCharacter === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => handleSelect(type)}
              onMouseEnter={() => setHoveredCharacter(type)}
              onMouseLeave={() => setHoveredCharacter(null)}
              className={cn(
                'relative flex flex-col items-center gap-2 p-4',
                'rounded-lg border-2 transition-all duration-200',
                'bg-arcade-surface',
                isSelected
                  ? 'border-arcade-cyan shadow-[0_0_12px_rgba(34,211,211,0.3)]'
                  : 'border-arcade-border hover:border-arcade-cyan/50',
              )}>
              {/* 선택 체크 표시 */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Check size={16} className="text-arcade-cyan" />
                </div>
              )}

              {/* 캐릭터 미리보기 */}
              <div
                className={cn(
                  'rounded-lg overflow-hidden',
                  'bg-arcade-bg/50 p-2',
                )}
                style={{ imageRendering: 'pixelated' }}>
                <CharacterSprite
                  type={type}
                  animation={isHovered || isSelected ? 'happy' : 'idle'}
                  size={64}
                />
              </div>

              {/* 캐릭터 이름 */}
              <span
                className={cn(
                  'text-sm font-medium',
                  isSelected ? 'text-arcade-cyan' : 'text-arcade-text',
                )}>
                {type === 'male' ? t.myPage.characterMale : t.myPage.characterFemale}
              </span>
            </button>
          );
        })}
      </div>

      {/* 저장 버튼 */}
      <Button
        type="button"
        onClick={handleSave}
        disabled={isSubmitting || !selected || !hasChanged}
        className={cn(
          'w-full h-10',
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

export default CharacterSelector;
