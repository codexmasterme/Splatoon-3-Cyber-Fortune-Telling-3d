import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// ========================================================================
//  3D 扭蛋机（参考 Splatoon3 大厅扭蛋机）
//  - 玻璃半球罩 + 深色金属机身 + 黄色溅射底座/托盘 + 镀铬曲柄
//  - 内含 9 颗双色扭蛋球，待机时缓慢漂浮，抽签时如彩票机般剧烈翻滚
//  - 最终所有球向中央汇聚并合并为一颗发光的「中奖球」
// ========================================================================

// 9 种撞色组合（上 / 下两半）—— 全部 Splatoon 风荧光撞色
const CAPSULE_PAIRS = [
  [0xff5ba3, 0xffffff], // 粉 + 白
  [0x4be0d0, 0xffe83e], // 青 + 黄
  [0xff7a1a, 0x3e6bff], // 橙 + 深蓝
  [0x7be04b, 0xb04bff], // 绿 + 葡萄
  [0xff6b5b, 0x3ee0ff], // 珊瑚 + 湖蓝
  [0xff3ecb, 0x3eff9e], // 洋红 + 青柠
  [0xffe83e, 0xff4b4b], // 柠檬 + 红
  [0xb04bff, 0xffb03e], // 葡萄 + 蜜橘
  [0x3ee0ff, 0xff3e9a], // 湖蓝 + 荧光粉
];

const BALL_RADIUS = 0.32;
const DOME_CENTER_Y = 0.05; // 半球底部对齐机身顶部
const DOME_RADIUS = 1.45;
const CONFINEMENT_RADIUS = DOME_RADIUS - BALL_RADIUS - 0.03;

// 撞色中奖球（金白发光）
const WINNER_COLOR_A = 0xfff4c2;
const WINNER_COLOR_B = 0xffb03e;

