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
