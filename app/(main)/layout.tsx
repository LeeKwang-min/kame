function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full min-h-dvh flex justify-center px-3 sm:px-6 py-4 bg-arcade-bg overflow-x-hidden">
      {children}
    </main>
  );
}

export default MainLayout;
