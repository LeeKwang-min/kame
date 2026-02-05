<div align="center">

```
██╗  ██╗ █████╗ ███╗   ███╗███████╗
██║ ██╔╝██╔══██╗████╗ ████║██╔════╝
█████╔╝ ███████║██╔████╔██║█████╗
██╔═██╗ ██╔══██║██║╚██╔╝██║██╔══╝
██║  ██╗██║  ██║██║ ╚═╝ ██║███████╗
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝
```

### *Retro Arcade Game Platform*

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

---

### **[🎮 PLAY NOW](https://mini-kame.vercel.app/)**

*INSERT COIN TO START*

</div>

<br/>

## 🕹️ About

**KAME**는 브라우저에서 즐길 수 있는 레트로 아케이드 게임 플랫폼입니다.
클래식 게임부터 운빨 시뮬레이션까지, 다양한 미니게임을 제공합니다.

<br/>

## 🎮 Games

### Arcade Classics

| Game | Description |
|:----:|:------------|
| **Tetris** | 떨어지는 블록을 쌓아 줄을 완성하세요 |
| **Snake** | 뱀을 조종해 먹이를 먹고 성장하세요 |
| **Pac-Man** | 유령을 피해 모든 점을 먹으세요 |
| **Breakout** | 공을 튕겨 벽돌을 깨뜨리세요 |
| **Pong** | 클래식 탁구 게임 |
| **Asteroid** | 소행성을 피하고 파괴하세요 |
| **Space Invaders** | 침략자를 막아내세요 |
| **Missile Command** | 미사일로 도시를 방어하세요 |

### Action & Reflex

| Game | Description |
|:----:|:------------|
| **Flappy Bird** | 파이프 사이를 날아가세요 |
| **Dino** | 장애물을 뛰어넘으세요 |
| **Doodle Jump** | 점프하며 높이 올라가세요 |
| **Platformer** | 발판을 밟고 올라가세요 |
| **Dodge** | 떨어지는 물체를 피하세요 |
| **Burger Stack** | 주문서대로 햄버거를 쌓으세요 |

### Puzzle & Strategy

| Game | Description |
|:----:|:------------|
| **2048** | 숫자를 합쳐 2048을 만드세요 |
| **Kero33** | 33을 외치면 지는 게임 |

### Good Luck Simulation

| Game | Description |
|:----:|:------------|
| **Slot Machine** | 슬롯 머신 시뮬레이션 |
| **Roulette** | 룰렛 시뮬레이션 |
| **Enhance** | 강화 시뮬레이션 |
| **High Low** | 하이로우 카드 게임 |

### Utility

| Game | Description |
|:----:|:------------|
| **RPS** | 가위바위보 |

<br/>

## 🏆 Features

- **🎯 Leaderboard** - 전 세계 플레이어와 점수 경쟁
- **🔐 Google OAuth** - 간편한 로그인으로 기록 저장
- **📱 Responsive** - PC와 모바일 모두 지원
- **🌙 Dark Mode** - 눈이 편한 다크 테마

<br/>

## 🛠️ Tech Stack

```
Frontend     Next.js 16 · React 19 · TypeScript · Tailwind CSS 4
Backend      Next.js API Routes · Prisma ORM
Database     PostgreSQL (Neon)
Auth         NextAuth.js v5 (Google OAuth)
Game Engine  Canvas API · Phaser 3
Animation    Motion
State        React Query
```

<br/>

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Yarn or npm
- PostgreSQL database (Neon recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/kame.git
cd kame

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env
# Edit .env with your database and OAuth credentials

# Run database migrations
npx prisma migrate dev

# Start development server
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to play!

<br/>

## 📁 Project Structure

```
kame/
├── app/
│   ├── (canvas)/          # Game pages
│   │   ├── tetris/
│   │   ├── snake/
│   │   └── ...
│   ├── (main)/            # Main page
│   ├── (mypage)/          # User profile
│   └── api/               # API routes
├── components/            # Shared components
├── lib/
│   └── game/              # Game utilities
├── prisma/                # Database schema
└── service/               # API services
```

<br/>

## 🎨 Design Philosophy

KAME는 **Retro-Arcade Modern** 테마를 따릅니다:
- 다크 배경에 네온 액센트 (시안, 마젠타)
- 픽셀 폰트와 모던 타이포그래피의 조화
- 미니멀하면서도 게임다운 분위기

<br/>

---

<div align="center">

**GAME OVER**

*Press R to restart*

<br/>

Made with ❤️ and ☕

</div>
