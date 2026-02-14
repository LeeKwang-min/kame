# Geometry Dash - Game Design

## Overview
자동 횡스크롤 무한 러너. 점프 타이밍으로 장애물을 회피하며 최대한 멀리 진행하는 게임.

## Controls
| Key | Action |
|-----|--------|
| `S` | Start / Resume |
| `P` | Pause |
| `R` | Restart |
| `Space` / `ArrowUp` | Jump |

## Player
- 정사각형 캐릭터
- 점프 시 회전 애니메이션 (360도)
- 바닥에 있을 때만 점프 가능 (no double jump)
- 중력 기반 물리

## Obstacles (3 types)
1. **Spike (삼각형)** - 바닥 위치, 점프로 회피
2. **Block (사각형)** - 공중 위치, 타이밍 맞춰 통과
3. **Pit (구멍)** - 바닥 빈 구간, 점프로 건너기

## Difficulty System
- 시간 경과에 따라 스크롤 속도 증가
- 장애물 간격 점점 좁아짐
- 장애물 조합 패턴 복잡화

## Scoring
- 거리 기반 (프레임마다 증가, 속도 반영)
- 리더보드 연동

## Visual
- 레트로 네온 스타일
- 바닥 그리드 라인 스크롤 효과
- 충돌 시 파티클 폭발 이펙트

## Canvas
- 800 x 400px
