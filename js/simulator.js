/* === NAO V6 3D Robot Simulator (Three.js) ===
 *
 * Anatomically accurate joint hierarchy matching the real NAO V6 (H25).
 * 25 degrees of freedom:
 *   Head:      HeadYaw, HeadPitch                         (2 DOF)
 *   Left Arm:  LShoulderPitch, LShoulderRoll, LElbowYaw,
 *              LElbowRoll, LWristYaw, LHand               (6 DOF)
 *   Right Arm: RShoulderPitch, RShoulderRoll, RElbowYaw,
 *              RElbowRoll, RWristYaw, RHand                (6 DOF)
 *   Pelvis:    LHipYawPitch (shared motor)                 (1 DOF)
 *   Left Leg:  LHipRoll, LHipPitch, LKneePitch,
 *              LAnklePitch, LAnkleRoll                     (5 DOF)
 *   Right Leg: RHipRoll, RHipPitch, RKneePitch,
 *              RAnklePitch, RAnkleRoll                     (5 DOF)
 *
 * Proportions based on official Aldebaran kinematic model (scaled to ~0.574 m).
 * Real dimensions (mm): NeckOffsetZ=126.5, ShoulderOffsetZ=100, ShoulderOffsetY=98,
 *   UpperArmLength=105, LowerArmLength=55.95, HandOffsetX=57.75,
 *   HipOffsetZ=85, HipOffsetY=50, ThighLength=100, TibiaLength=102.9, FootHeight=45.19
 */

class NAOSimulator {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.robot = null;
    this.animationId = null;
    this.currentAnimation = 'idle';
    this.animationTime = 0;

    // Joint pivot groups — named to match NAO V6 joint names
    this.joints = {};
    // Visual mesh parts for animation effects (eyes, mouth, etc.)
    this.parts = {};

    // Joint target angles for 'pose' mode — smoothly interpolated each frame
    this.jointTargets = {};    // { jointName: targetAngle }
    this.jointSpeeds = {};     // { jointName: speed } (radians per second)

    // Movement state — tracks robot heading and position for visual turn/walk
    this.heading = 0;            // cumulative heading in radians
    this._move = null;           // active movement: { type, startVal, endVal, startTime, duration, callback }

