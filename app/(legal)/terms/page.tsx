import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: '이용약관',
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <article className="prose prose-invert prose-sm max-w-none text-arcade-text/80">
      <h1 className="text-2xl font-bold text-arcade-text mb-2">이용약관</h1>
      <p className="text-arcade-text/50 text-xs mb-8">최종 수정일: 2026년 3월 12일</p>

      <h2 className="text-lg font-bold text-arcade-text mt-8 mb-3">
        1. 서비스 개요
      </h2>
      <p>
        {SITE_NAME}(이하 &quot;서비스&quot;)는 무료 웹 기반 게임 플랫폼으로,
        이용자에게 다양한 미니 게임과 랭킹 서비스를 제공합니다.
      </p>

      <h2 className="text-lg font-bold text-arcade-text mt-8 mb-3">
        2. 이용 조건
      </h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>서비스는 별도의 회원가입 없이 이용할 수 있습니다.</li>
        <li>
          점수 저장 및 랭킹 기능을 이용하려면 Google 계정으로 로그인해야
          합니다.
        </li>
        <li>
          이용자는 서비스를 정상적인 목적으로만 이용해야 하며, 부정한
          방법으로 점수를 조작하거나 서비스를 방해하는 행위를 해서는 안
          됩니다.
        </li>
      </ul>

      <h2 className="text-lg font-bold text-arcade-text mt-8 mb-3">
        3. 게임 점수 및 랭킹
      </h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>게임 점수는 서버에 저장되며, 랭킹에 반영됩니다.</li>
        <li>
          부정 행위(핵, 매크로, API 조작 등)가 확인될 경우 해당 점수는
          삭제되며 계정이 제한될 수 있습니다.
        </li>
        <li>
          서비스 운영자는 랭킹의 무결성을 위해 점수를 검토하고 조정할 권리가
          있습니다.
        </li>
      </ul>

      <h2 className="text-lg font-bold text-arcade-text mt-8 mb-3">
        4. 광고
      </h2>
      <p>
        서비스는 Google AdSense를 통해 광고를 게재하며, 이를 통해 서비스
        운영 비용을 충당합니다. 광고는 게임 플레이에 최소한의 영향을 미치도록
        배치됩니다.
      </p>

      <h2 className="text-lg font-bold text-arcade-text mt-8 mb-3">
        5. 지적재산권
      </h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>
          서비스 내 게임, 디자인, 코드 등 모든 콘텐츠의 저작권은 서비스
          운영자에게 있습니다.
        </li>
        <li>
          이용자는 서비스의 콘텐츠를 무단으로 복제, 배포, 수정할 수
          없습니다.
        </li>
      </ul>

      <h2 className="text-lg font-bold text-arcade-text mt-8 mb-3">
        6. 면책 조항
      </h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>
          서비스는 &quot;있는 그대로(as-is)&quot; 제공되며, 서비스의 중단이나
          데이터 손실에 대해 책임지지 않습니다.
        </li>
        <li>
          서비스 운영자는 사전 고지 없이 서비스 내용을 변경하거나 중단할 수
          있습니다.
        </li>
      </ul>

      <h2 className="text-lg font-bold text-arcade-text mt-8 mb-3">
        7. 약관 변경
      </h2>
      <p>
        본 약관은 필요에 따라 변경될 수 있으며, 변경 시 서비스 내 공지를
        통해 안내합니다. 변경된 약관에 동의하지 않는 경우 서비스 이용을
        중단할 수 있습니다.
      </p>

      <h2 className="text-lg font-bold text-arcade-text mt-8 mb-3">
        8. 문의
      </h2>
      <p>
        서비스 이용 관련 문의사항은 서비스 내 문의 기능을 통해 연락해 주시기
        바랍니다.
      </p>
    </article>
  );
}
