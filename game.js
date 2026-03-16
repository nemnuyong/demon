if (!window.THREE) {
  const msg = 'Không tải được thư viện 3D (Three.js). Hãy kiểm tra mạng hoặc mở bằng HTTP server.';
  const overlay = document.querySelector('#overlay');
  const btn = document.querySelector('#startBtn');
  if (btn) btn.textContent = 'Lỗi tải Three.js';
  if (overlay) overlay.style.display = 'grid';
  alert(msg);
  throw new Error(msg);
}

const THREE = window.THREE;


const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0a0e18, 30, 280);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 800);
camera.position.set(0, 5, 12);

const hemiLight = new THREE.HemisphereLight(0x87c5ff, 0x1f1f36, 1.0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(20, 40, 10);
scene.add(dirLight);

const groundGeo = new THREE.PlaneGeometry(1500, 1500);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x11151f, roughness: 1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
scene.add(ground);

const roadMat = new THREE.MeshStandardMaterial({ color: 0x1c2335, roughness: 0.95 });
const road = new THREE.Mesh(new THREE.PlaneGeometry(90, 1500), roadMat);
road.rotation.x = -Math.PI / 2;
road.position.y = 0;
scene.add(road);

const laneLineMat = new THREE.MeshBasicMaterial({ color: 0xc9d0ff });
for (let z = -700; z <= 700; z += 24) {
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 9), laneLineMat);
  line.position.set(0, 0.03, z);
  scene.add(line);
}

const buildingMat = new THREE.MeshStandardMaterial({ color: 0x2f4468, metalness: 0.15, roughness: 0.85 });
const buildings = [];
for (let i = 0; i < 180; i++) {
  const height = 8 + Math.random() * 40;
  const width = 8 + Math.random() * 14;
  const depth = 8 + Math.random() * 14;
  const b = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), buildingMat);

  const side = Math.random() < 0.5 ? -1 : 1;
  const x = side * (18 + Math.random() * 45);
  const z = -700 + Math.random() * 1400;

  b.position.set(x, height / 2, z);
  b.userData.topPoint = new THREE.Vector3(x, height + 2, z);
  buildings.push(b);
  scene.add(b);
}

const heroGroup = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.65, 1.8, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0xdb2644, roughness: 0.5, metalness: 0.1 })
);
body.position.y = 1.5;
heroGroup.add(body);

const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.55, 18, 18),
  new THREE.MeshStandardMaterial({ color: 0x2f57d0, roughness: 0.4 })
);
head.position.y = 3;
heroGroup.add(head);

scene.add(heroGroup);

const webLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
  new THREE.LineBasicMaterial({ color: 0xddddff })
);
webLine.visible = false;
scene.add(webLine);

const keys = {};
let gameStarted = false;
let score = 0;

const player = {
  pos: new THREE.Vector3(0, 1.4, 0),
  vel: new THREE.Vector3(),
  onGround: true,
  swinging: false,
  anchor: null,
};

const statusEl = document.querySelector('#status');
const scoreEl = document.querySelector('#score');
const overlay = document.querySelector('#overlay');
const startBtn = document.querySelector('#startBtn');

function updateScore(dt) {
  score += dt * (player.swinging ? 18 : 9);
  scoreEl.textContent = `Điểm: ${Math.floor(score)}`;
}

function findAnchor() {
  const forward = new THREE.Vector3(0, 0.15, -1).applyQuaternion(camera.quaternion).normalize();
  let best = null;
  let bestDist = Infinity;

  for (const b of buildings) {
    const toAnchor = b.userData.topPoint.clone().sub(player.pos);
    const dist = toAnchor.length();
    const dirScore = forward.dot(toAnchor.normalize());

    if (dirScore > 0.55 && dist < 70 && dist < bestDist) {
      best = b.userData.topPoint.clone();
      bestDist = dist;
    }
  }
  return best;
}

function beginSwing() {
  const anchor = findAnchor();
  if (!anchor) return;

  player.swinging = true;
  player.anchor = anchor;
  statusEl.textContent = 'Trạng thái: Đang đu tơ';
  webLine.visible = true;
}

function releaseSwing() {
  if (!player.swinging) return;
  player.swinging = false;
  player.anchor = null;
  statusEl.textContent = 'Trạng thái: Chạy tự do';
  webLine.visible = false;
}

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space' && player.onGround) {
    player.vel.y = 10;
    player.onGround = false;
  }
});
window.addEventListener('keyup', (e) => (keys[e.code] = false));
window.addEventListener('mousedown', () => gameStarted && beginSwing());
window.addEventListener('mouseup', releaseSwing);

startBtn.addEventListener('click', () => {
  gameStarted = true;
  overlay.style.display = 'none';
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);

  if (!gameStarted) {
    renderer.render(scene, camera);
    return;
  }

  const accel = keys.ShiftLeft || keys.ShiftRight ? 28 : 19;
  const move = new THREE.Vector3(
    (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0),
    0,
    (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0)
  );

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(accel * dt);
    player.vel.x += move.x;
    player.vel.z += move.z;
  }

  player.vel.y -= 22 * dt;

  if (player.swinging && player.anchor) {
    const ropeVec = player.anchor.clone().sub(player.pos);
    const ropeLen = ropeVec.length();
    const ropeDir = ropeVec.normalize();
    const desiredLen = 14;

    player.vel.add(ropeDir.multiplyScalar(34 * dt));

    if (ropeLen > desiredLen) {
      const pull = ropeLen - desiredLen;
      player.pos.add(ropeDir.multiplyScalar(pull * 0.7));
    }

    webLine.geometry.setFromPoints([player.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), player.anchor]);
  }

  player.vel.multiplyScalar(0.975);
  player.pos.addScaledVector(player.vel, dt);

  if (player.pos.y <= 1.4) {
    player.pos.y = 1.4;
    player.vel.y = 0;
    player.onGround = true;
  }

  player.pos.x = THREE.MathUtils.clamp(player.pos.x, -40, 40);
  player.pos.z = THREE.MathUtils.clamp(player.pos.z, -720, 720);

  heroGroup.position.copy(player.pos);
  heroGroup.rotation.y = Math.atan2(-player.vel.x, -player.vel.z || 0.001);

  const camTarget = player.pos.clone().add(new THREE.Vector3(0, 4, 0));
  const camPos = player.pos.clone().add(new THREE.Vector3(0, 8, 15));
  camera.position.lerp(camPos, 4 * dt);
  camera.lookAt(camTarget);

  updateScore(dt);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