    this.init();
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f4f8);

    // Camera
    const w = this.container.clientWidth || 400;
    const h = this.container.clientHeight || 300;
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 0.35, 1.2);
    this.camera.lookAt(0, 0.25, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // OrbitControls — scroll to zoom, click-drag to rotate
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.target.set(0, 0.25, 0);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.1;
      this.controls.minDistance = 0.3;
      this.controls.maxDistance = 4;
      this.controls.maxPolarAngle = Math.PI * 0.85;
      this.controls.update();
    }

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 3, 2);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-1, 1, -1);
    this.scene.add(fillLight);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(4, 4);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xdde3ea });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Build robot
    this.buildNAO();

    // Handle resize
    this._resizeHandler = () => this.onResize();
    window.addEventListener('resize', this._resizeHandler);

    // Start animation loop
    this.animate();
  }

  buildNAO() {
    this.robot = new THREE.Group();

    // ── Scale factor: real NAO is 574mm, we use meters at ~1:1 ──
    // All values below are in meters, derived from the official Aldebaran specs.
    const S = 1; // scale multiplier (1 = real-world meters)

    // ── Materials ──
    const white = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5, roughness: 0.35, metalness: 0.05
    });
    const blue = new THREE.MeshStandardMaterial({
      color: 0x1a73e8, roughness: 0.3, metalness: 0.1
    });
    const darkGrey = new THREE.MeshStandardMaterial({
      color: 0x3c3c3c, roughness: 0.5, metalness: 0.2
    });
    const lightGrey = new THREE.MeshStandardMaterial({
      color: 0x888888, roughness: 0.4, metalness: 0.15
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.3
    });

    // ── Dimensions (meters, from Aldebaran kinematic model) ──
    const footHeight   = 0.04519;
    const tibiaLen     = 0.10290;
    const thighLen     = 0.10000;
    const hipOffsetY   = 0.05000;
    const hipOffsetZ   = 0.08500;
    const neckOffsetZ  = 0.12650;
    const shoulderOffY = 0.09800;
    const shoulderOffZ = 0.10000;
    const upperArmLen  = 0.10500;
    const lowerArmLen  = 0.05595;
    const handOffsetX  = 0.05775;

    // Torso center height above ground (standing straight)
    const torsoY = footHeight + tibiaLen + thighLen + hipOffsetZ;
    // ≈ 0.04519 + 0.10290 + 0.10000 + 0.08500 = 0.33309

    // ================================================================
    //  TORSO (origin of all kinematic chains)
    // ================================================================
    const torsoGeo = new THREE.BoxGeometry(0.14 * S, 0.13 * S, 0.08 * S);
    this.parts.torso = new THREE.Mesh(torsoGeo, white);
    this.parts.torso.position.set(0, torsoY, 0);
    this.robot.add(this.parts.torso);

    // Chest plate (blue accent on front)
    const chestGeo = new THREE.BoxGeometry(0.10 * S, 0.055 * S, 0.002 * S);
    const chest = new THREE.Mesh(chestGeo, blue);
    chest.position.set(0, torsoY + 0.01, 0.042);
    this.robot.add(chest);

    // Chest button (glowing)
    const btnGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.005, 16);
    const btnMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.5
    });
    const chestBtn = new THREE.Mesh(btnGeo, btnMat);
    chestBtn.rotation.x = Math.PI / 2;
    chestBtn.position.set(0, torsoY + 0.01, 0.046);
    this.robot.add(chestBtn);

    // Back panel accent
    const backGeo = new THREE.BoxGeometry(0.08 * S, 0.04 * S, 0.002 * S);
    const backPanel = new THREE.Mesh(backGeo, lightGrey);
    backPanel.position.set(0, torsoY + 0.02, -0.042);
    this.robot.add(backPanel);

    // ================================================================
    //  HEAD — HeadYaw (2 DOF: yaw + pitch)
    // ================================================================
    const neckY = torsoY + neckOffsetZ * 0.5; // neck base

    // Neck cylinder
    const neckGeo = new THREE.CylinderGeometry(0.022, 0.028, 0.04, 16);
    const neck = new THREE.Mesh(neckGeo, darkGrey);
    neck.position.set(0, torsoY + 0.085, 0);
    this.robot.add(neck);

    // HeadYaw pivot (rotates left/right around Y-axis)
    const headYawY = torsoY + neckOffsetZ;
    this.joints.HeadYaw = new THREE.Group();
    this.joints.HeadYaw.position.set(0, headYawY, 0);

    // HeadPitch pivot (nods up/down around X-axis), child of HeadYaw
    this.joints.HeadPitch = new THREE.Group();
    this.joints.HeadYaw.add(this.joints.HeadPitch);

    // Head mesh (attached to HeadPitch)
    const headGeo = new THREE.BoxGeometry(0.105 * S, 0.085 * S, 0.09 * S);
    this.parts.head = new THREE.Mesh(headGeo, white);
    this.parts.head.position.set(0, 0.045, 0);
    this.joints.HeadPitch.add(this.parts.head);

    // Head top accent (blue crown) — slightly above head to avoid z-fighting
    const headTopGeo = new THREE.BoxGeometry(0.105 * S, 0.022 * S, 0.09 * S);
    const headTopMat = new THREE.MeshStandardMaterial({
      color: 0x1a73e8, roughness: 0.3, metalness: 0.1,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnit: -1
    });
    const headTop = new THREE.Mesh(headTopGeo, headTopMat);
    headTop.position.set(0, 0.092, 0);
    headTop.renderOrder = 1;
    this.joints.HeadPitch.add(headTop);

    // Forehead accent strip
    const foreheadGeo = new THREE.BoxGeometry(0.105 * S, 0.012 * S, 0.002 * S);
    const foreheadMat = new THREE.MeshStandardMaterial({
      color: 0x1a73e8, roughness: 0.3, metalness: 0.1
    });
    const forehead = new THREE.Mesh(foreheadGeo, foreheadMat);
    forehead.position.set(0, 0.072, 0.046);
    this.joints.HeadPitch.add(forehead);

    // Eyes
    const eyeGeo = new THREE.CircleGeometry(0.015, 20);
    this.parts.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.parts.leftEye.position.set(-0.025, 0.052, 0.046);
    this.joints.HeadPitch.add(this.parts.leftEye);

    this.parts.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.parts.rightEye.position.set(0.025, 0.052, 0.046);
    this.joints.HeadPitch.add(this.parts.rightEye);

    // Mouth (LED strip)
    const mouthGeo = new THREE.BoxGeometry(0.04, 0.006, 0.001);
    this.parts.mouth = new THREE.Mesh(mouthGeo, eyeMat);
    this.parts.mouth.position.set(0, 0.022, 0.046);
    this.joints.HeadPitch.add(this.parts.mouth);

    // Ear speakers
    const earGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.015, 16);
    const leftEar = new THREE.Mesh(earGeo, darkGrey);
    leftEar.rotation.z = Math.PI / 2;
    leftEar.position.set(-0.058, 0.048, 0);
    this.joints.HeadPitch.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, darkGrey);
    rightEar.rotation.z = Math.PI / 2;
    rightEar.position.set(0.058, 0.048, 0);
    this.joints.HeadPitch.add(rightEar);

    // Camera (small bump on forehead)
    const camGeo = new THREE.BoxGeometry(0.015, 0.01, 0.008);
    const camMesh = new THREE.Mesh(camGeo, darkGrey);
    camMesh.position.set(0, 0.065, 0.049);
    this.joints.HeadPitch.add(camMesh);

    // Bottom camera (under mouth)
    const camGeo2 = new THREE.BoxGeometry(0.012, 0.008, 0.006);
    const camMesh2 = new THREE.Mesh(camGeo2, darkGrey);
    camMesh2.position.set(0, 0.01, 0.048);
    this.joints.HeadPitch.add(camMesh2);

    this.robot.add(this.joints.HeadYaw);

    // ================================================================
    //  LEFT ARM (6 DOF: ShoulderPitch, ShoulderRoll, ElbowYaw,
    //            ElbowRoll, WristYaw, Hand)
    // ================================================================
    const shoulderY = torsoY + shoulderOffZ * 0.55; // shoulder height

    // Left shoulder joint ball (visual)
    const shoulderBallGeo = new THREE.SphereGeometry(0.032, 16, 16);
    const lShoulderBall = new THREE.Mesh(shoulderBallGeo, blue);
    lShoulderBall.position.set(-shoulderOffY, shoulderY, 0);
    this.robot.add(lShoulderBall);

    // LShoulderPitch pivot (arm forward/backward, rotates around Y-lateral axis)
    this.joints.LShoulderPitch = new THREE.Group();
    this.joints.LShoulderPitch.position.set(-shoulderOffY, shoulderY, 0);

    // LShoulderRoll pivot (arm in/out, child of pitch)
    this.joints.LShoulderRoll = new THREE.Group();
    this.joints.LShoulderPitch.add(this.joints.LShoulderRoll);

    // Upper arm mesh
    const upperArmGeo = new THREE.CylinderGeometry(0.022, 0.019, upperArmLen, 12);
    const lUpperArm = new THREE.Mesh(upperArmGeo, white);
    lUpperArm.position.set(0, -upperArmLen / 2, 0);
    this.joints.LShoulderRoll.add(lUpperArm);

    // Elbow joint ball (visual)
    const elbowBallGeo = new THREE.SphereGeometry(0.023, 16, 16);
    const lElbowBall = new THREE.Mesh(elbowBallGeo, blue);
    lElbowBall.position.set(0, -upperArmLen, 0);
    this.joints.LShoulderRoll.add(lElbowBall);

    // LElbowYaw pivot (forearm twist)
    this.joints.LElbowYaw = new THREE.Group();
    this.joints.LElbowYaw.position.set(0, -upperArmLen, 0);
    this.joints.LShoulderRoll.add(this.joints.LElbowYaw);

    // LElbowRoll pivot (forearm bend)
    this.joints.LElbowRoll = new THREE.Group();
    this.joints.LElbowYaw.add(this.joints.LElbowRoll);

    // Lower arm mesh
    const lowerArmGeo = new THREE.CylinderGeometry(0.017, 0.015, lowerArmLen, 12);
    const lLowerArm = new THREE.Mesh(lowerArmGeo, white);
    lLowerArm.position.set(0, -lowerArmLen / 2, 0);
    this.joints.LElbowRoll.add(lLowerArm);

    // LWristYaw pivot (wrist twist)
    this.joints.LWristYaw = new THREE.Group();
    this.joints.LWristYaw.position.set(0, -lowerArmLen, 0);
    this.joints.LElbowRoll.add(this.joints.LWristYaw);

    // Wrist ball (visual)
    const wristBallGeo = new THREE.SphereGeometry(0.015, 12, 12);
    const lWristBall = new THREE.Mesh(wristBallGeo, lightGrey);
    this.joints.LWristYaw.add(lWristBall);

    // LHand (open/close) — simplified as a flat box
    this.joints.LHand = new THREE.Group();
    this.joints.LWristYaw.add(this.joints.LHand);

    const handGeo = new THREE.BoxGeometry(0.03, 0.05, 0.02);
    const lHand = new THREE.Mesh(handGeo, darkGrey);
    lHand.position.set(0, -0.03, 0);
    this.joints.LHand.add(lHand);

    // Finger hints (3 small bumps)
    const fingerGeo = new THREE.BoxGeometry(0.008, 0.018, 0.015);
    for (let i = -1; i <= 1; i++) {
      const finger = new THREE.Mesh(fingerGeo, darkGrey);
      finger.position.set(i * 0.01, -0.06, 0);
      this.joints.LHand.add(finger);
    }

    this.robot.add(this.joints.LShoulderPitch);

    // ================================================================
    //  RIGHT ARM (6 DOF — mirror of left)
    // ================================================================
    const rShoulderBall = new THREE.Mesh(shoulderBallGeo, blue);
    rShoulderBall.position.set(shoulderOffY, shoulderY, 0);
    this.robot.add(rShoulderBall);

    this.joints.RShoulderPitch = new THREE.Group();
    this.joints.RShoulderPitch.position.set(shoulderOffY, shoulderY, 0);

    this.joints.RShoulderRoll = new THREE.Group();
    this.joints.RShoulderPitch.add(this.joints.RShoulderRoll);

    const rUpperArm = new THREE.Mesh(upperArmGeo, white);
    rUpperArm.position.set(0, -upperArmLen / 2, 0);
    this.joints.RShoulderRoll.add(rUpperArm);

    const rElbowBall = new THREE.Mesh(elbowBallGeo, blue);
    rElbowBall.position.set(0, -upperArmLen, 0);
    this.joints.RShoulderRoll.add(rElbowBall);

    this.joints.RElbowYaw = new THREE.Group();
    this.joints.RElbowYaw.position.set(0, -upperArmLen, 0);
    this.joints.RShoulderRoll.add(this.joints.RElbowYaw);

    this.joints.RElbowRoll = new THREE.Group();
    this.joints.RElbowYaw.add(this.joints.RElbowRoll);

    const rLowerArm = new THREE.Mesh(lowerArmGeo, white);
    rLowerArm.position.set(0, -lowerArmLen / 2, 0);
    this.joints.RElbowRoll.add(rLowerArm);

    this.joints.RWristYaw = new THREE.Group();
    this.joints.RWristYaw.position.set(0, -lowerArmLen, 0);
    this.joints.RElbowRoll.add(this.joints.RWristYaw);

    const rWristBall = new THREE.Mesh(wristBallGeo, lightGrey);
    this.joints.RWristYaw.add(rWristBall);

    this.joints.RHand = new THREE.Group();
    this.joints.RWristYaw.add(this.joints.RHand);

    const rHand = new THREE.Mesh(handGeo, darkGrey);
    rHand.position.set(0, -0.03, 0);
    this.joints.RHand.add(rHand);

    for (let i = -1; i <= 1; i++) {
      const finger = new THREE.Mesh(fingerGeo, darkGrey);
      finger.position.set(i * 0.01, -0.06, 0);
      this.joints.RHand.add(finger);
    }

    this.robot.add(this.joints.RShoulderPitch);

    // ================================================================
    //  PELVIS / HIP — LHipYawPitch (1 shared DOF)
    // ================================================================
    // Hip joint balls (visual)
    const hipBallGeo = new THREE.SphereGeometry(0.03, 16, 16);
    const lHipBall = new THREE.Mesh(hipBallGeo, blue);
    lHipBall.position.set(-hipOffsetY, torsoY - hipOffsetZ, 0);
    this.robot.add(lHipBall);

    const rHipBall = new THREE.Mesh(hipBallGeo, blue);
    rHipBall.position.set(hipOffsetY, torsoY - hipOffsetZ, 0);
    this.robot.add(rHipBall);

    // Pelvis connecting bar
    const pelvisGeo = new THREE.BoxGeometry(hipOffsetY * 2, 0.025, 0.04);
    const pelvis = new THREE.Mesh(pelvisGeo, white);
    pelvis.position.set(0, torsoY - hipOffsetZ + 0.015, 0);
    this.robot.add(pelvis);

    // ================================================================
    //  LEFT LEG (5 DOF + shared HipYawPitch)
    //  Chain: HipYawPitch → HipRoll → HipPitch → Knee → AnklePitch → AnkleRoll
    // ================================================================
    const hipY = torsoY - hipOffsetZ;

    // LHipYawPitch (shared motor — diagonal rotation axis)
    this.joints.LHipYawPitch = new THREE.Group();
    this.joints.LHipYawPitch.position.set(-hipOffsetY, hipY, 0);

    // LHipRoll
    this.joints.LHipRoll = new THREE.Group();
    this.joints.LHipYawPitch.add(this.joints.LHipRoll);

    // LHipPitch
    this.joints.LHipPitch = new THREE.Group();
    this.joints.LHipRoll.add(this.joints.LHipPitch);

    // Left thigh mesh
    const thighGeo = new THREE.CylinderGeometry(0.028, 0.025, thighLen, 12);
    const lThigh = new THREE.Mesh(thighGeo, white);
    lThigh.position.set(0, -thighLen / 2, 0);
    this.joints.LHipPitch.add(lThigh);

    // LKneePitch
    this.joints.LKneePitch = new THREE.Group();
    this.joints.LKneePitch.position.set(0, -thighLen, 0);
    this.joints.LHipPitch.add(this.joints.LKneePitch);

    // Knee ball (visual)
    const kneeBallGeo = new THREE.SphereGeometry(0.028, 16, 16);
    const lKneeBall = new THREE.Mesh(kneeBallGeo, blue);
    this.joints.LKneePitch.add(lKneeBall);

    // Left tibia mesh
    const tibiaGeo = new THREE.CylinderGeometry(0.025, 0.022, tibiaLen, 12);
    const lTibia = new THREE.Mesh(tibiaGeo, white);
    lTibia.position.set(0, -tibiaLen / 2, 0);
    this.joints.LKneePitch.add(lTibia);

    // LAnklePitch
    this.joints.LAnklePitch = new THREE.Group();
    this.joints.LAnklePitch.position.set(0, -tibiaLen, 0);
    this.joints.LKneePitch.add(this.joints.LAnklePitch);

    // Ankle ball (visual)
    const ankleBallGeo = new THREE.SphereGeometry(0.022, 12, 12);
    const lAnkleBall = new THREE.Mesh(ankleBallGeo, lightGrey);
    this.joints.LAnklePitch.add(lAnkleBall);

    // LAnkleRoll
    this.joints.LAnkleRoll = new THREE.Group();
    this.joints.LAnklePitch.add(this.joints.LAnkleRoll);

    // Left foot
    const footGeo = new THREE.BoxGeometry(0.07, 0.02, 0.12);
    const lFoot = new THREE.Mesh(footGeo, darkGrey);
    lFoot.position.set(0, -footHeight + 0.01, 0.01);
    this.joints.LAnkleRoll.add(lFoot);

    // Foot sole accent
    const soleGeo = new THREE.BoxGeometry(0.065, 0.003, 0.115);
    const lSole = new THREE.Mesh(soleGeo, lightGrey);
    lSole.position.set(0, -footHeight, 0.01);
    this.joints.LAnkleRoll.add(lSole);

    this.robot.add(this.joints.LHipYawPitch);

    // ================================================================
    //  RIGHT LEG (5 DOF + shared HipYawPitch — mirror of left)
    // ================================================================
    this.joints.RHipYawPitch = new THREE.Group();
    this.joints.RHipYawPitch.position.set(hipOffsetY, hipY, 0);

    this.joints.RHipRoll = new THREE.Group();
    this.joints.RHipYawPitch.add(this.joints.RHipRoll);

    this.joints.RHipPitch = new THREE.Group();
    this.joints.RHipRoll.add(this.joints.RHipPitch);

    const rThigh = new THREE.Mesh(thighGeo, white);
    rThigh.position.set(0, -thighLen / 2, 0);
    this.joints.RHipPitch.add(rThigh);

    this.joints.RKneePitch = new THREE.Group();
    this.joints.RKneePitch.position.set(0, -thighLen, 0);
    this.joints.RHipPitch.add(this.joints.RKneePitch);

    const rKneeBall = new THREE.Mesh(kneeBallGeo, blue);
    this.joints.RKneePitch.add(rKneeBall);

    const rTibia = new THREE.Mesh(tibiaGeo, white);
    rTibia.position.set(0, -tibiaLen / 2, 0);
    this.joints.RKneePitch.add(rTibia);

    this.joints.RAnklePitch = new THREE.Group();
    this.joints.RAnklePitch.position.set(0, -tibiaLen, 0);
    this.joints.RKneePitch.add(this.joints.RAnklePitch);

    const rAnkleBall = new THREE.Mesh(ankleBallGeo, lightGrey);
    this.joints.RAnklePitch.add(rAnkleBall);

    this.joints.RAnkleRoll = new THREE.Group();
    this.joints.RAnklePitch.add(this.joints.RAnkleRoll);

    const rFoot = new THREE.Mesh(footGeo, darkGrey);
    rFoot.position.set(0, -footHeight + 0.01, 0.01);
    this.joints.RAnkleRoll.add(rFoot);

    const rSole = new THREE.Mesh(soleGeo, lightGrey);
    rSole.position.set(0, -footHeight, 0.01);
    this.joints.RAnkleRoll.add(rSole);

    this.robot.add(this.joints.RHipYawPitch);

    // ================================================================
    //  Final setup
    // ================================================================
    this.robot.position.set(0, 0, 0);
    this.scene.add(this.robot);

    // Shadows
    this.robot.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });

    // Store convenient aliases for animation (backward-compat with old code)
    this.parts.headPivot = this.joints.HeadYaw;
    this.parts.headPitch = this.joints.HeadPitch;
    this.parts.leftUpperArmPivot = this.joints.LShoulderPitch;
    this.parts.leftLowerArmPivot = this.joints.LElbowRoll;
    this.parts.rightUpperArmPivot = this.joints.RShoulderPitch;
    this.parts.rightLowerArmPivot = this.joints.RElbowRoll;
  }

  // ── Animation loop ──

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.animationTime += 0.016; // ~60fps

    // Process active movement (turn/walk interpolation)
    this._updateMovement();

    if (this.currentAnimation === 'pose') {
      this.animatePose();
    } else if (this.currentAnimation === 'idle') {
      this.animateIdle();
    } else if (this.currentAnimation === 'talking') {
      this.animateTalking();
    } else if (this.currentAnimation === 'waving') {
      this.animateWaving();
    } else if (this.currentAnimation === 'walking') {
      this.animateWalking();
    } else if (this.currentAnimation === 'turning') {
      this.animateTurning();
    } else if (this.currentAnimation === 'sitting') {
      this.animateSitting();
    }

    if (this.controls) {
      this.controls.update();
    }
    this.renderer.render(this.scene, this.camera);
  }

  /** Reset all joints to zero (standing pose) */
  _resetJoints() {
    for (const name in this.joints) {
      const j = this.joints[name];
      j.rotation.set(0, 0, 0);
    }
    if (this.parts.mouth) this.parts.mouth.scale.y = 1;
  }

  animateIdle() {
    const t = this.animationTime;

    // If we have active joint targets, use pose mode instead of resetting
    if (Object.keys(this.jointTargets).length > 0) {
      this.animatePose();
      return;
    }

    this._resetJoints();

    // Subtle breathing: slight torso lift
    if (this.parts.torso) {
      this.parts.torso.position.y = 0.333 + Math.sin(t * 1.5) * 0.002;
    }
    // Gentle head look-around
    if (this.joints.HeadYaw) {
      this.joints.HeadYaw.rotation.y = Math.sin(t * 0.5) * 0.03;
    }
  }

  /**
   * Pose mode: smoothly interpolate each joint toward its target angle.
   * Does NOT call _resetJoints() — preserves manually-set joint positions.
   */
  animatePose() {
    const dt = 0.016; // ~60fps frame time
    const defaultSpeed = 2.0; // radians per second (smooth but visible)

    for (const name in this.jointTargets) {
      const joint = this.joints[name];
      if (!joint) continue;

      const target = this.jointTargets[name];
      const speed = this.jointSpeeds[name] || defaultSpeed;
      const maxDelta = speed * dt;

      // Use the explicit axis lookup
      const axis = this._jointAxis(name);

      const current = joint.rotation[axis];
      const diff = target - current;

      if (Math.abs(diff) < 0.005) {
        // Close enough — snap to target
        joint.rotation[axis] = target;
      } else {
        // Lerp toward target
        joint.rotation[axis] = current + Math.sign(diff) * Math.min(Math.abs(diff), maxDelta);
      }
    }

    // Subtle breathing while posing (keep it alive)
    if (this.parts.torso) {
      const t = this.animationTime;
      this.parts.torso.position.y = 0.333 + Math.sin(t * 1.5) * 0.001;
    }
  }

  animateTalking() {
    const t = this.animationTime;

    // If we have joint targets, preserve them (pose + talk mode)
    if (Object.keys(this.jointTargets).length > 0) {
      this.animatePose();
    } else {
      this._resetJoints();
      // Default head bobs only when no custom pose is active
      if (this.joints.HeadYaw) {
        this.joints.HeadYaw.rotation.y = Math.sin(t * 1.2) * 0.06;
      }
      if (this.joints.HeadPitch) {
        this.joints.HeadPitch.rotation.x = Math.sin(t * 3) * 0.04;
      }
    }

    // Mouth flaps (always animate during speech)
    if (this.parts.mouth) {
      this.parts.mouth.scale.y = 1 + Math.abs(Math.sin(t * 12)) * 2;
    }

    // Body sway
    if (this.parts.torso) {
      this.parts.torso.position.y = 0.333 + Math.sin(t * 2) * 0.003;
    }

    // Eyes glow brighter when talking
    if (this.parts.leftEye) {
      this.parts.leftEye.material.emissiveIntensity = 0.3 + Math.sin(t * 8) * 0.2;
    }
    if (this.parts.rightEye) {
      this.parts.rightEye.material.emissiveIntensity = 0.3 + Math.sin(t * 8) * 0.2;
    }
  }

  animateWaving() {
    const t = this.animationTime;
    this._resetJoints();

    // Right arm waves using proper joints
    // RShoulderPitch: arm raised forward/up
    if (this.joints.RShoulderPitch) {
      this.joints.RShoulderPitch.rotation.x = -1.2; // raise arm up
    }
    // RShoulderRoll: arm out to the side
    if (this.joints.RShoulderRoll) {
      this.joints.RShoulderRoll.rotation.z = -0.3;
    }
    // RElbowRoll: bend forearm
    if (this.joints.RElbowRoll) {
      this.joints.RElbowRoll.rotation.x = 0.6;
    }
    // RWristYaw: wave motion
    if (this.joints.RWristYaw) {
      this.joints.RWristYaw.rotation.z = Math.sin(t * 5) * 0.5;
    }

    // Head looks at "audience"
    if (this.joints.HeadYaw) {
      this.joints.HeadYaw.rotation.y = Math.sin(t * 1) * 0.1;
    }
    if (this.joints.HeadPitch) {
      this.joints.HeadPitch.rotation.x = -0.05;
    }

    // Idle body
    if (this.parts.torso) {
      this.parts.torso.position.y = 0.333 + Math.sin(t * 1.5) * 0.002;
    }
  }

  animateWalking() {
    const t = this.animationTime;
    this._resetJoints();

    // Walking gait cycle — legs alternate
    const gaitSpeed = 4.0; // cycles per second
    const phase = t * gaitSpeed;

    // Hip pitch: forward/backward leg swing
    const hipSwing = 0.35;
    if (this.joints.LHipPitch) {
      this.joints.LHipPitch.rotation.x = Math.sin(phase) * hipSwing;
    }
    if (this.joints.RHipPitch) {
      this.joints.RHipPitch.rotation.x = Math.sin(phase + Math.PI) * hipSwing;
    }

    // Knee pitch: bend on lift phase (only bend when leg swings forward)
    const kneeMax = 0.5;
    if (this.joints.LKneePitch) {
      const lKnee = Math.max(0, Math.sin(phase)) * kneeMax;
      this.joints.LKneePitch.rotation.x = lKnee;
    }
    if (this.joints.RKneePitch) {
      const rKnee = Math.max(0, Math.sin(phase + Math.PI)) * kneeMax;
      this.joints.RKneePitch.rotation.x = rKnee;
    }

    // Ankle pitch: compensate to keep feet flat
    if (this.joints.LAnklePitch) {
      this.joints.LAnklePitch.rotation.x = -Math.sin(phase) * hipSwing * 0.3;
    }
    if (this.joints.RAnklePitch) {
      this.joints.RAnklePitch.rotation.x = -Math.sin(phase + Math.PI) * hipSwing * 0.3;
    }

    // Arms swing opposite to legs (natural gait)
    const armSwing = 0.3;
    if (this.joints.LShoulderPitch) {
      this.joints.LShoulderPitch.rotation.x = Math.sin(phase + Math.PI) * armSwing;
    }
    if (this.joints.RShoulderPitch) {
      this.joints.RShoulderPitch.rotation.x = Math.sin(phase) * armSwing;
    }

    // Slight elbow bend while walking
    if (this.joints.LElbowRoll) {
      this.joints.LElbowRoll.rotation.x = -0.15;
    }
    if (this.joints.RElbowRoll) {
      this.joints.RElbowRoll.rotation.x = -0.15;
    }

    // Subtle torso sway side-to-side
    if (this.parts.torso) {
      this.parts.torso.position.y = 0.333 + Math.sin(phase * 2) * 0.003;
      this.parts.torso.rotation.z = Math.sin(phase) * 0.02;
    }

    // Head stays mostly stable, slight bob
    if (this.joints.HeadPitch) {
      this.joints.HeadPitch.rotation.x = Math.sin(phase * 2) * 0.015;
    }
  }

  animateSitting() {
    this._resetJoints();

    // Sitting pose: legs bent forward, torso lowered
    if (this.joints.LHipPitch) {
      this.joints.LHipPitch.rotation.x = -1.0;
    }
    if (this.joints.RHipPitch) {
      this.joints.RHipPitch.rotation.x = -1.0;
    }
    if (this.joints.LKneePitch) {
      this.joints.LKneePitch.rotation.x = 1.0;
    }
    if (this.joints.RKneePitch) {
      this.joints.RKneePitch.rotation.x = 1.0;
    }
    if (this.joints.LAnklePitch) {
      this.joints.LAnklePitch.rotation.x = 0.5;
    }
    if (this.joints.RAnklePitch) {
      this.joints.RAnklePitch.rotation.x = 0.5;
    }

    // Arms resting on legs
    if (this.joints.LShoulderPitch) {
      this.joints.LShoulderPitch.rotation.x = 0.8;
    }
    if (this.joints.RShoulderPitch) {
      this.joints.RShoulderPitch.rotation.x = 0.8;
    }

    // Lower torso
    if (this.parts.torso) {
      this.parts.torso.position.y = 0.23;
    }

    // Slight head tilt down
    if (this.joints.HeadPitch) {
      this.joints.HeadPitch.rotation.x = 0.1;
    }
  }

  /**
   * Smoothly turn the robot by a delta angle (radians) over duration (ms).
   * Calls callback when complete.
   */
  turnBy(deltaAngle, durationMs, callback) {
    const startHeading = this.heading;
    const endHeading = startHeading + deltaAngle;
    this._move = {
      type: 'turn',
      startVal: startHeading,
      endVal: endHeading,
      startTime: performance.now(),
      duration: durationMs,
      callback: callback || null,
    };
    this.currentAnimation = 'turning';
  }

  /**
   * Walk the robot forward (in its current heading direction) by distance (meters)
   * over duration (ms). Moves the robot group in the scene.
   */
  walkForward(distance, durationMs, callback) {
    if (!this.robot) { if (callback) callback(); return; }
    const startX = this.robot.position.x;
    const startZ = this.robot.position.z;
    // In Three.js: robot.rotation.y = heading. Forward is -Z when heading=0,
    // but we placed NAO facing +Z (toward camera). NAO's +x (forward) maps to Three.js +Z initially.
    // After rotation by heading around Y: forward = (sin(heading), 0, cos(heading))
    const endX = startX + Math.sin(this.heading) * distance;
    const endZ = startZ + Math.cos(this.heading) * distance;
    this._move = {
      type: 'walk',
      startX, startZ, endX, endZ,
      startTime: performance.now(),
      duration: durationMs,
      callback: callback || null,
    };
    this.currentAnimation = 'walking';
  }

  /**
   * Called each frame to process active turn/walk movement interpolation.
   */
  _updateMovement() {
    if (!this._move) return;

    const now = performance.now();
    const elapsed = now - this._move.startTime;
    // Smooth ease-in-out
    let t = Math.min(1, elapsed / this._move.duration);
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    if (this._move.type === 'turn') {
      const angle = this._move.startVal + (this._move.endVal - this._move.startVal) * ease;
      if (this.robot) this.robot.rotation.y = angle;
      if (t >= 1) {
        this.heading = this._move.endVal;
        if (this.robot) this.robot.rotation.y = this.heading;
        const cb = this._move.callback;
        this._move = null;
        this.currentAnimation = 'idle';
        if (cb) cb();
      }
    } else if (this._move.type === 'walk') {
      const cx = this._move.startX + (this._move.endX - this._move.startX) * ease;
      const cz = this._move.startZ + (this._move.endZ - this._move.startZ) * ease;
      if (this.robot) {
        this.robot.position.x = cx;
        this.robot.position.z = cz;
      }
      if (t >= 1) {
        if (this.robot) {
          this.robot.position.x = this._move.endX;
          this.robot.position.z = this._move.endZ;
        }
        const cb = this._move.callback;
        this._move = null;
        this.currentAnimation = 'idle';
        if (cb) cb();
      }
    }
  }

  animateTurning() {
    const t = this.animationTime;
    this._resetJoints();

    // Subtle weight shift while turning — small hip sway
    if (this.parts.torso) {
      this.parts.torso.position.y = 0.333;
    }

    // Small stepping motion (feet shuffle)
    const shuffleSpeed = 6.0;
    const shuffleAmp = 0.12;
    if (this.joints.LHipPitch) {
      this.joints.LHipPitch.rotation.x = Math.sin(t * shuffleSpeed) * shuffleAmp;
    }
    if (this.joints.RHipPitch) {
      this.joints.RHipPitch.rotation.x = Math.sin(t * shuffleSpeed + Math.PI) * shuffleAmp;
    }
    if (this.joints.LKneePitch) {
      this.joints.LKneePitch.rotation.x = Math.max(0, Math.sin(t * shuffleSpeed)) * 0.15;
    }
    if (this.joints.RKneePitch) {
      this.joints.RKneePitch.rotation.x = Math.max(0, Math.sin(t * shuffleSpeed + Math.PI)) * 0.15;
    }

    // Arms held slightly out for balance
    if (this.joints.LShoulderRoll) {
      this.joints.LShoulderRoll.rotation.z = 0.15;
    }
    if (this.joints.RShoulderRoll) {
      this.joints.RShoulderRoll.rotation.z = -0.15;
    }
  }

  setAnimation(type) {
    this.currentAnimation = type;
  }

  stopAnimation() {
    this.currentAnimation = 'idle';
    this._move = null;
    // Clear all joint targets
    this.jointTargets = {};
    this.jointSpeeds = {};
    // Reset eye colors back to default cyan
    const defaultColor = new THREE.Color(0x00e5ff);
    if (this.parts.leftEye) {
      this.parts.leftEye.material.color.copy(defaultColor);
      this.parts.leftEye.material.emissive.copy(defaultColor);
      this.parts.leftEye.material.emissiveIntensity = 0.3;
    }
    if (this.parts.rightEye) {
      this.parts.rightEye.material.color.copy(defaultColor);
      this.parts.rightEye.material.emissive.copy(defaultColor);
      this.parts.rightEye.material.emissiveIntensity = 0.3;
    }
    // Reset all joints to neutral position
    for (const name in this.joints) {
      this.joints[name].rotation.set(0, 0, 0);
    }
  }

  /** Reset robot position and heading to origin (for re-running code) */
  resetPosition() {
    this.heading = 0;
    this._move = null;
    this.jointTargets = {};
    this.jointSpeeds = {};
    if (this.robot) {
      this.robot.position.set(0, 0, 0);
      this.robot.rotation.y = 0;
    }
  }

  /**
   * Get the rotation axis character ('x', 'y', or 'z') for a given joint.
   * Based on the actual 3D model hierarchy — NOT a simple name-based rule,
   * because some joints (ElbowRoll, WristYaw) use a different axis than
   * their name implies due to the kinematic chain orientation.
   */
  _jointAxis(jointName) {
    // Explicit lookup for joints whose axis differs from the name convention
    const AXIS_MAP = {
      // Head
      HeadYaw: 'y', HeadPitch: 'x',
      // Shoulders
      LShoulderPitch: 'x', RShoulderPitch: 'x',
      LShoulderRoll: 'z',  RShoulderRoll: 'z',
      // Elbows — ElbowRoll uses X (bend), not Z!
      LElbowYaw: 'y',  RElbowYaw: 'y',
      LElbowRoll: 'x',  RElbowRoll: 'x',
      // Wrists — WristYaw uses Z in this model, not Y!
      LWristYaw: 'z', RWristYaw: 'z',
      // Hands
      LHand: 'x', RHand: 'x',
      // Hips
      LHipYawPitch: 'y',
      LHipRoll: 'z',  RHipRoll: 'z',
      LHipPitch: 'x', RHipPitch: 'x',
      // Knees
      LKneePitch: 'x', RKneePitch: 'x',
      // Ankles
      LAnklePitch: 'x', RAnklePitch: 'x',
      LAnkleRoll: 'z',  RAnkleRoll: 'z',
    };
    return AXIS_MAP[jointName] || (jointName.includes('Pitch') ? 'x' : jointName.includes('Yaw') ? 'y' : 'z');
  }

  /**
   * Set a target joint angle (radians). The joint will smoothly animate
   * toward this angle in 'pose' mode.
   * Joint names match NAO V6: HeadYaw, HeadPitch, LShoulderPitch, etc.
   * @param {string} jointName
   * @param {number} angle - target angle in radians
   * @param {number} [duration] - optional time in seconds to reach the angle
   */
  setJointAngle(jointName, angle, duration) {
    const joint = this.joints[jointName];
    if (!joint) return;

    this.jointTargets[jointName] = angle;

    // Calculate speed based on how far the joint needs to travel and the desired duration
    if (duration && duration > 0) {
      const axis = this._jointAxis(jointName);
      const currentAngle = joint.rotation[axis];
      const distance = Math.abs(angle - currentAngle);
      this.jointSpeeds[jointName] = Math.max(0.5, distance / duration);
    } else {
      this.jointSpeeds[jointName] = 3.0; // fast default
    }

    // Switch to pose mode (preserves joint angles)
    if (this.currentAnimation !== 'walking' && this.currentAnimation !== 'turning') {
      this.currentAnimation = 'pose';
    }
  }

  /**
   * Set all joints to target angle 0 (standing neutral) with smooth animation.
   */
  resetJointsSmooth(duration) {
    const speed = duration || 0.8;
    for (const name in this.joints) {
      this.jointTargets[name] = 0;
      this.jointSpeeds[name] = 2.0 / speed;
    }
    this.currentAnimation = 'pose';
  }

  /**
   * Get all joint names (for reference / debugging).
   */
  getJointNames() {
    return Object.keys(this.joints);
  }

  onResize() {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.animationId = null;
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
    this.robot = null;
    this.joints = {};
    this.parts = {};
  }
}