export default function GachaMachine3D({ phase, onAnimationComplete, className = "" }) {
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const onCompleteRef = useRef(onAnimationComplete);

  // 同步最新的回调到 ref，避免闭包陷阱
  useEffect(() => {
    onCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  // --- 一次性初始化：场景 / 相机 / 渲染器 / 机型 / 球 / 灯光 ---
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let width = mount.clientWidth || 280;
    let height = mount.clientHeight || 360;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    camera.position.set(0, 0.35, 5.6);
    camera.lookAt(0, 0.15, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    // 像素比固定为 1，避免高 DPI 屏幕下渲染负担过重导致主线程阻塞、setTimeout/rAF 延迟
    renderer.setPixelRatio(1);
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // 环境贴图（用于玻璃 / 镀铬反射）
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new RoomEnvironment();
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;

    // ===== 灯光 =====
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.3);
    keyLight.position.set(3.5, 5, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.55);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff88cc, 0.85);
    rimLight.position.set(0, 3, -5);
    scene.add(rimLight);

    const underGlow = new THREE.PointLight(0x4be0d0, 0.9, 4);
    underGlow.position.set(0, -1.1, 1.6);
    scene.add(underGlow);

    // ===== 机型组 =====
    const machine = new THREE.Group();
    scene.add(machine);

    // --- 底座（黄色，带溅射凸起）---
    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xffd23f,
      roughness: 0.32,
      metalness: 0.15,
      envMapIntensity: 1.0,
    });
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.42, 0.26, 64),
      yellowMat
    );
    base.position.y = -1.18;
    machine.add(base);

    // 底座外缘的 6 个溅射凸起（像墨滴）
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.35;
      const bump = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 20, 20),
        yellowMat
      );
      bump.position.set(
        Math.cos(angle) * 1.45,
        -1.18,
        Math.sin(angle) * 1.45
      );
      bump.scale.set(1, 0.45, 1);
      machine.add(bump);
    }

    // --- 机身（深色金属圆柱）---
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1d1d36,
      roughness: 0.4,
      metalness: 0.55,
      envMapIntensity: 0.85,
    });
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.45, 1.1, 64),
      bodyMat
    );
    body.position.y = -0.5;
    machine.add(body);

    // 机身顶部 / 底部镀铬装饰环
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xc8c8d0,
      metalness: 1.0,
      roughness: 0.18,
      envMapIntensity: 1.5,
    });
    const trimTop = new THREE.Mesh(
      new THREE.TorusGeometry(1.36, 0.045, 16, 64),
      chromeMat
    );
    trimTop.rotation.x = Math.PI / 2;
    trimTop.position.y = 0.06;
    machine.add(trimTop);

    const trimBot = new THREE.Mesh(
      new THREE.TorusGeometry(1.46, 0.045, 16, 64),
      chromeMat
    );
    trimBot.rotation.x = Math.PI / 2;
    trimBot.position.y = -1.05;
    machine.add(trimBot);

    // 机身正面的发光面板（带一点 emissive）
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0xff5ba3,
      roughness: 0.4,
      metalness: 0.2,
      emissive: 0xff5ba3,
      emissiveIntensity: 0.32,
    });
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.55, 0.02),
      panelMat
    );
    // 机身半径在 y=-0.18 处约 1.37，把面板推到 z=1.45 凸出在前
    panel.position.set(0, -0.18, 1.45);
    machine.add(panel);

    // 面板上的小标识（白色长条，模拟贴纸）
    const sticker = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.18, 0.012),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.0,
        emissive: 0xffffff,
        emissiveIntensity: 0.18,
      })
    );
    sticker.position.set(0, -0.18, 1.465);
    machine.add(sticker);

    // --- 玻璃罩（半球）---
    // 用 MeshPhongMaterial 模拟玻璃，避免 MeshPhysicalMaterial.transmission 的昂贵额外渲染通道
    const domeMat = new THREE.MeshPhongMaterial({
      color: 0xb5e8ff,
      transparent: true,
      opacity: 0.28,
      shininess: 100,
      specular: 0xffffff,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    // 给玻璃罩加一层 fresnel 边缘高光，看起来更有玻璃质感
    const domeFresnelMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.18,
      shininess: 200,
      specular: 0xffffff,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(DOME_RADIUS, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2),
      domeMat
    );
    dome.position.y = DOME_CENTER_Y;
    machine.add(dome);

    // 玻璃罩内层 fresnel 高光
    const domeFresnel = new THREE.Mesh(
      new THREE.SphereGeometry(DOME_RADIUS * 0.99, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2),
      domeFresnelMat
    );
    domeFresnel.position.y = DOME_CENTER_Y;
    machine.add(domeFresnel);

    // 玻璃罩底部镀铬环
    const domeRim = new THREE.Mesh(
      new THREE.TorusGeometry(DOME_RADIUS, 0.06, 16, 64),
      chromeMat
    );
    domeRim.rotation.x = Math.PI / 2;
    domeRim.position.y = DOME_CENTER_Y;
    machine.add(domeRim);

    // 玻璃罩顶部小尖帽（像扭蛋机顶端的旋钮装饰）
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 24, 24),
      chromeMat
    );
    cap.position.y = DOME_CENTER_Y + DOME_RADIUS - 0.04;
    machine.add(cap);

    // --- 曲柄（镀铬轮 + 三辐 + 把手）---
    const crankGroup = new THREE.Group();
    const wheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.035, 16, 32),
      chromeMat
    );
    crankGroup.add(wheel);

    for (let i = 0; i < 3; i++) {
      const spoke = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.42, 8),
        chromeMat
      );
      spoke.rotation.z = (i / 3) * Math.PI;
      crankGroup.add(spoke);
    }

    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 20, 20),
      chromeMat
    );
    handle.position.set(0.22, 0, 0);
    crankGroup.add(handle);

    // 曲柄背面的轴
    const axle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.18, 16),
      chromeMat
    );
    axle.rotation.x = Math.PI / 2;
    axle.position.set(0, 0, -0.09);
    crankGroup.add(axle);

    // 曲柄位置：机身半径在 y=-0.4 处约 1.42，因此 z 设为 1.55 让曲柄明显凸出在机身前方
    crankGroup.position.set(0, -0.4, 1.55);
    machine.add(crankGroup);

    // --- 出口（深色矩形槽 + 镀铬外框）---
    // 机身半径在 y=-0.86 处约 1.45，把槽推到 z=1.5 凸出在前
    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.24, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0x08080f,
        roughness: 0.85,
        metalness: 0.1,
      })
    );
    slot.position.set(0, -0.86, 1.5);
    machine.add(slot);

    const slotRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.022, 8, 48),
      chromeMat
    );
    slotRim.rotation.x = Math.PI / 2;
    slotRim.scale.set(1.85, 0.55, 1);
    slotRim.position.set(0, -0.86, 1.54);
    machine.add(slotRim);

    // --- 托盘（黄色，下方）---
    const trayGroup = new THREE.Group();
    const trayBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.36, 0.14, 32),
      yellowMat
    );
    trayGroup.add(trayBase);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + 0.4;
      const drip = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 16, 16),
        yellowMat
      );
      drip.position.set(Math.cos(angle) * 0.4, 0, Math.sin(angle) * 0.4);
      drip.scale.set(1, 0.45, 1);
      trayGroup.add(drip);
    }
    trayGroup.position.set(0, -1.08, 1.55);
    trayGroup.rotation.x = -0.25;
    machine.add(trayGroup);

    // ===== 扭蛋球（双色半球 + 镀铬赤道环）=====
    const balls = [];

    function makeCapsule(colorA, colorB) {
      const group = new THREE.Group();
      const r = BALL_RADIUS;

      const topMat = new THREE.MeshStandardMaterial({
        color: colorA,
        roughness: 0.22,
        metalness: 0.1,
        envMapIntensity: 1.2,
      });
      const top = new THREE.Mesh(
        new THREE.SphereGeometry(r, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        topMat
      );
      group.add(top);

      const botMat = new THREE.MeshStandardMaterial({
        color: colorB,
        roughness: 0.22,
        metalness: 0.1,
        envMapIntensity: 1.2,
      });
      const bot = new THREE.Mesh(
        new THREE.SphereGeometry(r, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
        botMat
      );
      group.add(bot);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.014, 8, 36),
        chromeMat
      );
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      return group;
    }

    CAPSULE_PAIRS.forEach((pair, i) => {
      const ball = makeCapsule(pair[0], pair[1]);
      // 初始位置：沿三个不同高度的圆周分布，让球从待机就立体可见
      const angle = (i / CAPSULE_PAIRS.length) * Math.PI * 2;
      const tier = i % 3; // 0/1/2 三层高度
      const r = 0.45 + tier * 0.05;
      ball.position.set(
        Math.cos(angle) * r,
        0.4 + tier * 0.32,
        Math.sin(angle) * r
      );
      ball.userData = {
        velocity: new THREE.Vector3(),
        angularVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4
        ),
        hidden: false,
      };
      machine.add(ball);
      balls.push(ball);
    });

    // ===== 中奖球（金白发光，带光晕和点光源）=====
    function makeGlowTexture() {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const ctx = c.getContext("2d");
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.3, "rgba(255,224,128,0.7)");
      grad.addColorStop(1, "rgba(255,224,128,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }

    const winnerBall = new THREE.Group();
    const winnerInner = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS * 1.2, 32, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffc94b,
        emissiveIntensity: 0.7,
        roughness: 0.18,
        metalness: 0.3,
        envMapIntensity: 1.6,
      })
    );
    winnerBall.add(winnerInner);

    // 中奖球也是双色（金 + 白）
    const winnerBot = new THREE.Mesh(
      new THREE.SphereGeometry(
        BALL_RADIUS * 1.2,
        48,
        48,
        0,
        Math.PI * 2,
        Math.PI / 2,
        Math.PI / 2
      ),
      new THREE.MeshStandardMaterial({
        color: WINNER_COLOR_B,
        emissive: 0xff7a1a,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.3,
        envMapIntensity: 1.5,
      })
    );
    winnerBall.add(winnerBot);

    const winnerRing = new THREE.Mesh(
      new THREE.TorusGeometry(BALL_RADIUS * 1.2, 0.02, 8, 48),
      chromeMat
    );
    winnerRing.rotation.x = Math.PI / 2;
    winnerBall.add(winnerRing);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        color: 0xffe080,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    halo.scale.set(2.8, 2.8, 1);
    winnerBall.add(halo);

    const winnerLight = new THREE.PointLight(0xffd060, 0, 3.5);
    winnerBall.add(winnerLight);

    winnerBall.position.set(0, 0.55, 0);
    winnerBall.scale.setScalar(0);
    winnerBall.visible = false;
    machine.add(winnerBall);

    // ===== 动画状态机 =====
    let currentPhase = "idle";
    let phaseStartTime = performance.now();
    let rafId = null;
    let cameraAngle = 0;
    let lastFrameTime = performance.now();
    let spinCompleteFired = false; // 防止 onAnimationComplete 被多次调用

    function setPhase(p) {
      currentPhase = p;
      phaseStartTime = performance.now();

      if (p === "spinning") {
        spinCompleteFired = false; // 重置标志，允许下一次抽奖触发回调
        // 重置所有球：可见、原尺寸、随机位置与速度
        balls.forEach((b) => {
          b.visible = true;
          b.scale.setScalar(1);
          b.userData.hidden = false;
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * 0.65;
          b.position.set(
            Math.cos(angle) * r,
            0.25 + Math.random() * 0.9,
            Math.sin(angle) * r
          );
          b.userData.velocity.set(
            (Math.random() - 0.5) * 7,
            Math.random() * 5 + 2,
            (Math.random() - 0.5) * 7
          );
          b.userData.angularVelocity.set(
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12
          );
        });
        winnerBall.visible = false;
        winnerBall.scale.setScalar(0);
        winnerLight.intensity = 0;
      } else if (p === "idle") {
        balls.forEach((b) => {
          b.visible = true;
          b.scale.setScalar(1);
          b.userData.hidden = false;
          b.userData.velocity.set(0, 0, 0);
        });
        winnerBall.visible = false;
        winnerBall.scale.setScalar(0);
        winnerLight.intensity = 0;
      }
    }

    // 球的物理：重力 + 半球形容器内壁碰撞 + 地板碰撞
    function updateBallPhysics(b, dt) {
      if (b.userData.hidden) return;

      // 重力
      b.userData.velocity.y -= 14 * dt;

      // 位置积分
      b.position.addScaledVector(b.userData.velocity, dt);

      // 地板（机身顶部）碰撞
      const floorY = DOME_CENTER_Y + BALL_RADIUS;
      if (b.position.y < floorY) {
        b.position.y = floorY;
        if (b.userData.velocity.y < 0) {
          b.userData.velocity.y = -b.userData.velocity.y * 0.62;
          b.userData.velocity.x *= 0.88;
          b.userData.velocity.z *= 0.88;
        }
      }

      // 半球内壁碰撞
      const offset = new THREE.Vector3().subVectors(b.position, new THREE.Vector3(0, DOME_CENTER_Y, 0));
      const dist = offset.length();
      if (dist > CONFINEMENT_RADIUS) {
        offset.normalize();
        b.position
          .copy(new THREE.Vector3(0, DOME_CENTER_Y, 0))
          .addScaledVector(offset, CONFINEMENT_RADIUS);
        const vDotN = b.userData.velocity.dot(offset);
        if (vDotN > 0) {
          b.userData.velocity.addScaledVector(offset, -2 * vDotN);
          b.userData.velocity.multiplyScalar(0.72);
        }
      }

      // 旋转
      b.rotation.x += b.userData.angularVelocity.x * dt;
      b.rotation.y += b.userData.angularVelocity.y * dt;
      b.rotation.z += b.userData.angularVelocity.z * dt;
      b.userData.angularVelocity.multiplyScalar(0.995);
    }

    // 简易球-球碰撞（弹性）
    function updateBallBallCollisions() {
      for (let i = 0; i < balls.length; i++) {
        if (balls[i].userData.hidden) continue;
        for (let j = i + 1; j < balls.length; j++) {
          if (balls[j].userData.hidden) continue;
          const a = balls[i], b = balls[j];
          const diff = new THREE.Vector3().subVectors(b.position, a.position);
          const dist = diff.length();
          const minDist = BALL_RADIUS * 2 * 0.96;
          if (dist < minDist && dist > 0.0001) {
            const normal = diff.clone().divideScalar(dist);
            const overlap = (minDist - dist) / 2;
            a.position.addScaledVector(normal, -overlap);
            b.position.addScaledVector(normal, overlap);
            const av = a.userData.velocity.dot(normal);
            const bv = b.userData.velocity.dot(normal);
            const exchange = bv - av;
            a.userData.velocity.addScaledVector(normal, exchange);
            b.userData.velocity.addScaledVector(normal, -exchange);
            // 碰撞时加点角速度让旋转更生动
            a.userData.angularVelocity.x += (Math.random() - 0.5) * 4;
            a.userData.angularVelocity.z += (Math.random() - 0.5) * 4;
            b.userData.angularVelocity.x += (Math.random() - 0.5) * 4;
            b.userData.angularVelocity.z += (Math.random() - 0.5) * 4;
          }
        }
      }
    }

    // 缓动函数
    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    function animate() {
      const now = performance.now();
      const dt = Math.min((now - lastFrameTime) / 1000, 1 / 30);
      lastFrameTime = now;
      const phaseElapsed = (now - phaseStartTime) / 1000;

      // 微微的相机漂移
      cameraAngle += 0.0025;
      camera.position.x = Math.sin(cameraAngle) * 0.32;
      camera.position.y = 0.35 + Math.sin(cameraAngle * 0.6) * 0.06;
      camera.lookAt(0, 0.15, 0);

      if (currentPhase === "idle") {
        // 待机：9 颗球以三个不同高度/半径的轨道漂浮、自转，确保从正面看不会被遮挡
        balls.forEach((b, i) => {
          if (b.userData.hidden) return;
          const tier = i % 3;
          const orbitR = 0.45 + tier * 0.12;
          const baseY = 0.45 + tier * 0.3;
          const t = now * 0.0006 + i * 0.78;
          const targetX = Math.cos(t) * orbitR;
          const targetZ = Math.sin(t) * orbitR;
          const targetY = baseY + Math.sin(t * 1.6 + i) * 0.12;
          b.position.x += (targetX - b.position.x) * 0.05;
          b.position.y += (targetY - b.position.y) * 0.05;
          b.position.z += (targetZ - b.position.z) * 0.05;
          b.rotation.y += 0.008;
          b.rotation.x += 0.004;
        });
        // 曲柄轻微回正
        crankGroup.rotation.z *= 0.9;
        machine.position.x *= 0.85;
        machine.rotation.z *= 0.85;

      } else if (currentPhase === "spinning") {
        if (phaseElapsed < 1.25) {
          // 第一阶段：剧烈翻滚
          crankGroup.rotation.z += 0.42;

          balls.forEach((b) => updateBallPhysics(b, dt));
          updateBallBallCollisions();

          // 随机能量补充（让球持续翻腾）—— 降到 20% 频率减轻主线程负担
          if (Math.random() < 0.2) {
            const b = balls[Math.floor(Math.random() * balls.length)];
            b.userData.velocity.x += (Math.random() - 0.5) * 6;
            b.userData.velocity.y += Math.random() * 5 + 2.5;
            b.userData.velocity.z += (Math.random() - 0.5) * 6;
          }

          // 机身轻微抖动
          machine.position.x = (Math.random() - 0.5) * 0.025;
          machine.rotation.z = (Math.random() - 0.5) * 0.012;

        } else if (phaseElapsed < 2.0) {
          // 第二阶段：向中央汇聚并合并
          const t = (phaseElapsed - 1.25) / 0.75; // 0 -> 1
          const e = easeInOut(t);
          const center = new THREE.Vector3(0, 0.55, 0);

          crankGroup.rotation.z += 0.12 * (1 - e);

          balls.forEach((b, i) => {
            if (b.userData.hidden) return;
            // 螺旋汇聚
            const angle = Math.atan2(b.position.z, b.position.x) + 0.18;
            const radial = b.position.length() * (1 - 0.08);
            b.position.x = Math.cos(angle) * radial;
            b.position.z = Math.sin(angle) * radial;
            b.position.lerp(center, 0.12 + e * 0.1);
            // 高速自转
            b.rotation.y += 0.35;
            b.rotation.x += 0.22;
            // 缩小并隐藏
            const scale = Math.max(0, 1 - e * 1.15);
            b.scale.setScalar(scale);
            if (scale <= 0.02) {
              b.userData.hidden = true;
              b.visible = false;
            }
          });

          // 中奖球浮现
          winnerBall.visible = true;
          const winScale = easeOut(Math.min(1, t * 1.4));
          winnerBall.scale.setScalar(winScale);
          winnerBall.position.set(0, 0.55 + Math.sin(t * Math.PI) * 0.18, 0);
          winnerBall.rotation.y += 0.05;
          winnerInner.material.emissiveIntensity = 0.5 + e * 0.4;
          winnerLight.intensity = e * 1.8;

          machine.position.x *= 0.88;
          machine.rotation.z *= 0.88;

        } else {
          // 第三阶段：中奖球脉动
          const t = phaseElapsed - 2.0;
          winnerBall.visible = true;
          winnerBall.scale.setScalar(1 + Math.sin(t * 14) * 0.07);
          winnerBall.position.set(0, 0.55 + Math.sin(t * 5) * 0.08, 0);
          winnerBall.rotation.y += 0.045;
          winnerInner.material.emissiveIntensity = 0.85 + Math.sin(t * 14) * 0.25;
          winnerLight.intensity = 1.9 + Math.sin(t * 14) * 0.6;

          machine.position.x *= 0.88;
          machine.rotation.z *= 0.88;

          // 脉动 ~0.7s 后通知父组件切换到 RESULT 阶段
          // 用 rAF 内的判定，比 setTimeout 更准（3D 渲染会阻塞主线程，setTimeout 严重延迟）
          if (t >= 0.7 && !spinCompleteFired) {
            spinCompleteFired = true;
            const cb = onCompleteRef.current;
            if (typeof cb === "function") cb();
          }
        }
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    }

    animate();
    apiRef.current = { setPhase };

    // --- 容器尺寸变化 ---
    function onResize() {
      const w = mount.clientWidth || 280;
      const h = mount.clientHeight || 360;
      if (w === width && h === height) return;
      width = w;
      height = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);
    window.addEventListener("resize", onResize);

    // --- 清理 ---
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      renderer.dispose();
      pmrem.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // --- 响应 phase 变化 ---
  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.setPhase(phase);
    }
  }, [phase]);

  return <div ref={mountRef} className={`gacha-3d-stage ${className}`} />;
}
