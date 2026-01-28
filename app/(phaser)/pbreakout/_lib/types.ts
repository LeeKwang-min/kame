export interface GameData {
  score: number; // 게임 오버 시 씬 간 데이터 전달용
}

/**
 *
 * Phaser는 Phaser.Physics.Arcade.Sprite, Phaser.GameObjects.Text 등 자체 타입을 제공합니다
 * Canvas 버전처럼 TBall, TPaddle, TBrick 타입을 별도로 정의할 필요가 없습니다
 * 씬(Scene) 간 데이터 전달 시 사용할 인터페이스만 정의합니다
 *
 */
