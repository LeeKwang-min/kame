import { TBall, TPaddle, TDifficulty } from './types';

export const updateAI = (
  paddle: TPaddle,
  ball: TBall,
  difficulty: TDifficulty,
) => {
  const paddleCenter = paddle.y + paddle.height / 2;
  const diff = ball.y - paddleCenter;

  // 난이도에 따른 반응 속도
  const speed = { easy: 2, normal: 4, hard: 6 }[difficulty];

  // 난이도에 따른 "실수" 확률
  const errorChance = { easy: 0.3, normal: 0.1, hard: 0.02 }[difficulty];

  if (Math.random() > errorChance) {
    if (diff > 10) paddle.y += speed;
    if (diff < -10) paddle.y -= speed;
  }
};
