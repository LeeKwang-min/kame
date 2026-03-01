import Phaser from 'phaser';
import {
  FRUIT_CONFIG,
  GAME_WIDTH,
  GAME_HEIGHT,
  WALL_THICKNESS,
  CONTAINER_TOP,
  CONTAINER_LEFT,
  CONTAINER_RIGHT,
  CONTAINER_BOTTOM,
  DROP_Y,
  DROP_MIN_X,
  DROP_MAX_X,
  DROP_COOLDOWN_MS,
  MAX_DROP_LEVEL,
  PHYSICS_CONFIG,
} from '../config';
import { TSuikaCallbacks } from '../types';

interface FruitEntry {
  body: MatterJS.BodyType;
  image: Phaser.GameObjects.Image;
  text: Phaser.GameObjects.Text;
  level: number;
}

export class GameScene extends Phaser.Scene {
  // Fruit tracking
  private fruitMap: Map<number, FruitEntry> = new Map();

  // Game state
  private score: number = 0;
  private currentLevel: number = 0;
  private nextLevel: number = 0;
  private dropX: number = GAME_WIDTH / 2;
  private canDrop: boolean = false;
  private dropCooldownTimer: number = 0;
  private isGameOver: boolean = false;
  private hasStarted: boolean = false;
  private isWaitingToStart: boolean = true;

  // Deadline tracking — 드롭 직후 잠시 체크 안 함
  private dropGraceTimer: number = 0;

  // Visual elements
  private previewCircle!: Phaser.GameObjects.Arc;
  private previewEmoji!: Phaser.GameObjects.Text;
  private guideLine!: Phaser.GameObjects.Line;
  private deadlineLine!: Phaser.GameObjects.Graphics;
  private startOverlay!: Phaser.GameObjects.Container;

  // Container walls (stored for category filtering)
  private wallCategory: number = 0;
  private fruitCategory: number = 0;

  // Input
  private keyLeft!: Phaser.Input.Keyboard.Key | null;
  private keyRight!: Phaser.Input.Keyboard.Key | null;
  private keySpace!: Phaser.Input.Keyboard.Key | null;

