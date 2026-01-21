import FuzzyText from '@/components/FuzzyText';
import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="flex flex-col gap-10 items-center justify-center h-screen">
      <FuzzyText
        baseIntensity={0.1}
        hoverIntensity={0.5}
        enableHover={false}
        color="#000"
        fontSize="clamp(2rem, 10vw, 10rem)">
        404
      </FuzzyText>
      <FuzzyText
        baseIntensity={0.1}
        hoverIntensity={0.5}
        enableHover={false}
        color="#000"
        fontSize="clamp(2rem, 4vw, 8rem)">
        Page Not Found
      </FuzzyText>
      <Link
        href="/"
        className="text-xl underline text-gray-500 hover:text-gray-700">
        Home
      </Link>
    </section>
  );
}
