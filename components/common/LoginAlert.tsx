'use client';

import { useSession } from 'next-auth/react';
import { LogIn } from 'lucide-react';
import Link from 'next/link';

function LoginAlert() {
  const { data: session, status } = useSession();

  // 로딩 중이거나 로그인한 경우 표시하지 않음
  if (status === 'loading' || session) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-arcade-surface/95 backdrop-blur-sm border border-arcade-border rounded-lg p-4 shadow-lg max-w-xs">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-arcade-cyan/20 flex items-center justify-center">
            <LogIn className="w-4 h-4 text-arcade-cyan" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-arcade-text font-medium mb-1">
              로그인이 필요합니다
            </p>
            <p className="text-xs text-arcade-text/60 mb-3">
              점수를 저장하려면 로그인하세요
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-arcade-cyan hover:text-arcade-cyan/80 transition-colors"
            >
              <span>로그인하러 가기</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginAlert;
