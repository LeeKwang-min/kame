import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-invert prose-sm max-w-none text-arcade-text/80">
      <h1 className="text-2xl font-bold text-arcade-text mb-2">
        개인정보처리방침
      </h1>
      <p className="text-arcade-text/50 text-xs mb-8">최종 수정일: 2026년 3월 12일</p>

      <p>
        {SITE_NAME}(이하 &quot;서비스&quot;)는 이용자의 개인정보를 중요하게
        생각하며, 관련 법령에 따라 이용자의 개인정보를 보호하고 있습니다.
      </p>

      <h2 className="text-lg font-bold text-arcade-text mt-8 mb-3">
        1. 수집하는 개인정보
      </h2>
      <p>서비스는 다음과 같은 정보를 수집합니다:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>
          <strong>Google 로그인 정보:</strong> 이름, 이메일 주소, 프로필 이미지
          (Google OAuth를 통해 제공)
        </li>
        <li>
          <strong>게임 데이터:</strong> 게임 점수, 플레이 기록
        </li>
        <li>
          <strong>자동 수집 정보:</strong> IP 주소, 브라우저 유형, 접속 시간,
          쿠키 정보
        </li>
      </ul>

      <h2 className="text-lg font-bold text-arcade-text mt-8 mb-3">
        2. 개인정보의 이용 목적
      </h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>게임 점수 저장 및 랭킹 서비스 제공</li>
        <li>사용자 인증 및 계정 관리</li>
        <li>서비스 개선 및 통계 분석</li>
        <li>광고 서비스 제공 (아래 광고 관련 항목 참조)</li>
      </ul>

      <h2 className="text-lg font-bold text-arcade-text mt-8 mb-3">
        3. 광고 및 쿠키
      </h2>
      <p>
        본 서비스는 <strong>Google AdSense</strong>를 사용하여 광고를
        게재합니다. Google AdSense는 사용자의 관심사에 맞는 광고를 제공하기
        위해 쿠키를 사용할 수 있습니다.
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>
          Google은 사용자가 본 서비스 또는 인터넷의 다른 웹사이트를 방문한
          기록을 바탕으로 광고를 게재할 수 있습니다.
        </li>
        <li>
          사용자는{' '}
          <a
            href="https://www.google.com/settings/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="text-arcade-cyan hover:underline"
          >
            Google 광고 설정
          </a>
          에서 맞춤 광고를 비활성화할 수 있습니다.
        </li>
        <li>
          제3자 광고 쿠키 사용에 대한 자세한 내용은{' '}
          <a
            href="https://policies.google.com/technologies/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="text-arcade-cyan hover:underline"
          >
            Google 광고 정책
          </a>
          을 참조하세요.
        </li>
      </ul>

      <h2 className="text-lg font-bold text-arcade-text mt-8 mb-3">
        4. 분석 도구
      </h2>
      <p>
        본 서비스는 <strong>Vercel Analytics</strong>를 사용하여 웹사이트
        방문 통계를 수집합니다. 이 과정에서 개인을 직접 식별할 수 있는
        정보는 수집되지 않습니다.
      </p>

      <h2 className="text-lg font-bold text-arcade-text mt-8 mb-3">
        5. 개인정보의 보관 및 파기
      </h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>
          회원 탈퇴 시 개인정보는 즉시 삭제됩니다.
        </li>
        <li>
          게임 점수 기록은 랭킹 서비스를 위해 익명화하여 보관될 수 있습니다.
        </li>
      </ul>

      <h2 className="text-lg font-bold text-arcade-text mt-8 mb-3">
        6. 이용자의 권리
      </h2>
      <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>개인정보 열람, 수정, 삭제 요청</li>
        <li>Google 계정 연동 해제를 통한 서비스 탈퇴</li>
        <li>쿠키 비활성화 (브라우저 설정을 통해 가능)</li>
      </ul>

      <h2 className="text-lg font-bold text-arcade-text mt-8 mb-3">
        7. 문의
      </h2>
      <p>
        개인정보 관련 문의사항은 서비스 내 문의 기능을 통해 연락해 주시기
        바랍니다.
      </p>
    </article>
  );
}
