function MypageLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-dvw min-h-dvh flex justify-center px-6 py-4 bg-arcade-bg">
      {children}
    </main>
  );
}

export default MypageLayout;
