'use client';

import RotatingText from '@/components/RotatingText';
import { MENU_LIST } from '@/lib/config';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const rotatingTexts = [...MENU_LIST.map((menu) => menu.name.eng), 'In Kame!'];

function MainRotatingText() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex items-center gap-2 font-montserrat-alternates text-3xl">
      <span>Play</span>
      {prefersReducedMotion ? (
        <span className="px-2 sm:px-2 md:px-3 bg-[#f2f1f6] text-black py-0.5 sm:py-1 md:py-2 justify-center rounded-lg">
          In Kame!
        </span>
      ) : (
        <RotatingText
          texts={rotatingTexts}
          mainClassName="px-2 sm:px-2 md:px-3 bg-[#f2f1f6] text-black overflow-hidden py-0.5 sm:py-1 md:py-2 justify-center rounded-lg"
          staggerFrom={'last'}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '-120%' }}
          staggerDuration={0.025}
          splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
          transition={{ type: 'spring', damping: 30, stiffness: 400 }}
          rotationInterval={3000}
        />
      )}
    </div>
  );
}

export default MainRotatingText;
