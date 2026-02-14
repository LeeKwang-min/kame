# Downwell - Game Design

## Overview
수직 하강 액션 게임. 좌우 이동 + 아래로 슈팅으로 적을 처치하며 최대한 깊이 내려감.

## Controls
| Key | Action |
|-----|--------|
| `S` | Start / Resume |
| `P` | Pause |
| `R` | Restart |
| `ArrowLeft / ArrowRight` | Move left/right |
| `Space` | Shoot downward (airborne only) |

## Player
- 자동 낙하 + 좌우 이동
- 플랫폼에 착지 가능
- HP 3칸
- 공중에서 Space로 아래 슈팅 (탄약 제한, 착지 시 충전)

## Enemies
- 플랫폼 위에서 좌우 이동
- 위에서 밟으면 처치 + 바운스
- 측면 충돌 시 HP -1

## Platforms
- 랜덤 생성, 위로 스크롤
- 일부 플랫폼에 적 배치

## Scoring
- 하강 깊이 + 적 처치 보너스

## Canvas
- 400 x 600px (수직 비율)
