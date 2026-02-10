'use client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Dispatch, SetStateAction } from 'react';
import { useLocale } from '@/provider/LocaleProvider';

interface IProps {
  category: string;
  setCategory: Dispatch<SetStateAction<string>>;
}

function MainCategorySelect({ category, setCategory }: IProps) {
  const { t } = useLocale();

  return (
    <Select value={category} onValueChange={setCategory}>
      <SelectTrigger
        className={cn(
          'w-[160px] data-[size=default]:h-10 rounded-lg',
          'bg-arcade-surface border-arcade-border',
          'text-arcade-text',
          'focus:border-arcade-cyan focus:ring-arcade-cyan/20',
          'transition-all duration-300',
        )}>
        <SelectValue placeholder={t.category.all} />
      </SelectTrigger>
      <SelectContent
        className={cn(
          'bg-arcade-surface border-arcade-border',
          'text-arcade-text',
        )}>
        <SelectItem value="ALL">{t.category.all}</SelectItem>
        <SelectItem value="Arcade">{t.category.arcade}</SelectItem>
        <SelectItem value="Action">{t.category.action}</SelectItem>
        <SelectItem value="Puzzle">{t.category.puzzle}</SelectItem>
        <SelectItem value="Reflex">{t.category.reflex}</SelectItem>
        <SelectItem value="Good Luck">{t.category.goodLuck}</SelectItem>
        <SelectItem value="Utility">{t.category.utility}</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default MainCategorySelect;
