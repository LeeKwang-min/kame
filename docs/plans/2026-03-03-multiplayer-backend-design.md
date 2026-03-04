# 멀티플레이어 백엔드 설계

## 개요

kame에 멀티플레이어 게임을 추가하기 위한 WebSocket 백엔드 설계.
첫 구현 대상은 멀티 칠판(공유 드로잉)이며, 이후 멀티 테트리스, 멀티 레이싱으로 확장.

## 기술 스택

- **백엔드**: Express + Socket.IO (TypeScript)
- **프론트엔드**: 기존 Next.js에 `socket.io-client` 추가
- **배포**: 백엔드 Railway, 프론트엔드 Vercel (기존)
- **Room 상태**: 메모리 (추후 Redis 확장 가능)
- **레포지토리**: `kame-server` 별도 레포

## 전체 아키텍처

```
프론트엔드 (Vercel)              백엔드 (Railway)
Next.js 16 + socket.io-client ←WSS→ Express + Socket.IO
싱글게임: 기존 그대로                 Room 관리
멀티게임: 소켓 연결                   게임별 이벤트 핸들러
        ↓                              ↓
   Neon PostgreSQL                 메모리 (Room 상태)
```

## 백엔드 서버 구조

```
kame-server/
├── src/
│   ├── index.ts              # 서버 진입점
│   ├── config.ts             # 환경변수, CORS 설정
│   ├── socket/
│   │   ├── index.ts          # Socket.IO 초기화
│   │   ├── handlers/
│   │   │   ├── room.ts       # 방 생성/참가/퇴장
│   │   │   ├── whiteboard.ts # 칠판 게임 이벤트
│   │   │   ├── tetris.ts     # (나중에)
│   │   │   └── racing.ts     # (나중에)
│   │   └── middleware.ts     # 소켓 인증 미들웨어
│   ├── game/
│   │   ├── Room.ts           # Room 클래스
│   │   ├── RoomManager.ts    # 방 목록 관리
│   │   └── types.ts          # 공통 타입
│   ├── routes/
│   │   ├── health.ts         # 헬스체크
│   │   └── rooms.ts          # 방 목록 REST API
│   └── utils/
│       └── logger.ts
├── package.json
├── tsconfig.json
└── Dockerfile
```

## Room 관리

```typescript
class Room {
  id: string;
  gameType: 'whiteboard' | 'tetris' | 'racing';
  players: Map<string, Player>;
  hostId: string;
  state: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  gameState: any;
  createdAt: Date;
}
```

RoomManager가 `Map<string, Room>`으로 관리. 빈 방은 일정 시간 후 자동 정리.

## 이벤트 설계

네이밍 규칙: `카테고리:액션`

### 공통 이벤트

| 클라이언트 → 서버 | 서버 → 클라이언트 |
|---|---|
| room:create | room:created |
| room:join | room:joined |
| room:leave | room:player-left |
| | room:player-joined |
| | room:closed |

### 칠판 게임 이벤트

| 클라이언트 → 서버 | 서버 → 클라이언트 |
|---|---|
| draw:stroke | draw:stroke (브로드캐스트) |
| draw:clear | draw:clear (브로드캐스트) |
| draw:undo | draw:sync (전체 상태 동기화) |

## 프론트엔드 변경사항

### 추가 의존성

`socket.io-client`만 추가.

### 라우트 구조

```
app/(multi)/
├── layout.tsx
├── whiteboard/
│   ├── _lib/config.ts, types.ts, game.ts
│   ├── _components/whiteboard.tsx, room-lobby.tsx, player-list.tsx
│   ├── [roomId]/page.tsx    # 게임 플레이
│   └── page.tsx             # 로비 (방 목록)
├── tetris/    (나중에)
└── racing/    (나중에)
```

### 소켓 연결

`hooks/useSocket.ts` 커스텀 훅으로 관리. 멀티 게임 페이지에서만 연결.

### 유저 플로우

```
게임 선택 → 로비 (방 목록) → 방 생성/참가 → 대기실 → 게임 플레이 → 결과
```

## 배포 전략

| 항목 | 프론트엔드 | 백엔드 |
|------|-----------|--------|
| 플랫폼 | Vercel | Railway |
| 배포 방식 | git push 자동 | git push 자동 |
| URL | mini-kame.vercel.app | kame-server.railway.app |
| 비용 | 기존 (무료) | 월 ~$5 |

### 환경변수

```bash
# 프론트엔드
NEXT_PUBLIC_SOCKET_URL=https://kame-server.railway.app

# 백엔드
PORT=4000
CORS_ORIGIN=https://mini-kame.vercel.app
```

## 확장 계획

- 동시접속 200명 초과 시: Railway 스케일 업
- 멀티 인스턴스 필요 시: Redis 도입 (Socket.IO Redis Adapter)
- 게임 추가: `socket/handlers/`에 핸들러 파일 추가, `(multi)/` 라우트 추가

## 규모 목표

- 방당 2-10명
- 전체 동시접속 ~200명
- 첫 게임: 멀티 칠판 → 이후 멀티 테트리스, 멀티 레이싱
