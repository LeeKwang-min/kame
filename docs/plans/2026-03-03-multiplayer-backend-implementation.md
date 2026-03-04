# 멀티플레이어 백엔드 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** kame에 WebSocket 기반 멀티플레이어 인프라를 구축하고, 첫 번째 멀티 게임으로 공유 칠판(Whiteboard)을 구현한다.

**Architecture:** 기존 kame 레포 안에 `server/`(백엔드)와 `shared/`(공유 타입)를 추가한다. 프론트엔드는 기존 구조 그대로 유지하며 `socket.io-client`만 추가한다. `app/(multi)/` 라우트 그룹에 멀티플레이어 게임을 배치한다. Room 관리는 인메모리로 처리하며, 추후 Redis로 확장 가능하게 설계한다.

**Tech Stack:** Express, Socket.IO, TypeScript (백엔드) / Next.js 16, socket.io-client, React 19 (프론트엔드)

**참조 문서:** `docs/plans/2026-03-03-multiplayer-backend-design.md`

**폴더 구조:**
```
kame/
├── app/              ← 기존 그대로
├── components/       ← 기존 그대로
├── lib/              ← 기존 그대로
├── hooks/            ← 기존 그대로
├── @types/           ← 기존 그대로
├── prisma/           ← 기존 그대로
├── server/           ← 새로 추가 (독립 package.json, 독립 배포)
│   ├── src/
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── socket/
│   │   │   ├── index.ts
│   │   │   └── handlers/
│   │   │       ├── room.ts
│   │   │       └── whiteboard.ts
│   │   └── game/
│   │       ├── Room.ts
│   │       ├── RoomManager.ts
│   │       └── __tests__/
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── shared/           ← 새로 추가 (공유 타입)
│   └── types/
│       ├── room.ts
│       └── whiteboard.ts
├── package.json      ← 기존 프론트엔드
└── next.config.ts
```

---

## Phase 1: 공유 타입 및 백엔드 초기화

### Task 1: shared/ 공유 타입 정의

**Files:**
- Create: `shared/types/room.ts`
- Create: `shared/types/whiteboard.ts`
- Create: `shared/types/index.ts`

**Step 1: 방(Room) 공유 타입 생성**

```typescript
// shared/types/room.ts
export type TMultiGameType = 'whiteboard' | 'tetris' | 'racing';

export type TRoomState = 'waiting' | 'playing' | 'finished';

export type TPlayer = {
  id: string;
  name: string;
  joinedAt: string;
};

export type TRoomInfo = {
  id: string;
  gameType: TMultiGameType;
  hostId: string;
  playerCount: number;
  maxPlayers: number;
  state: TRoomState;
  createdAt: string;
};

export type TRoomDetail = TRoomInfo & {
  players: TPlayer[];
};
```

**Step 2: 칠판(Whiteboard) 공유 타입 생성**

```typescript
// shared/types/whiteboard.ts
export type TStrokePoint = {
  x: number;
  y: number;
};

export type TStroke = {
  playerId: string;
  points: TStrokePoint[];
  color: string;
  width: number;
};

export type TWhiteboardState = {
  strokes: TStroke[];
};
```

**Step 3: index.ts 배럴 파일 생성**

```typescript
// shared/types/index.ts
export * from './room';
export * from './whiteboard';
```

**Step 4: 커밋**

```bash
git add shared/
git commit -m "feat: add shared types for multiplayer (room, whiteboard)"
```

---

