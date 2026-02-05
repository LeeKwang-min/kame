import { CHOICES } from './config';
import { RPSChoice, RPSResult } from './types';

export const getRandomChoice = (): RPSChoice => {
  return CHOICES[Math.floor(Math.random() * CHOICES.length)];
};

export const determineResult = (
  playerChoice: RPSChoice,
  computerChoice: RPSChoice
): RPSResult => {
  if (playerChoice === computerChoice) {
    return 'tie';
  }

  // 가위 > 보, 바위 > 가위, 보 > 바위
  const winConditions: Record<RPSChoice, RPSChoice> = {
    scissors: 'paper',
    rock: 'scissors',
    paper: 'rock',
  };

  if (winConditions[playerChoice] === computerChoice) {
    return 'win';
  }

  return 'lose';
};

export const getResultMessage = (result: RPSResult): string => {
  switch (result) {
    case 'win':
      return 'WIN!';
    case 'lose':
      return 'LOSE!';
    case 'tie':
      return 'DRAW!';
  }
};

export const getResultColor = (result: RPSResult): string => {
  switch (result) {
    case 'win':
      return '#00FF00';
    case 'lose':
      return '#FF0000';
    case 'tie':
      return '#FFFF00';
  }
};
