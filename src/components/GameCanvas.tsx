import React, { useRef, useEffect } from 'react';
import { soundManager } from '../utils/audio';

// --- TYPES ---

export interface HammerConfig {
  headType: 'sledge' | 'mallet';
  color: 'classic' | 'gold' | 'fire' | 'void';
  handleType: 'wood' | 'tape' | 'metal';
}

interface GameCanvasProps {
  onScoreUpdate: (score: number) => void;
  onTimeUpdate: (time: number) => void;
  onGameOver: () => void;
  onMissionUpdate: (desc: string, progress: string) => void;
  onComboUpdate: (combo: number) => void;
  onPowerUpdate: (charge: number) => void;
  powerRequested: boolean;
  onPowerExecuted: () => void;
  hammerConfig: HammerConfig;
  isPaused: boolean;
}

type EntityType = 'normal' | 'fast' | 'mine' | 'slow';
type MissionType = 'streak' | 'hunt_fast' | 'hunt_any';

interface Mission {
  type: MissionType;
  goal: number;
  current: number;
  description: string;
}

// --- BACKGROUND CLASSES ---

class ComicPanel {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  color: string;
  opacity: number;

  constructor(width: number, height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.w = 100 + Math.random() * 150;
    this.h = this.w * (0.6 + Math.random() * 0.4);
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.rotation = Math.random() * Math.PI * 2;
    this.vRot = (Math.random() - 0.5) * 0.005;
    const colors = ['rgba(255, 255, 255, 0.1)', 'rgba(0, 191, 255, 0.05)', 'rgba(255, 69, 0, 0.05)'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.opacity = 0.1 + Math.random() * 0.1;
  }

  update(width: number, height: number) {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.vRot;
    if (this.x < -this.w) this.x = width;
    if (this.x > width) this.x = -this.w;
    if (this.y < -this.h) this.y = height;
    if (this.y > height) this.y = -this.h;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = `rgba(0,0,0,${this.opacity})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-this.w / 2, -this.h / 2, this.w, this.h);
    ctx.fill();
    ctx.stroke();
    ctx.clip();
    ctx.strokeStyle = `rgba(0,0,0,${this.opacity * 0.5})`;
    for (let i = -this.w; i < this.w; i += 15) {
      ctx.beginPath();
      ctx.moveTo(i, -this.h);
      ctx.lineTo(i + 50, this.h);
      ctx.stroke();
    }
    ctx.restore();
  }
}

class Cloud {
  x: number;
  baseY: number;
  y: number;
  speed: number;
  size: number;
  puffOffsets: { x: number, y: number, r: number }[];

  constructor(width: number, height: number) {
    this.x = Math.random() * width;
    this.baseY = Math.random() * (height * 0.4);
    this.y = this.baseY;
    this.speed = Math.random() * 0.2 + 0.1;
    this.size = Math.random() * 0.5 + 0.5;
    this.puffOffsets = [];
    const puffs = Math.floor(Math.random() * 3) + 3;
    for (let i = 0; i < puffs; i++) {
      this.puffOffsets.push({
        x: (Math.random() - 0.5) * 50,
        y: (Math.random() - 0.5) * 30,
        r: 25 + Math.random() * 20
      });
    }
  }

  update(width: number, time: number) {
    this.x += this.speed;
    if (this.x > width + 150) this.x = -150;
    this.y = this.baseY + Math.sin(time * 0.0005 + this.x * 0.01) * 15;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.size, this.size);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    this.puffOffsets.forEach(puff => {
      ctx.arc(puff.x, puff.y, puff.r, 0, Math.PI * 2);
    });
    ctx.fill();
    ctx.restore();
  }
}

// --- GAME ENTITIES ---

class Entity {
  x: number;
  y: number;
  radius: number;
  type: EntityType;
  wobble: number;
  vx: number;
  vy: number;
  color: string;
  isMissionTarget: boolean = false;

  constructor(width: number, height: number, difficulty: number = 0, missionType?: MissionType) {
    this.x = Math.random() * (width - 80) + 40;
    this.y = Math.random() * (height - 80) + 40;
    this.wobble = Math.random() * 100;
    this.radius = 35;

    // Mission-Aware Spawning
    let mineChance = 0.12 + (difficulty * 0.15);
    let fastChance = (missionType === 'hunt_fast') ? 0.40 : 0.20;
    let slowChance = 0.10;

    const rand = Math.random();
    if (rand < mineChance) {
      this.type = 'mine';
      this.color = '#222';
      const speedMult = 1 + difficulty;
      this.vx = (Math.random() - 0.5) * 3 * speedMult;
      this.vy = (Math.random() - 0.5) * 3 * speedMult;
      this.radius = 40;
    } else if (rand < mineChance + fastChance) {
      this.type = 'fast';
      this.color = '#FF4500';
      this.vx = (Math.random() - 0.5) * (9 + difficulty * 7);
      this.vy = (Math.random() - 0.5) * (9 + difficulty * 7);
      this.radius = 25;
      if (missionType === 'hunt_fast' || missionType === 'hunt_any') this.isMissionTarget = true;
    } else if (rand < mineChance + fastChance + slowChance) {
      this.type = 'slow';
      this.color = '#32CD32';
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = (Math.random() - 0.5) * 2;
      this.radius = 32;
      if (missionType === 'hunt_any') this.isMissionTarget = true;
    } else {
      this.type = 'normal';
      this.color = '#00BFFF';
      this.vx = (Math.random() - 0.5) * 3;
      this.vy = (Math.random() - 0.5) * 3;
      if (missionType === 'hunt_any') this.isMissionTarget = true;
    }
  }

  update(width: number, height: number) {
    this.wobble += 0.15;
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < this.radius) { this.x = this.radius; this.vx *= -1; }
    if (this.x > width - this.radius) { this.x = width - this.radius; this.vx *= -1; }
    if (this.y < this.radius) { this.y = this.radius; this.vy *= -1; }
    if (this.y > height - this.radius) { this.y = height - this.radius; this.vy *= -1; }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Draw Mission Highlight
    if (this.isMissionTarget) {
      ctx.beginPath();
      const s = 1 + Math.sin(this.wobble * 0.2) * 0.1;
      ctx.arc(0, 0, this.radius * s + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    if (this.type === 'mine') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius - 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'black';
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i + (this.wobble * 0.05);
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * (this.radius - 10), Math.sin(angle) * (this.radius - 10));
        ctx.lineTo(Math.cos(angle) * (this.radius + 10), Math.sin(angle) * (this.radius + 10));
        ctx.stroke();
      }
      ctx.fillStyle = 'red';
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'black';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-8, -8, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      if (this.type === 'fast') {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.moveTo(-15, -5); ctx.lineTo(-5, 0); ctx.lineTo(-15, 5);
        ctx.moveTo(15, -5); ctx.lineTo(5, 0); ctx.lineTo(15, 5);
        ctx.fill();
      } else if (this.type === 'slow') {
        ctx.fillStyle = 'black';
        ctx.fillRect(-14, -2, 10, 4);
        ctx.fillRect(4, -2, 10, 4);
      }
    }
    ctx.restore();
  }
}

class PopText {
  x: number;
  y: number;
  text: string;
  life: number;
  vy: number;
  color: string;
  size: number;

  constructor(x: number, y: number, text: string, color: string = 'white', size: number = 50) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.life = 1.0;
    this.vy = -3;
    this.color = color;
    this.size = size;
  }

  update() {
    this.y += this.vy;
    this.vy *= 0.95;
    this.life -= 0.02;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const scale = 1 + (1 - this.life) * 0.5;
    ctx.scale(scale, scale);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = `rgba(0, 0, 0, ${this.life})`;
    ctx.font = `${this.size}px 'Bangers'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeText(this.text, 0, 0);
    ctx.fillText(this.text, 0, 0);
    ctx.restore();
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  shape: string;
  rotation: number;
  rotSpeed: number;

  constructor(x: number, y: number, baseColor: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.size = Math.random() * 10 + 4;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.4;
    const rand = Math.random();
    if (rand < 0.15) this.color = '#FFFFFF';
    else if (rand < 0.3) this.color = '#FFD700';
    else this.color = baseColor;
    const shapes = ['circle', 'square', 'triangle', 'star'];
    this.shape = shapes[Math.floor(Math.random() * shapes.length)];
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1; // Slight gravity
    this.rotation += this.rotSpeed;
    this.life -= 0.025;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (this.shape === 'square') ctx.rect(-this.size / 2, -this.size / 2, this.size, this.size);
    else if (this.shape === 'triangle') { ctx.moveTo(0, -this.size / 2); ctx.lineTo(this.size / 2, this.size / 2); ctx.lineTo(-this.size / 2, this.size / 2); ctx.closePath(); }
    else if (this.shape === 'star') { ctx.moveTo(0, -this.size); ctx.lineTo(this.size / 4, -this.size / 4); ctx.lineTo(this.size, 0); ctx.lineTo(0, this.size); ctx.closePath(); }
    else ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke(); ctx.restore();
  }
}

const drawHammer = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, config: HammerConfig, isPowered: boolean) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (isPowered) {
    ctx.shadowColor = '#00BFFF';
    ctx.shadowBlur = 30;
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
  }

