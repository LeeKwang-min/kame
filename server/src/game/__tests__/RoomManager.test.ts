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
