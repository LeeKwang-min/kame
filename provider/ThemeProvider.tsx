'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ReactNode } from 'react';

interface IProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: IProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}>
      {children}
    </NextThemesProvider>
  );
}