  const handleGrad = ctx.createLinearGradient(0, -8, 0, 8);
  if (config.handleType === 'metal') {
    handleGrad.addColorStop(0, '#90A4AE');
    handleGrad.addColorStop(0.5, '#CFD8DC');
    handleGrad.addColorStop(1, '#607D8B');
  } else if (config.handleType === 'tape') {
    handleGrad.addColorStop(0, '#B71C1C');
    handleGrad.addColorStop(0.5, '#EF5350');
    handleGrad.addColorStop(1, '#C62828');
  } else {
    // Wood default
    handleGrad.addColorStop(0, '#5D4037');
    handleGrad.addColorStop(0.5, '#A1887F');
    handleGrad.addColorStop(1, '#3E2723');
  }

  ctx.fillStyle = handleGrad;
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';

  // Draw handle shape
  ctx.beginPath();
  ctx.moveTo(-40, -5); ctx.lineTo(25, -5); ctx.lineTo(25, 5); ctx.lineTo(-40, 5);
  ctx.arc(-40, 0, 5, Math.PI * 0.5, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();

  // Tape Detail
  if (config.handleType === 'tape') {
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    for (let i = -40; i < 25; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, -6);
      ctx.lineTo(i + 3, 6);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.stroke();

  let headColorStops = { s: '#90A4AE', m: '#546E7A', e: '#263238' };
  if (config.color === 'gold') headColorStops = { s: '#FFF59D', m: '#FBC02D', e: '#F57F17' };
  if (config.color === 'fire') headColorStops = { s: '#FFAB91', m: '#D84315', e: '#BF360C' };
  if (config.color === 'void') headColorStops = { s: '#E1BEE7', m: '#8E24AA', e: '#4A148C' };

  const headGrad = ctx.createLinearGradient(20, -40, 60, 40);
  headGrad.addColorStop(0, headColorStops.s);
  headGrad.addColorStop(0.4, headColorStops.m);
  headGrad.addColorStop(1, headColorStops.e);

  ctx.fillStyle = headGrad;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'black';

  if (config.headType === 'mallet') {
    ctx.beginPath(); ctx.rect(20, -35, 40, 70); ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.rect(20, -30, 40, 60); ctx.fill(); ctx.stroke();
  }

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = isPowered ? '#00BFFF' : 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath(); ctx.ellipse(30, -15, 4, 10, Math.PI / 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
};

const GameCanvas: React.FC<GameCanvasProps> = (props) => {
  const { onScoreUpdate, onTimeUpdate, onGameOver, onMissionUpdate, onComboUpdate, onPowerUpdate, powerRequested, onPowerExecuted, hammerConfig, isPaused } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const callbacks = useRef({ onScoreUpdate, onTimeUpdate, onGameOver, onMissionUpdate, onComboUpdate, onPowerUpdate, onPowerExecuted });

  useEffect(() => {
    callbacks.current = { onScoreUpdate, onTimeUpdate, onGameOver, onMissionUpdate, onComboUpdate, onPowerUpdate, onPowerExecuted };
  }, [onScoreUpdate, onTimeUpdate, onGameOver, onMissionUpdate, onComboUpdate, onPowerUpdate, onPowerExecuted]);

  const gameState = useRef({
    width: 0, height: 0, lastTime: 0, timeLeft: 30, isActive: true, hitStop: 0, shake: 0, score: 0,
    mouse: { x: 0, y: 0 }, player: { x: 0, y: 0, angle: 0, dashing: false },
    entities: [] as Entity[], popTexts: [] as PopText[], particles: [] as Particle[],
    clouds: [] as Cloud[], panels: [] as ComicPanel[], buildings: [] as number[], hammerPath: [] as { x: number, y: number, life: number }[],
    mission: null as Mission | null, combo: 0, powerCharge: 0, shockRadius: 0, screenFlash: 0
  });

  const generateMission = (): Mission => {
    const types: MissionType[] = ['streak', 'hunt_fast', 'hunt_any'];
    const type = types[Math.floor(Math.random() * types.length)];
    let goal = 10, description = "SMASH 10 TARGETS";
    if (type === 'streak') { goal = 5; description = "GET A 5x COMBO"; }
    else if (type === 'hunt_fast') { goal = 3; description = "SMASH 3 FAST TARGETS"; }
    return { type, goal, current: 0, description };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const state = gameState.current;

    state.isActive = true;
    state.lastTime = 0;
    state.timeLeft = 30;

    const resize = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      state.width = canvas.width; state.height = canvas.height;
      state.buildings = [];
      const numBuildings = Math.ceil(state.width / 80) + 5;
      for (let i = 0; i < numBuildings; i++) state.buildings.push(100 + Math.random() * 200);

      state.clouds = [];
      for (let i = 0; i < 6; i++) state.clouds.push(new Cloud(state.width, state.height));
      state.panels = [];
      for (let i = 0; i < 4; i++) state.panels.push(new ComicPanel(state.width, state.height));
    };
    window.addEventListener('resize', resize);
    resize();

    state.mission = generateMission();
    callbacks.current.onMissionUpdate(state.mission.description, `0/${state.mission.goal}`);

    const handleMouseMove = (e: MouseEvent) => { state.mouse.x = e.clientX; state.mouse.y = e.clientY; };
    const handleAction = (e?: MouseEvent | TouchEvent) => {
      if (!state.isActive || isPaused) return;

      // If the event target is a button, don't trigger game action
      if (e && (e.target as HTMLElement).closest('button')) return;

      try { soundManager.resume(); soundManager.playSwing(); } catch (e) { }
      state.player.dashing = true;
      setTimeout(() => {
        state.player.dashing = false;
        if (!state.isActive) return;
      }, 150);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        state.mouse.x = e.touches[0].clientX;
        state.mouse.y = e.touches[0].clientY;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest('button')) return; // Ignore if button

      if (e.cancelable) e.preventDefault();
      if (e.touches.length > 0) {
        state.mouse.x = e.touches[0].clientX;
        state.mouse.y = e.touches[0].clientY;
      }
      handleAction(e);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (state.powerCharge >= 100) {
          executePower();
        }
      }
    };

    const executePower = () => {
      state.powerCharge = 0;
      callbacks.current.onPowerUpdate(0);
      state.shockRadius = 1;
      state.screenFlash = 1.0;
      state.shake = 60;
      try { soundManager.playMegaBonk(); } catch (e) { }

      for (let i = state.entities.length - 1; i >= 0; i--) {
        if (state.entities[i].type === 'mine') {
          const m = state.entities[i];
          state.popTexts.push(new PopText(m.x, m.y, "KABOOM!", "orange", 70));
          for (let p = 0; p < 20; p++) state.particles.push(new Particle(m.x, m.y, '#FF4500'));
          state.entities.splice(i, 1);
          state.score += 50;
        }
      }
      callbacks.current.onScoreUpdate(state.score);
      callbacks.current.onPowerExecuted();
    };

    const updateMissionState = () => {
      if (!state.mission) return;

      // Streak mission is "current active combo"
      if (state.mission.type === 'streak') {
        state.mission.current = state.combo;
      }

      if (state.mission.current >= state.mission.goal) {
        state.score += 300;
        state.timeLeft += 5;
        state.popTexts.push(new PopText(state.width / 2, state.height / 2, "MISSION COMPLETE!", "#FFD700", 90));
        state.screenFlash = 0.5;
        state.shake = 20;
        for (let p = 0; p < 40; p++) state.particles.push(new Particle(state.width / 2, state.height / 2, '#00BFFF'));
        try { soundManager.playMissionComplete(); } catch (e) { }
        state.mission = generateMission();
      }
      callbacks.current.onMissionUpdate(state.mission.description, `${state.mission.current}/${state.mission.goal}`);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleAction);
    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

    const update = (time: number) => {
      if (!state.isActive) return;

      if (state.lastTime === 0) {
        state.lastTime = time;
      }

      if (powerRequested && state.powerCharge >= 100) {
        executePower();
      }

      const dt = (time - state.lastTime) / 1000;
      if (!isPaused) {
        state.lastTime = time;

        state.clouds.forEach(c => c.update(state.width, time));
        state.panels.forEach(p => p.update(state.width, state.height));

        if (state.hitStop > 0) {
          state.hitStop--;
          if (state.isActive) animationFrameId = requestAnimationFrame(update);
          return;
        }

        state.timeLeft -= dt;
        if (state.timeLeft <= 0) {
          state.timeLeft = 0;
          state.isActive = false;
          callbacks.current.onGameOver();
        }
        callbacks.current.onTimeUpdate(state.timeLeft);

        const difficulty = Math.min(1.0, state.score / 2500);
        const dx = state.mouse.x - state.player.x;
        const dy = state.mouse.y - state.player.y;
        state.player.angle = Math.atan2(dy, dx);
        const speed = state.player.dashing ? 0.6 : 0.15;
        state.player.x += dx * speed; state.player.y += dy * speed;

        if (state.player.dashing) {
          state.hammerPath.push({ x: state.player.x + Math.cos(state.player.angle) * 55, y: state.player.y + Math.sin(state.player.angle) * 55, life: 1.0 });
        }
        for (let i = state.hammerPath.length - 1; i >= 0; i--) {
          state.hammerPath[i].life -= 0.1; if (state.hammerPath[i].life <= 0) state.hammerPath.splice(i, 1);
        }

        const maxEntities = 8 + Math.floor(difficulty * 12);
        let currentSpawnChance = 0.05 + (difficulty * 0.12);
        if (state.entities.length < 5) currentSpawnChance = 0.50;

        if (state.entities.length < maxEntities && Math.random() < currentSpawnChance) {
          state.entities.push(new Entity(state.width, state.height, difficulty, state.mission?.type));
        }

        for (let i = state.entities.length - 1; i >= 0; i--) {
          const t = state.entities[i]; t.update(state.width, state.height);
          const dist = Math.hypot(state.player.x - t.x, state.player.y - t.y);
          if (dist < t.radius + 35 && state.player.dashing) {
            if (t.type === 'mine') {
              state.timeLeft -= 5;
              state.score = Math.max(0, state.score - 75);
              state.combo = 0;
              state.shake = 35; state.hitStop = 12;
              try { soundManager.playMineHit(); } catch (e) { }
              updateMissionState(); // Reset streak mission progress if applicable
            } else {
              state.shake = 15; state.hitStop = 4; state.combo++;
              state.powerCharge = Math.min(100, state.powerCharge + 10);
              callbacks.current.onPowerUpdate(state.powerCharge);

              const multiplier = 1 + Math.floor(state.combo / 5);
              state.score += 15 * multiplier; state.timeLeft += 1.2;

              const words = ["BONK!", "POW!", "SMASH!", "WHACK!", "BAM!", "ZAP!"];
              state.popTexts.push(new PopText(t.x, t.y - 40, words[Math.floor(Math.random() * words.length)], t.color));
              for (let p = 0; p < 15; p++) state.particles.push(new Particle(t.x, t.y, t.color));
              try { soundManager.playSmash(); } catch (e) { }

              // PROGRESS NON-STREAK MISSIONS
              if (state.mission) {
                if (state.mission.type === 'hunt_any') {
                  state.mission.current++;
                } else if (state.mission.type === 'hunt_fast' && t.type === 'fast') {
                  state.mission.current++;
                }
                updateMissionState();
              }
            }
            callbacks.current.onScoreUpdate(state.score);
            callbacks.current.onComboUpdate(state.combo);
            state.entities.splice(i, 1);
          }
        }

        for (let i = state.particles.length - 1; i >= 0; i--) {
          state.particles[i].update(); if (state.particles[i].life <= 0) state.particles.splice(i, 1);
        }
        for (let i = state.popTexts.length - 1; i >= 0; i--) {
          state.popTexts[i].update(); if (state.popTexts[i].life <= 0) state.popTexts.splice(i, 1);
        }
        if (state.shake > 0) state.shake *= 0.88;

        if (state.shockRadius > 0) {
          state.shockRadius += state.width * 0.055;
          if (state.shockRadius > state.width * 1.5) state.shockRadius = 0;
        }
        if (state.screenFlash > 0) {
          state.screenFlash -= 0.035;
        }
      } else state.lastTime = time;

      ctx.save();
      const rx = (Math.random() - 0.5) * state.shake;
      const ry = (Math.random() - 0.5) * state.shake;
      ctx.translate(rx, ry);

      ctx.fillStyle = '#FFD700'; ctx.fillRect(0, 0, state.width, state.height);

      ctx.save();
      const parallaxX = -(state.mouse.x - state.width / 2) * 0.02;
      ctx.translate(parallaxX, 0);
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      const bWidth = 80;
      state.buildings.forEach((h, i) => {
        ctx.fillRect(i * bWidth, state.height - h, bWidth - 10, h);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        for (let wy = 0; wy < h - 20; wy += 30) {
          ctx.fillRect(i * bWidth + 10, state.height - h + wy + 10, 15, 15);
          ctx.fillRect(i * bWidth + 45, state.height - h + wy + 10, 15, 15);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
      });
      ctx.restore();

      state.panels.forEach(p => p.draw(ctx));
      state.clouds.forEach(c => c.draw(ctx));

      state.entities.forEach(t => t.draw(ctx));
      state.particles.forEach(p => p.draw(ctx));
      state.popTexts.forEach(p => p.draw(ctx));

      drawHammer(ctx, state.player.x, state.player.y, state.player.angle, hammerConfig, state.powerCharge >= 100);

      if (state.shockRadius > 0) {
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, state.shockRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 191, 255, ${0.8 * (1 - state.shockRadius / (state.width * 1.5))})`;
        ctx.lineWidth = 15;
        ctx.stroke();
      }

      if (state.screenFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${state.screenFlash})`;
        ctx.fillRect(0, 0, state.width, state.height);
      }

      ctx.restore();
      if (state.isActive) animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => {
      state.isActive = false;
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleAction);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchStart);
      cancelAnimationFrame(animationFrameId);
    };
  }, [hammerConfig, isPaused, powerRequested]);

  return <canvas ref={canvasRef} className="block w-full h-full touch-none" />;
};

export default GameCanvas;