### Task 2: server/ 프로젝트 초기화

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env.example`

**Step 1: server/ 디렉토리 생성 및 초기화**

```bash
mkdir -p server
cd server
yarn init -y
yarn add express socket.io cors dotenv nanoid@3
yarn add -D typescript @types/node @types/express @types/cors ts-node-dev vitest
```

> nanoid v3 사용 (v4는 ESM-only라 CommonJS와 비호환)

**Step 2: package.json 스크립트 설정**

```json
{
  "name": "kame-server",
  "version": "1.0.0",
  "private": true,
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Step 3: tsconfig.json 생성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "paths": {
      "@shared/*": ["../shared/*"]
    },
    "baseUrl": "."
  },
  "include": ["src/**/*", "../shared/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: .env.example 생성**

```bash
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

**Step 5: 서버 진입점 작성 후 실행 확인**

Run: `cd server && yarn dev`
Expected: 정상 실행 (다음 태스크에서 코드 작성)

**Step 6: 커밋**

```bash
cd .. && git add server/package.json server/tsconfig.json server/.env.example server/yarn.lock
git commit -m "chore: initialize server/ project with dependencies"
```

---

### Task 3: Express + Socket.IO 기본 서버

**Files:**
- Create: `server/src/config.ts`
- Create: `server/src/index.ts`

**Step 1: config.ts 생성**

```typescript
// server/src/config.ts
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
```

**Step 2: index.ts 생성**

```typescript
// server/src/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config';

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

httpServer.listen(config.port, () => {
  console.log(`[Server] Running on port ${config.port}`);
});

export { io };
```

**Step 3: 실행 확인**

Run: `cd server && yarn dev`
Expected: `[Server] Running on port 4000`

Run: `curl http://localhost:4000/health`
Expected: `{"status":"ok","timestamp":"..."}`

**Step 4: 커밋**

```bash
git add server/src/
git commit -m "feat: add Express + Socket.IO basic server"
```

---

## Phase 2: 백엔드 Room 관리

### Task 4: Room 클래스

**Files:**
- Create: `server/src/game/Room.ts`
- Create: `server/src/game/__tests__/Room.test.ts`

**Step 1: 테스트 작성**

```typescript
// server/src/game/__tests__/Room.test.ts
import { describe, it, expect } from 'vitest';
import { Room } from '../Room';

describe('Room', () => {
  it('방을 생성하면 호스트가 자동으로 참가한다', () => {
    const room = new Room('whiteboard', 'host-1', 'Player1', 8);
    expect(room.hostId).toBe('host-1');
    expect(room.players.size).toBe(1);
    expect(room.state).toBe('waiting');
  });

  it('플레이어가 참가할 수 있다', () => {
    const room = new Room('whiteboard', 'host-1', 'Player1', 8);
    const result = room.addPlayer('player-2', 'Player2');
    expect(result).toBe(true);
    expect(room.players.size).toBe(2);
  });

  it('최대 인원 초과 시 참가 불가', () => {
    const room = new Room('whiteboard', 'host-1', 'Player1', 2);
    room.addPlayer('player-2', 'Player2');
    const result = room.addPlayer('player-3', 'Player3');
    expect(result).toBe(false);
    expect(room.players.size).toBe(2);
  });

  it('플레이어가 퇴장할 수 있다', () => {
    const room = new Room('whiteboard', 'host-1', 'Player1', 8);
    room.addPlayer('player-2', 'Player2');
    room.removePlayer('player-2');
    expect(room.players.size).toBe(1);
  });

  it('호스트 퇴장 시 다음 플레이어가 호스트가 된다', () => {
    const room = new Room('whiteboard', 'host-1', 'Player1', 8);
    room.addPlayer('player-2', 'Player2');
    room.removePlayer('host-1');
    expect(room.hostId).toBe('player-2');
  });

  it('마지막 플레이어 퇴장 시 빈 방이 된다', () => {
    const room = new Room('whiteboard', 'host-1', 'Player1', 8);
    room.removePlayer('host-1');
    expect(room.isEmpty()).toBe(true);
  });

  it('toInfo()로 요약 정보를 반환한다', () => {
    const room = new Room('whiteboard', 'host-1', 'Player1', 8);
    const info = room.toInfo();
    expect(info.gameType).toBe('whiteboard');
    expect(info.playerCount).toBe(1);
    expect(info.maxPlayers).toBe(8);
    expect(info.state).toBe('waiting');
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `cd server && yarn test`
Expected: FAIL — `Room` 모듈 없음

**Step 3: Room 클래스 구현**

```typescript
// server/src/game/Room.ts
import { nanoid } from 'nanoid';
import {
  TMultiGameType,
  TPlayer,
  TRoomInfo,
  TRoomDetail,
  TRoomState,
} from '../../../shared/types';

export class Room {
  readonly id: string;
  readonly gameType: TMultiGameType;
  readonly maxPlayers: number;
  readonly createdAt: Date;
  readonly players: Map<string, TPlayer>;
  hostId: string;
  state: TRoomState;
  gameState: unknown;

  constructor(
    gameType: TMultiGameType,
    hostId: string,
    hostName: string,
    maxPlayers: number
  ) {
    this.id = nanoid(8);
    this.gameType = gameType;
    this.maxPlayers = maxPlayers;
    this.createdAt = new Date();
    this.players = new Map();
    this.hostId = hostId;
    this.state = 'waiting';
    this.gameState = null;

    this.players.set(hostId, {
      id: hostId,
      name: hostName,
      joinedAt: new Date().toISOString(),
    });
  }

  addPlayer(id: string, name: string): boolean {
    if (this.players.size >= this.maxPlayers) return false;
    if (this.players.has(id)) return false;
    this.players.set(id, { id, name, joinedAt: new Date().toISOString() });
    return true;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
    if (id === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value!;
    }
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  toInfo(): TRoomInfo {
    return {
      id: this.id,
      gameType: this.gameType,
      hostId: this.hostId,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      state: this.state,
      createdAt: this.createdAt.toISOString(),
    };
  }

  toDetail(): TRoomDetail {
    return {
      ...this.toInfo(),
      players: Array.from(this.players.values()),
    };
  }
}
```

**Step 4: 테스트 통과 확인**

Run: `cd server && yarn test`
Expected: 모든 테스트 PASS

**Step 5: 커밋**

```bash
git add server/src/game/
git commit -m "feat: add Room class with tests"
```

---

### Task 5: RoomManager 클래스

**Files:**
- Create: `server/src/game/RoomManager.ts`
- Create: `server/src/game/__tests__/RoomManager.test.ts`

**Step 1: 테스트 작성**

```typescript
// server/src/game/__tests__/RoomManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../RoomManager';

describe('RoomManager', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  it('방을 생성한다', () => {
    const room = manager.createRoom('whiteboard', 'host-1', 'Player1', 8);
    expect(room).toBeDefined();
    expect(room.gameType).toBe('whiteboard');
  });

  it('방 ID로 조회한다', () => {
    const room = manager.createRoom('whiteboard', 'host-1', 'Player1', 8);
    const found = manager.getRoom(room.id);
    expect(found).toBe(room);
  });

  it('게임 타입별 방 목록을 반환한다', () => {
    manager.createRoom('whiteboard', 'host-1', 'Player1', 8);
    manager.createRoom('whiteboard', 'host-2', 'Player2', 8);
    manager.createRoom('tetris', 'host-3', 'Player3', 4);
    const rooms = manager.getRoomsByType('whiteboard');
    expect(rooms).toHaveLength(2);
  });

  it('플레이어의 소켓 ID로 소속 방을 찾는다', () => {
    const room = manager.createRoom('whiteboard', 'host-1', 'Player1', 8);
    const found = manager.findRoomByPlayer('host-1');
    expect(found?.id).toBe(room.id);
  });

  it('빈 방을 삭제한다', () => {
    const room = manager.createRoom('whiteboard', 'host-1', 'Player1', 8);
    manager.removeRoom(room.id);
    expect(manager.getRoom(room.id)).toBeUndefined();
  });

  it('빈 방 자동 정리 (cleanupEmpty)', () => {
    const room = manager.createRoom('whiteboard', 'host-1', 'Player1', 8);
    room.removePlayer('host-1');
    manager.cleanupEmpty();
    expect(manager.getRoom(room.id)).toBeUndefined();
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `cd server && yarn test`
Expected: FAIL

**Step 3: RoomManager 구현**

```typescript
// server/src/game/RoomManager.ts
import { Room } from './Room';
import { TMultiGameType } from '../../../shared/types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(
    gameType: TMultiGameType,
    hostId: string,
    hostName: string,
    maxPlayers: number
  ): Room {
    const room = new Room(gameType, hostId, hostName, maxPlayers);
    this.rooms.set(room.id, room);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  removeRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  getRoomsByType(gameType: TMultiGameType): Room[] {
    return Array.from(this.rooms.values()).filter((r) => r.gameType === gameType);
  }

  findRoomByPlayer(playerId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.has(playerId)) return room;
    }
    return undefined;
  }

  cleanupEmpty(): void {
    for (const [id, room] of this.rooms) {
      if (room.isEmpty()) {
        this.rooms.delete(id);
      }
    }
  }

  get size(): number {
    return this.rooms.size;
  }
}
```

**Step 4: 테스트 통과 확인**

Run: `cd server && yarn test`
Expected: 모든 테스트 PASS

**Step 5: 커밋**

```bash
git add server/src/game/
git commit -m "feat: add RoomManager with tests"
```

---

### Task 6: Room 소켓 이벤트 핸들러

**Files:**
- Create: `server/src/socket/index.ts`
- Create: `server/src/socket/handlers/room.ts`
- Modify: `server/src/index.ts`

**Step 1: Room 이벤트 핸들러 구현**

```typescript
// server/src/socket/handlers/room.ts
import { Server, Socket } from 'socket.io';
import { RoomManager } from '../../game/RoomManager';
import { TMultiGameType } from '../../../../shared/types';

type TCreateRoomPayload = {
  gameType: TMultiGameType;
  playerName: string;
  maxPlayers?: number;
};

type TJoinRoomPayload = {
  roomId: string;
  playerName: string;
};

const DEFAULT_MAX_PLAYERS: Record<TMultiGameType, number> = {
  whiteboard: 8,
  tetris: 4,
  racing: 6,
};

export function registerRoomHandlers(
  io: Server,
  socket: Socket,
  roomManager: RoomManager
): void {
  socket.on('room:create', (payload: TCreateRoomPayload) => {
    const { gameType, playerName, maxPlayers } = payload;
    const max = maxPlayers || DEFAULT_MAX_PLAYERS[gameType] || 8;

    const existing = roomManager.findRoomByPlayer(socket.id);
    if (existing) {
      socket.emit('room:error', { message: '이미 다른 방에 참가 중입니다.' });
      return;
    }

    const room = roomManager.createRoom(gameType, socket.id, playerName, max);
    socket.join(room.id);
    socket.emit('room:created', { room: room.toDetail() });
  });

  socket.on('room:join', (payload: TJoinRoomPayload) => {
    const { roomId, playerName } = payload;
    const room = roomManager.getRoom(roomId);

    if (!room) {
      socket.emit('room:error', { message: '방을 찾을 수 없습니다.' });
      return;
    }
    if (room.state !== 'waiting') {
      socket.emit('room:error', { message: '이미 게임이 진행 중입니다.' });
      return;
    }

    const added = room.addPlayer(socket.id, playerName);
    if (!added) {
      socket.emit('room:error', { message: '방이 가득 찼습니다.' });
      return;
    }

    socket.join(room.id);
    socket.emit('room:joined', { room: room.toDetail() });
    socket.to(room.id).emit('room:player-joined', {
      player: room.players.get(socket.id),
      room: room.toDetail(),
    });
  });

  socket.on('room:leave', () => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room) return;

    room.removePlayer(socket.id);
    socket.leave(room.id);
    socket.emit('room:left');

    if (room.isEmpty()) {
      roomManager.removeRoom(room.id);
    } else {
      io.to(room.id).emit('room:player-left', {
        playerId: socket.id,
        room: room.toDetail(),
      });
    }
  });
}
```

**Step 2: 소켓 초기화 모듈**

```typescript
// server/src/socket/index.ts
import { Server } from 'socket.io';
import { RoomManager } from '../game/RoomManager';
import { registerRoomHandlers } from './handlers/room';

export const roomManager = new RoomManager();

export function initializeSocket(io: Server): void {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    registerRoomHandlers(io, socket, roomManager);

    socket.on('disconnect', () => {
      const room = roomManager.findRoomByPlayer(socket.id);
      if (room) {
        room.removePlayer(socket.id);
        io.to(room.id).emit('room:player-left', {
          playerId: socket.id,
          room: room.toDetail(),
        });
        if (room.isEmpty()) {
          roomManager.removeRoom(room.id);
        }
      }
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });

  // 5분마다 빈 방 정리
  setInterval(() => {
    roomManager.cleanupEmpty();
  }, 5 * 60 * 1000);
}
```

**Step 3: index.ts를 소켓 초기화 사용하도록 수정**

```typescript
// server/src/index.ts (전체 교체)
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config';
import { initializeSocket, roomManager } from './socket';

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/rooms/:gameType', (req, res) => {
  const gameType = req.params.gameType as any;
  const rooms = roomManager.getRoomsByType(gameType);
  res.json(rooms.map((r) => r.toInfo()));
});

const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
  },
});

initializeSocket(io);

httpServer.listen(config.port, () => {
  console.log(`[Server] Running on port ${config.port}`);
});
```

**Step 4: 서버 재시작 확인**

Run: `cd server && yarn dev`
Expected: 정상 실행

**Step 5: 커밋**

```bash
git add server/src/
git commit -m "feat: add room socket event handlers and REST API"
```

---

## Phase 3: 백엔드 칠판 게임 핸들러

### Task 7: 칠판 드로잉 이벤트 핸들러

**Files:**
- Create: `server/src/socket/handlers/whiteboard.ts`
- Modify: `server/src/socket/index.ts`

**Step 1: 칠판 이벤트 핸들러 구현**

```typescript
// server/src/socket/handlers/whiteboard.ts
import { Server, Socket } from 'socket.io';
import { RoomManager } from '../../game/RoomManager';
import { TStroke, TWhiteboardState } from '../../../../shared/types';

export function registerWhiteboardHandlers(
  io: Server,
  socket: Socket,
  roomManager: RoomManager
): void {
  socket.on('draw:stroke', (stroke: TStroke) => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room || room.gameType !== 'whiteboard') return;

    if (!room.gameState) {
      room.gameState = { strokes: [] } as TWhiteboardState;
    }
    (room.gameState as TWhiteboardState).strokes.push({
      ...stroke,
      playerId: socket.id,
    });

    socket.to(room.id).emit('draw:stroke', {
      ...stroke,
      playerId: socket.id,
    });
  });

  socket.on('draw:clear', () => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room || room.gameType !== 'whiteboard') return;

    room.gameState = { strokes: [] } as TWhiteboardState;
    io.to(room.id).emit('draw:clear');
  });

  socket.on('draw:undo', () => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room || room.gameType !== 'whiteboard') return;

    const state = room.gameState as TWhiteboardState;
    if (!state?.strokes) return;

    for (let i = state.strokes.length - 1; i >= 0; i--) {
      if (state.strokes[i].playerId === socket.id) {
        state.strokes.splice(i, 1);
        break;
      }
    }

    io.to(room.id).emit('draw:sync', { strokes: state.strokes });
  });

  socket.on('draw:request-sync', () => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room || room.gameType !== 'whiteboard') return;

    const state = (room.gameState as TWhiteboardState) || { strokes: [] };
    socket.emit('draw:sync', { strokes: state.strokes });
  });
}
```

**Step 2: socket/index.ts에 핸들러 등록**

`initializeSocket`의 connection 핸들러 안에 추가:

```typescript
import { registerWhiteboardHandlers } from './handlers/whiteboard';

// registerRoomHandlers 아래에 추가
registerWhiteboardHandlers(io, socket, roomManager);
```

**Step 3: 서버 재시작 확인**

Run: `cd server && yarn dev`
Expected: 정상 실행

**Step 4: 커밋**

```bash
git add server/src/socket/
git commit -m "feat: add whiteboard drawing event handlers"
```

---

## Phase 4: 백엔드 배포 설정

### Task 8: Dockerfile 및 Railway 배포

**Files:**
- Create: `server/Dockerfile`
- Create: `server/.dockerignore`

**Step 1: Dockerfile 생성**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY server/package.json server/yarn.lock ./server/
COPY shared/ ./shared/
RUN cd server && yarn install --frozen-lockfile
COPY server/tsconfig.json ./server/
COPY server/src/ ./server/src/
RUN cd server && yarn build

FROM node:20-alpine
WORKDIR /app
COPY server/package.json server/yarn.lock ./server/
RUN cd server && yarn install --frozen-lockfile --production
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/shared ./shared
EXPOSE 4000
CMD ["node", "server/dist/index.js"]
```

> 주의: shared/ 폴더도 빌드 컨텍스트에 포함해야 함. Railway에서 Root Directory를 프로젝트 루트(kame/)로 설정하고, Dockerfile 경로를 `server/Dockerfile`로 지정.

**Step 2: .dockerignore 생성**

```
server/node_modules
server/dist
server/.env
.git
```

**Step 3: 커밋**

```bash
git add server/Dockerfile server/.dockerignore
git commit -m "chore: add Dockerfile for server deployment"
```

**Step 4: Railway 배포 설정**

Railway에서:
1. kame 레포 연결
2. Dockerfile 경로: `server/Dockerfile`
3. 환경변수: `PORT=4000`, `CORS_ORIGIN=https://mini-kame.vercel.app`
4. 자동 배포 확인

---

## Phase 5: 프론트엔드 인프라

### Task 9: socket.io-client 및 useSocket 훅

**Files:**
- Modify: `package.json` (루트 — 프론트엔드)
- Create: `hooks/use-socket.ts`

**Step 1: 패키지 추가**

```bash
yarn add socket.io-client
```

**Step 2: useSocket 훅 생성**

```typescript
// hooks/use-socket.ts
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  return { socket: socketRef, isConnected, emit, on };
}
```

**Step 3: .env.example에 환경변수 추가**

```bash
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

**Step 4: 커밋**

```bash
git add hooks/use-socket.ts package.json yarn.lock
git commit -m "feat: add socket.io-client and useSocket hook"
```

---

### Task 10: 멀티플레이어 카테고리 추가

**Files:**
- Modify: `@types/game-meta.ts` — `TGameCategory`에 `'multiplayer'` 추가
- Modify: `lib/config.ts` — `CATEGORY_TABS`에 탭 + `MENU_LIST`에 칠판 추가
- Modify: `app/(main)/_components/MainCategoryTabs.tsx` — 아이콘 + 탭 추가
- Modify: `lib/i18n/locales/ko.ts` — Locale 타입 + 한국어 번역
- Modify: `lib/i18n/locales/en.ts` — 영어 번역

**Step 1: TGameCategory 수정**

`@types/game-meta.ts`:
```typescript
export type TGameCategory = 'arcade' | 'action' | 'puzzle' | 'reflex' | 'luck' | 'idle' | 'multiplayer';
```

**Step 2: CATEGORY_TABS + MENU_LIST 수정**

`lib/config.ts`:
- `CATEGORY_TABS` 끝에 추가: `{ id: 'Multiplayer', iconName: 'Users' as const },`
- `MENU_LIST`에 추가:
```typescript
{
  name: { kor: '멀티 칠판', eng: 'Multi Whiteboard' },
  href: '/whiteboard',
  category: 'Multiplayer',
  platform: 'both',
},
```

**Step 3: MainCategoryTabs 수정**

`app/(main)/_components/MainCategoryTabs.tsx`:
- import에 `Users` 추가
- `TAB_ICONS`에 `Users` 추가
- `TABS`에 `{ id: 'Multiplayer', iconName: 'Users', labelKey: 'multiplayer' as const }` 추가

**Step 4: 번역 추가**

`lib/i18n/locales/ko.ts`:
- Locale 타입의 `category`에 `multiplayer: string;` 추가
- `ko.category`에 `multiplayer: '멀티플레이',` 추가

`lib/i18n/locales/en.ts`:
- `en.category`에 `multiplayer: 'Multiplayer',` 추가

**Step 5: 커밋**

```bash
git add @types/game-meta.ts lib/config.ts app/(main)/_components/MainCategoryTabs.tsx lib/i18n/locales/ko.ts lib/i18n/locales/en.ts
git commit -m "feat: add Multiplayer category and whiteboard menu item"
```

---

### Task 11: (multi) 라우트 그룹 레이아웃

**Files:**
- Create: `app/(multi)/layout.tsx`

**Step 1: 레이아웃 생성**

```typescript
// app/(multi)/layout.tsx
import KameHeader from '@/components/common/KameHeader';

function MultiLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 sm:px-6 py-4 flex flex-col gap-6 sm:gap-10 items-center">
      <KameHeader title="Multiplayer" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default MultiLayout;
```

**Step 2: 커밋**

```bash
git add app/(multi)/layout.tsx
git commit -m "feat: add (multi) route group layout"
```

---

## Phase 6: 프론트엔드 칠판 로비

### Task 12: 칠판 설정 파일

**Files:**
- Create: `app/(multi)/whiteboard/_lib/config.ts`
- Create: `app/(multi)/whiteboard/_lib/types.ts`

**Step 1: config.ts 생성**

```typescript
// app/(multi)/whiteboard/_lib/config.ts
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const COLORS = [
  '#000000', '#FF0000', '#0000FF', '#00AA00',
  '#FF8800', '#8800FF', '#FF00AA', '#FFFFFF',
] as const;

export const BRUSH_SIZES = [2, 4, 8, 16] as const;

export const MAX_PLAYERS = 8;
```

**Step 2: types.ts — shared 타입 re-export**

```typescript
// app/(multi)/whiteboard/_lib/types.ts
export type {
  TStrokePoint,
  TStroke,
  TWhiteboardState,
  TPlayer,
  TRoomInfo,
  TRoomDetail,
} from '../../../../shared/types';
```

**Step 3: 커밋**

```bash
git add app/(multi)/whiteboard/_lib/
git commit -m "feat: add whiteboard config and types"
```

---

### Task 13: 칠판 로비 페이지

**Files:**
- Create: `app/(multi)/whiteboard/page.tsx`
- Create: `app/(multi)/whiteboard/_components/room-lobby.tsx`

**Step 1: room-lobby.tsx 생성**

```typescript
// app/(multi)/whiteboard/_components/room-lobby.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/use-socket';
import { TRoomDetail, TRoomInfo } from '../_lib/types';
import { MAX_PLAYERS } from '../_lib/config';

function RoomLobby() {
  const router = useRouter();
  const { isConnected, emit, on } = useSocket();
  const [rooms, setRooms] = useState<TRoomInfo[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isConnected) return;

    const fetchRooms = async () => {
      try {
        const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
        const res = await fetch(`${url}/rooms/whiteboard`);
        const data = await res.json();
        setRooms(data);
      } catch {
        // 서버 미연결
      }
    };

    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, [isConnected]);

  useEffect(() => {
    const offCreated = on('room:created', (data: { room: TRoomDetail }) => {
      setIsCreating(false);
      router.push(`/whiteboard/${data.room.id}`);
    });

    const offJoined = on('room:joined', (data: { room: TRoomDetail }) => {
      router.push(`/whiteboard/${data.room.id}`);
    });

    const offError = on('room:error', (data: { message: string }) => {
      setIsCreating(false);
      alert(data.message);
    });

    return () => {
      offCreated();
      offJoined();
      offError();
    };
  }, [on, router]);

  const handleCreateRoom = useCallback(() => {
    if (!playerName.trim()) return;
    setIsCreating(true);
    emit('room:create', {
      gameType: 'whiteboard',
      playerName: playerName.trim(),
      maxPlayers: MAX_PLAYERS,
    });
  }, [playerName, emit]);

  const handleJoinRoom = useCallback(
    (roomId: string) => {
      if (!playerName.trim()) {
        alert('이름을 입력해주세요.');
        return;
      }
      emit('room:join', { roomId, playerName: playerName.trim() });
    },
    [playerName, emit]
  );

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="text-sm text-arcade-muted">
          {isConnected ? '서버 연결됨' : '연결 중...'}
        </span>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="닉네임 입력"
          maxLength={10}
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="flex-1 px-4 py-2 bg-arcade-surface border border-arcade-border rounded-lg text-arcade-text placeholder:text-arcade-muted focus:outline-none focus:border-arcade-cyan"
        />
        <button
          onClick={handleCreateRoom}
          disabled={!isConnected || !playerName.trim() || isCreating}
          className="px-6 py-2 bg-arcade-cyan text-black font-bold rounded-lg disabled:opacity-40 hover:brightness-110 transition"
        >
          {isCreating ? '생성 중...' : '방 만들기'}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-arcade-text">방 목록</h2>
        {rooms.length === 0 ? (
          <p className="text-arcade-muted text-center py-8">
            열린 방이 없습니다. 새 방을 만들어보세요!
          </p>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between p-4 bg-arcade-surface border border-arcade-border rounded-lg"
            >
              <div>
                <span className="text-arcade-text font-mono text-sm">#{room.id}</span>
                <span className="ml-3 text-arcade-muted text-sm">
                  {room.playerCount}/{room.maxPlayers}명
                </span>
                <span className={`ml-3 text-xs px-2 py-0.5 rounded ${
                  room.state === 'waiting'
                    ? 'bg-green-900/40 text-green-400'
                    : 'bg-yellow-900/40 text-yellow-400'
                }`}>
                  {room.state === 'waiting' ? '대기 중' : '진행 중'}
                </span>
              </div>
              <button
                onClick={() => handleJoinRoom(room.id)}
                disabled={!isConnected || room.state !== 'waiting' || room.playerCount >= room.maxPlayers}
                className="px-4 py-1.5 bg-arcade-surface border border-arcade-cyan text-arcade-cyan rounded-lg disabled:opacity-40 hover:bg-arcade-cyan hover:text-black transition text-sm"
              >
                참가
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default RoomLobby;
```

**Step 2: page.tsx 생성**

```typescript
// app/(multi)/whiteboard/page.tsx
'use client';

import RoomLobby from './_components/room-lobby';

function WhiteboardLobbyPage() {
  return (
    <section className="w-full h-full flex justify-center">
      <RoomLobby />
    </section>
  );
}

export default WhiteboardLobbyPage;
```

**Step 3: 커밋**

```bash
git add app/(multi)/whiteboard/
git commit -m "feat: add whiteboard room lobby page"
```

---

## Phase 7: 프론트엔드 칠판 게임 플레이

### Task 14: 플레이어 목록 컴포넌트

**Files:**
- Create: `app/(multi)/whiteboard/_components/player-list.tsx`

**Step 1: player-list.tsx 생성**

```typescript
// app/(multi)/whiteboard/_components/player-list.tsx
'use client';

import { TPlayer } from '../_lib/types';

type TProps = {
  players: TPlayer[];
  hostId: string;
  myId: string;
};

const PLAYER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

function PlayerList({ players, hostId, myId }: TProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-bold text-arcade-muted uppercase tracking-wide">
        Players ({players.length})
      </h3>
      {players.map((player, i) => (
        <div
          key={player.id}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-arcade-surface/50"
        >
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }}
          />
          <span className="text-sm text-arcade-text truncate">
            {player.name}
            {player.id === myId && <span className="text-arcade-muted ml-1">(나)</span>}
          </span>
          {player.id === hostId && (
            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-900/40 text-yellow-400 rounded ml-auto">
              HOST
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default PlayerList;
```

**Step 2: 커밋**

```bash
git add app/(multi)/whiteboard/_components/player-list.tsx
git commit -m "feat: add player list component"
```

---

### Task 15: 칠판 캔버스 컴포넌트

**Files:**
- Create: `app/(multi)/whiteboard/_components/whiteboard-canvas.tsx`

**Step 1: whiteboard-canvas.tsx 생성**

```typescript
// app/(multi)/whiteboard/_components/whiteboard-canvas.tsx
'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, BRUSH_SIZES } from '../_lib/config';
import { TStroke, TStrokePoint } from '../_lib/types';

type TProps = {
  onStroke: (stroke: TStroke) => void;
  onClear: () => void;
  onUndo: () => void;
  remoteStrokes: TStroke[];
  myId: string;
};

function WhiteboardCanvas({ onStroke, onClear, onUndo, remoteStrokes, myId }: TProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<TStrokePoint[]>([]);
  const allStrokesRef = useRef<TStroke[]>([]);

  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (const stroke of allStrokesRef.current) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    allStrokesRef.current = remoteStrokes;
    redrawAll();
  }, [remoteStrokes, redrawAll]);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDrawingRef.current = true;
      const pos = getCanvasPos(e.clientX, e.clientY);
      currentPointsRef.current = [pos];
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getCanvasPos]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;

      const pos = getCanvasPos(e.clientX, e.clientY);
      const points = currentPointsRef.current;

      if (points.length > 0) {
        const prev = points[points.length - 1];
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }

      points.push(pos);
    },
    [color, brushSize, getCanvasPos]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const points = currentPointsRef.current;
    if (points.length < 2) return;

    const stroke: TStroke = {
      playerId: myId,
      points: [...points],
      color,
      width: brushSize,
    };

    allStrokesRef.current.push(stroke);
    onStroke(stroke);
    currentPointsRef.current = [];
  }, [myId, color, brushSize, onStroke]);

  // CSS transform 스케일링 (모바일 반응형)
  useEffect(() => {
    const updateScale = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const container = wrapper.parentElement;
      if (!container) return;
      const containerWidth = container.clientWidth;
      const scale = Math.min(containerWidth / CANVAS_WIDTH, 1);
      wrapper.style.transform = `scale(${scale})`;
      wrapper.style.transformOrigin = 'top center';
      wrapper.style.height = `${CANVAS_HEIGHT * scale}px`;
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition ${
                color === c ? 'border-arcade-cyan scale-110' : 'border-arcade-border'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex gap-1.5">
          {BRUSH_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => setBrushSize(size)}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition ${
                brushSize === size
                  ? 'border-arcade-cyan bg-arcade-cyan/20'
                  : 'border-arcade-border bg-arcade-surface'
              }`}
            >
              <div className="rounded-full bg-arcade-text" style={{ width: size, height: size }} />
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={onUndo}
            className="px-3 py-1.5 text-sm border border-arcade-border rounded-lg text-arcade-text hover:bg-arcade-surface transition"
          >
            되돌리기
          </button>
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-sm border border-red-800 rounded-lg text-red-400 hover:bg-red-900/20 transition"
          >
            전체 지우기
          </button>
        </div>
      </div>

      {/* 캔버스 */}
      <div className="w-full flex justify-center">
        <div ref={wrapperRef} style={{ width: CANVAS_WIDTH, minHeight: CANVAS_HEIGHT }}>
          <canvas
            ref={canvasRef}
            className="border border-arcade-border rounded-xl cursor-crosshair touch-none bg-white"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
      </div>
    </div>
  );
}

export default WhiteboardCanvas;
```

**Step 2: 커밋**

```bash
git add app/(multi)/whiteboard/_components/whiteboard-canvas.tsx
git commit -m "feat: add whiteboard canvas with drawing tools"
```

---

### Task 16: 칠판 게임 룸 페이지

**Files:**
- Create: `app/(multi)/whiteboard/[roomId]/page.tsx`

**Step 1: [roomId]/page.tsx 생성**

```typescript
// app/(multi)/whiteboard/[roomId]/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/use-socket';
import { useIsMobile } from '@/hooks/use-mobile';
import WhiteboardCanvas from '../_components/whiteboard-canvas';
import PlayerList from '../_components/player-list';
import { TRoomDetail, TStroke } from '../_lib/types';
import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

function WhiteboardRoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const { socket, isConnected, emit, on } = useSocket();
  const isMobile = useIsMobile();

  const [room, setRoom] = useState<TRoomDetail | null>(null);
  const [strokes, setStrokes] = useState<TStroke[]>([]);
  const [error, setError] = useState<string | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!isConnected || joinedRef.current) return;
    emit('draw:request-sync');
    joinedRef.current = true;
  }, [isConnected, emit]);

  useEffect(() => {
    const offStroke = on('draw:stroke', (stroke: TStroke) => {
      setStrokes((prev) => [...prev, stroke]);
    });
    const offSync = on('draw:sync', (data: { strokes: TStroke[] }) => {
      setStrokes(data.strokes);
    });
    const offClear = on('draw:clear', () => {
      setStrokes([]);
    });
    const offPlayerJoined = on('room:player-joined', (data: { room: TRoomDetail }) => {
      setRoom(data.room);
    });
    const offPlayerLeft = on('room:player-left', (data: { room: TRoomDetail }) => {
      setRoom(data.room);
    });
    const offClosed = on('room:closed', () => {
      setError('방이 닫혔습니다.');
      setTimeout(() => router.push('/whiteboard'), 2000);
    });
    const offError = on('room:error', (data: { message: string }) => {
      setError(data.message);
    });

    return () => {
      offStroke();
      offSync();
      offClear();
      offPlayerJoined();
      offPlayerLeft();
      offClosed();
      offError();
    };
  }, [on, router]);

  const handleStroke = useCallback((stroke: TStroke) => emit('draw:stroke', stroke), [emit]);
  const handleClear = useCallback(() => { emit('draw:clear'); setStrokes([]); }, [emit]);
  const handleUndo = useCallback(() => emit('draw:undo'), [emit]);
  const handleLeave = useCallback(() => { emit('room:leave'); router.push('/whiteboard'); }, [emit, router]);

  const myId = socket.current?.id || '';

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const playerListContent = room ? (
    <div className="flex flex-col gap-4">
      <PlayerList players={room.players} hostId={room.hostId} myId={myId} />
      <button
        onClick={handleLeave}
        className="w-full px-4 py-2 text-sm border border-red-800 rounded-lg text-red-400 hover:bg-red-900/20 transition"
      >
        방 나가기
      </button>
    </div>
  ) : null;

  if (isMobile) {
    return (
      <section className="w-full h-full flex flex-col items-center">
        <div className="w-full flex items-center justify-between px-2 pb-2">
          <span className="text-sm text-arcade-muted font-mono">#{params.roomId}</span>
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2 rounded-lg border border-arcade-border bg-arcade-surface text-arcade-text">
                <Menu size={20} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-arcade-bg border-arcade-border overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-arcade-text">Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 p-4">{playerListContent}</div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex-1 w-full">
          <WhiteboardCanvas
            onStroke={handleStroke}
            onClear={handleClear}
            onUndo={handleUndo}
            remoteStrokes={strokes}
            myId={myId}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <div className="flex-1 max-w-[850px]">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-arcade-muted font-mono">방 #{params.roomId}</span>
          {!isConnected && <span className="text-xs text-red-400">연결 끊김</span>}
        </div>
        <WhiteboardCanvas
          onStroke={handleStroke}
          onClear={handleClear}
          onUndo={handleUndo}
          remoteStrokes={strokes}
          myId={myId}
        />
      </div>
      <aside className="shrink-0 w-56">{playerListContent}</aside>
    </section>
  );
}

export default WhiteboardRoomPage;
```

**Step 2: 커밋**

```bash
git add app/(multi)/whiteboard/[roomId]/
git commit -m "feat: add whiteboard game room page with real-time drawing"
```

---

## Phase 8: 마무리

### Task 17: GameCard 아이콘 추가

**Files:**
- Modify: `components/common/GameCard.tsx`

**Step 1: GameCard에 칠판 아이콘 매핑 추가**

- lucide-react에서 `Pencil` import
- href → icon 매핑에 `'/whiteboard': Pencil` 추가

> 정확한 매핑 위치는 GameCard.tsx의 기존 패턴을 따를 것.

**Step 2: 커밋**

```bash
git add components/common/GameCard.tsx
git commit -m "feat: add whiteboard icon to GameCard"
```

---

### Task 18: 환경변수 및 빌드 확인

**Files:**
- Modify: `.env.example` (루트)

**Step 1: 환경변수 추가**

`.env.example`에:
```bash
# Multiplayer
NEXT_PUBLIC_SOCKET_URL=https://kame-server.railway.app
```

**Step 2: 프론트엔드 빌드 확인**

Run: `yarn build`
Expected: 빌드 성공 (socket.io-client import, shared 타입 import 정상)

**Step 3: 백엔드 빌드 확인**

Run: `cd server && yarn build`
Expected: 빌드 성공 (shared 타입 import 정상)

**Step 4: 커밋**

```bash
git add .env.example
git commit -m "chore: add NEXT_PUBLIC_SOCKET_URL to .env.example"
```

---

### Task 19: End-to-End 수동 테스트

**테스트 체크리스트:**

1. **서버 헬스체크**: `curl http://localhost:4000/health` → `{"status":"ok"}`
2. **방 생성**: `/whiteboard` → 닉네임 → "방 만들기" → `/whiteboard/[roomId]` 리다이렉트
3. **방 참가**: 다른 탭 → 방 목록에 표시 → "참가" → 같은 방 입장
4. **실시간 드로잉**: A가 그리면 B에게 보임, 역방향도 동일
5. **색상/굵기 변경**: 변경 후 그리기 → 상대방에게 올바르게 표시
6. **되돌리기**: 본인의 마지막 스트로크만 제거
7. **전체 지우기**: 모든 플레이어에게 빈 캔버스
8. **방 나가기**: 로비 이동, 상대방에게 퇴장 알림
9. **연결 끊김**: 탭 닫기 → 상대방에게 퇴장, 빈 방 자동 삭제
10. **모바일**: 터치 드로잉, 햄버거 메뉴, 반응형 스케일링

---

## 요약: 전체 커밋 순서

| # | 위치 | 커밋 메시지 |
|---|------|------------|
| 1 | shared/ | `feat: add shared types for multiplayer (room, whiteboard)` |
| 2 | server/ | `chore: initialize server/ project with dependencies` |
| 3 | server/ | `feat: add Express + Socket.IO basic server` |
| 4 | server/ | `feat: add Room class with tests` |
| 5 | server/ | `feat: add RoomManager with tests` |
| 6 | server/ | `feat: add room socket event handlers and REST API` |
| 7 | server/ | `feat: add whiteboard drawing event handlers` |
| 8 | server/ | `chore: add Dockerfile for server deployment` |
| 9 | 프론트 | `feat: add socket.io-client and useSocket hook` |
| 10 | 프론트 | `feat: add Multiplayer category and whiteboard menu item` |
| 11 | 프론트 | `feat: add (multi) route group layout` |
| 12 | 프론트 | `feat: add whiteboard config and types` |
| 13 | 프론트 | `feat: add whiteboard room lobby page` |
| 14 | 프론트 | `feat: add player list component` |
| 15 | 프론트 | `feat: add whiteboard canvas with drawing tools` |
| 16 | 프론트 | `feat: add whiteboard game room page with real-time drawing` |
| 17 | 프론트 | `feat: add whiteboard icon to GameCard` |
| 18 | 프론트 | `chore: add NEXT_PUBLIC_SOCKET_URL to .env.example` |