  // Merging lock to prevent double-merging
  private mergingBodies: Set<number> = new Set();

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.resetState();
    this.createContainer();
    this.createDeadline();
    this.createPreview();
    this.setupInput();
    this.setupCollisions();
    this.prepareNextFruit();
    this.showStartScreen();
  }

  private resetState() {
    this.fruitMap = new Map();
    this.mergingBodies = new Set();
    this.score = 0;
    this.currentLevel = 0;
    this.nextLevel = Phaser.Math.Between(0, MAX_DROP_LEVEL);
    this.dropX = GAME_WIDTH / 2;
    this.canDrop = false;
    this.dropCooldownTimer = 0;
    this.isGameOver = false;
    this.hasStarted = false;
    this.isWaitingToStart = true;
    this.dropGraceTimer = 0;
  }

  // --- Start Screen ---

  private showStartScreen() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 40;

    this.startOverlay = this.add.container(0, 0).setDepth(50);

    // 반투명 배경
    const bg = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xFFF8E7, 0.85);
    this.startOverlay.add(bg);

    // 타이틀
    const title = this.add.text(cx, cy - 80, '🍉 수박 게임', {
      fontSize: '36px', color: '#5D4037', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.startOverlay.add(title);

    // 규칙 설명
    const rules = this.add.text(cx, cy, '같은 과일을 합쳐서\n더 큰 과일을 만들어보세요!', {
      fontSize: '16px', color: '#8D6E63', fontFamily: 'monospace', align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);
    this.startOverlay.add(rules);

    // 시작 안내
    const startText = this.add.text(cx, cy + 80, 'Click / Tap to Start', {
      fontSize: '20px', color: '#D4A574', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.startOverlay.add(startText);

    // 깜빡이는 효과
    this.tweens.add({
      targets: startText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // 키보드 조작 안내
    const controlsText = this.add.text(cx, cy + 130, '← → : 이동  |  Space : 드롭', {
      fontSize: '13px', color: '#BCAAA4', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.startOverlay.add(controlsText);

    // 미리보기 숨기기
    this.previewCircle.setVisible(false);
    this.previewEmoji.setVisible(false);
    this.guideLine.setVisible(false);
  }

  private startGame() {
    if (!this.isWaitingToStart) return;
    this.isWaitingToStart = false;
    this.canDrop = true;
    this.hasStarted = false;

    // 시작 화면 제거
    this.startOverlay.destroy();

    // 미리보기 표시
    this.previewCircle.setVisible(true);
    this.previewEmoji.setVisible(true);
    this.guideLine.setVisible(true);
    this.updatePreview();

    this.callGameStart();
  }

  private callGameStart() {
    const callbacks = this.registry.get('callbacks') as TSuikaCallbacks | undefined;
    if (callbacks?.onGameStart) {
      callbacks.onGameStart().catch((err) => {
        console.error('Failed to create game session:', err);
      });
    }
  }

  // --- Container (walls & floor) ---

  private createContainer() {
    const wallColor = 0xd4a574;
    const floorColor = 0xc4955a;

    // Left wall — 물리 벽은 화면 상단(0)부터 바닥까지, 시각적 벽은 CONTAINER_TOP부터만
    const leftWallX = CONTAINER_LEFT - WALL_THICKNESS / 2;
    const physicsWallHeight = CONTAINER_BOTTOM;
    const physicsWallCenterY = physicsWallHeight / 2;

    this.matter.add.rectangle(leftWallX, physicsWallCenterY, WALL_THICKNESS, physicsWallHeight, {
      isStatic: true,
      label: 'leftWall',
    });

    const visibleWallHeight = CONTAINER_BOTTOM - CONTAINER_TOP;
    const visibleWallCenterY = CONTAINER_TOP + visibleWallHeight / 2;
    this.add
      .rectangle(leftWallX, visibleWallCenterY, WALL_THICKNESS, visibleWallHeight, wallColor)
      .setDepth(1);

    // Right wall — 동일하게 물리 벽은 상단까지 연장
    const rightWallX = CONTAINER_RIGHT + WALL_THICKNESS / 2;
    this.matter.add.rectangle(rightWallX, physicsWallCenterY, WALL_THICKNESS, physicsWallHeight, {
      isStatic: true,
      label: 'rightWall',
    });
    this.add
      .rectangle(rightWallX, visibleWallCenterY, WALL_THICKNESS, visibleWallHeight, wallColor)
      .setDepth(1);

    // Floor
    const floorY = CONTAINER_BOTTOM + WALL_THICKNESS / 2;
    const floorWidth = CONTAINER_RIGHT - CONTAINER_LEFT + WALL_THICKNESS * 2;
    this.matter.add.rectangle(GAME_WIDTH / 2, floorY, floorWidth, WALL_THICKNESS, {
      isStatic: true,
      label: 'floor',
    });
    this.add
      .rectangle(GAME_WIDTH / 2, floorY, floorWidth, WALL_THICKNESS, floorColor)
      .setDepth(1);
  }

  // --- Deadline ---

  private createDeadline() {
    this.deadlineLine = this.add.graphics();
    this.deadlineLine.setDepth(2);
    this.drawDeadline(0xe74c3c, 0.35);
  }

  private drawDeadline(color: number, alpha: number) {
    this.deadlineLine.clear();
    this.deadlineLine.lineStyle(2, color, alpha);

    const dashLength = 10;
    const gapLength = 8;
    let x = CONTAINER_LEFT;
    while (x < CONTAINER_RIGHT) {
      const endX = Math.min(x + dashLength, CONTAINER_RIGHT);
      this.deadlineLine.lineBetween(x, CONTAINER_TOP, endX, CONTAINER_TOP);
      x += dashLength + gapLength;
    }
  }

  // --- Preview (drop indicator) ---

  private createPreview() {
    // Guide line (vertical dashed effect via a thin line)
    this.guideLine = this.add
      .line(0, 0, 0, 0, 0, 0, 0xc4955a, 0.3)
      .setOrigin(0, 0)
      .setDepth(0);

    // Preview circle
    const fruit = FRUIT_CONFIG[this.currentLevel];
    this.previewCircle = this.add
      .circle(this.dropX, DROP_Y, fruit.radius, fruit.color, 0.4)
      .setDepth(3);

    // Preview emoji
    this.previewEmoji = this.add
      .text(this.dropX, DROP_Y, fruit.emoji, {
        fontSize: `${Math.max(fruit.radius * 0.8, 12)}px`,
      })
      .setOrigin(0.5)
      .setAlpha(0.6)
      .setDepth(3);
  }

  private updatePreview() {
    const fruit = FRUIT_CONFIG[this.currentLevel];
    this.previewCircle.setPosition(this.dropX, DROP_Y);
    this.previewCircle.setRadius(fruit.radius);
    this.previewCircle.setFillStyle(fruit.color, 0.4);

    this.previewEmoji.setPosition(this.dropX, DROP_Y);
    this.previewEmoji.setText(fruit.emoji);
    this.previewEmoji.setFontSize(Math.max(fruit.radius * 0.8, 12));

    // Guide line from preview down to container
    this.guideLine.setTo(this.dropX, DROP_Y + fruit.radius, this.dropX, CONTAINER_TOP);
  }

  // --- Input ---

  private setupInput() {
    // Keyboard
    if (this.input.keyboard) {
      this.keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
      this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    } else {
      this.keyLeft = null;
      this.keyRight = null;
      this.keySpace = null;
    }

    // Pointer (mouse & touch)
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver || this.isWaitingToStart) return;
      this.dropX = Phaser.Math.Clamp(pointer.x, DROP_MIN_X, DROP_MAX_X);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;
      if (this.isWaitingToStart) {
        this.startGame();
        return;
      }
      this.dropX = Phaser.Math.Clamp(pointer.x, DROP_MIN_X, DROP_MAX_X);
      this.dropFruit();
    });
  }

  // --- Fruit spawning ---

  private spawnFruit(x: number, y: number, level: number, isDropped: boolean = false): FruitEntry | null {
    if (level >= FRUIT_CONFIG.length) return null;

    const fruit = FRUIT_CONFIG[level];
    const textureKey = fruit.texture || `fruit_${level}`;

    // Create the image
    const image = this.add.image(x, y, textureKey);
    image.setDisplaySize(fruit.radius * 2, fruit.radius * 2);
    image.setDepth(2);

    // Create Matter.js body
    const body = this.matter.add.circle(x, y, fruit.radius, {
      restitution: PHYSICS_CONFIG.restitution,
      friction: PHYSICS_CONFIG.friction,
      frictionStatic: PHYSICS_CONFIG.frictionStatic,
      density: PHYSICS_CONFIG.density,
      label: `fruit_${level}`,
      plugin: { isFruit: true, level },
    });

    // Emoji text overlay
    const text = this.add
      .text(x, y, fruit.emoji, {
        fontSize: `${Math.max(fruit.radius * 0.8, 12)}px`,
      })
      .setOrigin(0.5)
      .setDepth(2);

    const entry: FruitEntry = { body, image, text, level };
    this.fruitMap.set(body.id, entry);

    return entry;
  }

  private dropFruit() {
    if (!this.canDrop || this.isGameOver) return;

    this.hasStarted = true;
    this.canDrop = false;
    this.dropCooldownTimer = DROP_COOLDOWN_MS;
    this.dropGraceTimer = 800; // 드롭 직후 0.8초간 데드라인 체크 유예

    this.spawnFruit(this.dropX, DROP_Y, this.currentLevel, true);

    // Score event for UIScene
    this.events.emit('updateScore', this.score);

    this.prepareNextFruit();
  }

  private prepareNextFruit() {
    this.currentLevel = this.nextLevel;
    this.nextLevel = Phaser.Math.Between(0, MAX_DROP_LEVEL);
    this.events.emit('updateNext', this.nextLevel);
    this.updatePreview();
  }

  // --- Collision / Merging ---

  private setupCollisions() {
    this.matter.world.on(
      'collisionstart',
      (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
        for (const pair of event.pairs) {
          this.handleCollision(pair.bodyA, pair.bodyB);
        }
      }
    );
  }

  private handleCollision(bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType) {
    const fruitA = this.fruitMap.get(bodyA.id);
    const fruitB = this.fruitMap.get(bodyB.id);

    if (!fruitA || !fruitB) return;
    if (fruitA.level !== fruitB.level) return;

    // Prevent double-merging
    if (this.mergingBodies.has(bodyA.id) || this.mergingBodies.has(bodyB.id)) return;
    this.mergingBodies.add(bodyA.id);
    this.mergingBodies.add(bodyB.id);

    const level = fruitA.level;
    const midX = (bodyA.position.x + bodyB.position.x) / 2;
    const midY = (bodyA.position.y + bodyB.position.y) / 2;

    // Remove both fruits
    this.removeFruit(bodyA.id);
    this.removeFruit(bodyB.id);

    // Add score
    const nextLevel = level + 1;
    if (nextLevel < FRUIT_CONFIG.length) {
      this.score += FRUIT_CONFIG[nextLevel].score;
    } else {
      // Max level merge (watermelon + watermelon): extra score, no new fruit
      this.score += FRUIT_CONFIG[level].score * 2;
    }
    this.events.emit('updateScore', this.score);

    // Spawn next level fruit (unless max)
    if (nextLevel < FRUIT_CONFIG.length) {
      // Use a short delay to avoid physics engine issues
      this.time.delayedCall(10, () => {
        this.spawnFruit(midX, midY, nextLevel);
      });
    }
  }

  private removeFruit(bodyId: number) {
    const entry = this.fruitMap.get(bodyId);
    if (!entry) return;

    this.matter.world.remove(entry.body);
    entry.image.destroy();
    entry.text.destroy();
    this.fruitMap.delete(bodyId);
    this.mergingBodies.delete(bodyId);
  }

  // --- Deadline check ---

  private checkDeadline(delta: number) {
    if (!this.hasStarted || this.isGameOver) return;

    // 드롭 직후 짧은 유예 (과일이 낙하 시작하기 전)
    if (this.dropGraceTimer > 0) {
      this.dropGraceTimer -= delta;
      return;
    }

    for (const [, entry] of this.fruitMap) {
      const body = entry.body;
      const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);

      // 아직 빠르게 움직이는 과일은 제외 (낙하/합성 반동 중)
      if (speed > 1) continue;

      // 과일 상단이 데드라인을 넘었으면 즉시 게임 오버
      const fruitTop = body.position.y - FRUIT_CONFIG[entry.level].radius;
      if (fruitTop < CONTAINER_TOP) {
        this.drawDeadline(0xff0000, 1);
        this.gameOver();
        return;
      }
    }
  }

  // --- Game Over ---

  private gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    // Hide preview
    this.previewCircle.setVisible(false);
    this.previewEmoji.setVisible(false);
    this.guideLine.setVisible(false);

    // Stop UIScene and start GameOverScene
    this.scene.stop('UIScene');
    this.scene.launch('GameOverScene', { score: this.score });
  }

  // --- Update loop ---

  update(_time: number, delta: number) {
    if (this.isGameOver || this.isWaitingToStart) return;

    // Drop cooldown
    if (!this.canDrop) {
      this.dropCooldownTimer -= delta;
      if (this.dropCooldownTimer <= 0) {
        this.canDrop = true;
        this.dropCooldownTimer = 0;
      }
    }

    // Keyboard input for dropper movement
    const moveSpeed = 5;
    if (this.keyLeft?.isDown) {
      this.dropX = Math.max(this.dropX - moveSpeed, DROP_MIN_X);
    }
    if (this.keyRight?.isDown) {
      this.dropX = Math.min(this.dropX + moveSpeed, DROP_MAX_X);
    }
    if (this.keySpace && Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      this.dropFruit();
    }

    // Update preview position
    this.updatePreview();

    // Sync fruit visuals with physics bodies
    for (const [, entry] of this.fruitMap) {
      const { body, image, text } = entry;
      image.setPosition(body.position.x, body.position.y);
      image.setRotation(body.angle);
      text.setPosition(body.position.x, body.position.y);
      text.setRotation(body.angle);
    }

    // Deadline check
    this.checkDeadline(delta);
  }
}
