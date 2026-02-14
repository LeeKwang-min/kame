# Helicopter Game - Game Design

## Overview
자동 횡스크롤 동굴 비행 게임. Space를 누르면 상승, 떼면 하강. 동굴 벽에 닿으면 Game Over.

## Controls
| Key | Action |
|-----|--------|
| `S` | Start / Resume |
| `P` | Pause |
| `R` | Restart |
| `Space` | Hold to ascend, release to descend |

## Player
- 헬리콥터 (사각형 + 프로펠러 애니메이션)
- Space 누르는 동안 상승 속도 적용, 떼면 중력으로 하강
- 좌측 고정 위치 (x=120)

## Cave System
- 세그먼트 단위로 천장/바닥 높이 랜덤 생성
- 시간에 따라 통로 폭 감소 (난이도 증가)
- 스크롤 속도도 점진 증가

## Scoring
- 거리 기반 (속도에 비례)

## Canvas
- 800 x 400px
