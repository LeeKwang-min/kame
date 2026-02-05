import LoginAlert from '@/components/common/LoginAlert';

function CanvasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <LoginAlert />
    </>
  );
}

export default CanvasLayout;
