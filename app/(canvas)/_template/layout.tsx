import KameHeader from '@/components/common/KameHeader';
import { Metadata } from 'next';

// TODO: 게임에 맞게 metadata를 수정하세요
export const metadata: Metadata = {
  title: 'Template Game',
  description: 'Template 게임입니다.',
  keywords: ['Template', '웹 게임', 'Canvas 게임'],
};

// TODO: 'Template'을 실제 게임 이름으로 변경하세요
function TemplateLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-10 items-center">
      <KameHeader title="Template" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default TemplateLayout;
