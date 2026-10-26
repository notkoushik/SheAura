import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Rotate3d, Sparkles, Eye, ArrowRight, Check } from "lucide-react";

export interface LipstickShade {
  id: string;
  name: string;
  hex: string;
  colorHex: number;
  description: string;
  finish: string;
}

export const LIPSTICK_SHADES: LipstickShade[] = [
  {
    id: "scarlet-rose",
    name: "Scarlet Rose",
    hex: "#9e1923",
    colorHex: 0x9e1923,
    description: "Iconic Velvet Damask Crimson · Signature Maison Glide",
    finish: "Hydrating Matte",
  },
  {
    id: "roseberry",
    name: "Roseberry",
    hex: "#6c1c38",
    colorHex: 0x6c1c38,
    description: "Deep Ripe Mulberry · Noir Evening Allure",
    finish: "Velvet Satin",
  },
  {
    id: "blush-rose",
    name: "Blush Rose",
    hex: "#b86d6d",
    colorHex: 0xb86d6d,
    description: "Sunlit Dusty Petal Nude · Bare Lip Sophistication",
    finish: "Hydrating Matte",
  },
  {
    id: "orchid",
    name: "Orchid",
    hex: "#7d345b",
    colorHex: 0x7d345b,
    description: "Smoked Mauve Plum · Contemporary Botanical Pigment",
    finish: "Velvet Matte",
  },
];

interface Lipstick3DViewerProps {
  onSelectShade?: (shade: LipstickShade) => void;
  onOpenPdp?: (shade: LipstickShade) => void;
}

export default function Lipstick3DViewer({ onSelectShade, onOpenPdp }: Lipstick3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeShade, setActiveShade] = useState<LipstickShade>(LIPSTICK_SHADES[0]);
  const [isTwistedUp, setIsTwistedUp] = useState(true);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [viewMode, setViewMode] = useState<"3d" | "photo">("3d");
  const [hasInteracted, setHasInteracted] = useState(false);

  // References for live Three.js scene updates
  const bulletMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const bulletGroupRef = useRef<THREE.Group | null>(null);
  const targetColorRef = useRef<THREE.Color>(new THREE.Color(LIPSTICK_SHADES[0].colorHex));
  const targetBulletYRef = useRef<number>(1.25);
  const targetRotationYRef = useRef<number>(0.35);
  const targetRotationXRef = useRef<number>(0.15);

  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const idleTimerRef = useRef<number | null>(null);

  // Handle shade selection
  const handleShadeChange = (shade: LipstickShade) => {
    setActiveShade(shade);
    targetColorRef.current = new THREE.Color(shade.colorHex);
    onSelectShade?.(shade);
  };

  // Toggle bullet twist up / down
  const toggleTwist = () => {
    const nextState = !isTwistedUp;
    setIsTwistedUp(nextState);
    targetBulletYRef.current = nextState ? 1.25 : 0.2;
  };

  // Generate embossed floral bump map texture
  const createFloralBumpTexture = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, 512, 512);

    // Procedural delicate botanical floral relief lines
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const cy = 60 + i * 65;
      // Rose petal curves
      ctx.moveTo(120, cy);
      ctx.bezierCurveTo(200, cy - 35, 312, cy + 35, 392, cy);
      ctx.moveTo(140, cy + 18);
      ctx.bezierCurveTo(220, cy + 45, 300, cy - 25, 370, cy + 15);
    }
    ctx.stroke();

    // Subtle bird flight feather accents
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let j = 0; j < 5; j++) {
      const by = 90 + j * 80;
      ctx.moveTo(220, by);
      ctx.quadraticCurveTo(256, by - 20, 292, by);
    }
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 4);
    return texture;
  }, []);

  // Generate She'Aura engraved gold logo texture for casing front
  const createCasingLogoTexture = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Base Champagne Gold Gradient
    const grad = ctx.createLinearGradient(0, 0, 512, 1024);
    grad.addColorStop(0, "#e8c59c");
    grad.addColorStop(0.3, "#fff2e0");
    grad.addColorStop(0.7, "#dfb895");
    grad.addColorStop(1, "#c59868");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 1024);

    // Vertical Debossed Brand Text "SHE'AURA"
    ctx.save();
    ctx.translate(256, 520);
    ctx.rotate(-Math.PI / 2);
    ctx.font = "bold 68px 'Cormorant Garamond', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "0.22em";

    // Subtle debossed shadow
    ctx.fillStyle = "rgba(43, 10, 5, 0.35)";
    ctx.fillText("SHE'AURA", 2, 2);

    // Metallic Midnight Navy Engraving
    ctx.fillStyle = "#191970";
    ctx.fillText("SHE'AURA", 0, 0);
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  useEffect(() => {
    if (viewMode !== "3d" || !mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 420;
    const height = container.clientHeight || 500;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(0, 0.3, 7.0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Procedural Studio Environment for Rich Gold Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x4a2a1d);

    const softbox1 = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff6ec })
    );
    softbox1.position.set(5, 6, 7);
    softbox1.lookAt(0, 0, 0);
    envScene.add(softbox1);

    const softbox2 = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({ color: 0xdfb895 })
    );
    softbox2.position.set(-6, 4, -4);
    softbox2.lookAt(0, 0, 0);
    envScene.add(softbox2);

    const softbox3 = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ color: 0xffedd5 })
    );
    softbox3.position.set(0, 9, 2);
    softbox3.lookAt(0, 0, 0);
    envScene.add(softbox3);

    scene.environment = pmremGenerator.fromScene(envScene).texture;

    // 2. Multi-point Luxury Studio Lighting Rig
    const frontKeyLight = new THREE.DirectionalLight(0xfffaef, 4.2);
    frontKeyLight.position.set(1.5, 4, 6);
    frontKeyLight.castShadow = true;
    scene.add(frontKeyLight);

    const topSoftboxLight = new THREE.DirectionalLight(0xffeedb, 3.8);
    topSoftboxLight.position.set(0, 8, 3);
    scene.add(topSoftboxLight);

    const goldRimLight = new THREE.DirectionalLight(0xdfb895, 3.2);
    goldRimLight.position.set(-5, 4, -4);
    scene.add(goldRimLight);

    const rubyBounceLight = new THREE.PointLight(0xa81920, 2.2, 14);
    rubyBounceLight.position.set(0, -1.8, 3.5);
    scene.add(rubyBounceLight);

    const ambientLight = new THREE.AmbientLight(0xfff2e5, 2.2);
    scene.add(ambientLight);

    // 3. Lipstick Master Hierarchy
    const masterGroup = new THREE.Group();
    masterGroup.position.set(0, -0.45, 0);
    scene.add(masterGroup);

    // Casing Materials with high-polish Champagne Gold Brass luster
    const casingTexture = createCasingLogoTexture();
    const goldMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xdfb895,
      metalness: 0.68,
      roughness: 0.22,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      reflectivity: 0.95,
      map: casingTexture || undefined,
    });

    const innerCollarMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5d2a4,
      metalness: 0.78,
      roughness: 0.16,
    });

    // Outer Gold Brass Casing Body (Beveled Rounded Rectangular Base)
    const casingShape = new THREE.Shape();
    const halfW = 0.82;
    const radius = 0.14;
    casingShape.moveTo(-halfW + radius, -halfW);
    casingShape.lineTo(halfW - radius, -halfW);
    casingShape.quadraticCurveTo(halfW, -halfW, halfW, -halfW + radius);
    casingShape.lineTo(halfW, halfW - radius);
    casingShape.quadraticCurveTo(halfW, halfW, halfW - radius, halfW);
    casingShape.lineTo(-halfW + radius, halfW);
    casingShape.quadraticCurveTo(-halfW, halfW, -halfW, halfW - radius);
    casingShape.lineTo(-halfW, -halfW + radius);
    casingShape.quadraticCurveTo(-halfW, -halfW, -halfW + radius, -halfW);

    const extrudeSettings = { depth: 2.8, bevelEnabled: true, bevelSegments: 6, steps: 1, bevelSize: 0.06, bevelThickness: 0.06 };
    const casingGeo = new THREE.ExtrudeGeometry(casingShape, extrudeSettings);
    casingGeo.center();
    const casingMesh = new THREE.Mesh(casingGeo, goldMaterial);
    casingMesh.rotation.x = Math.PI / 2;
    casingMesh.position.y = -0.5;
    casingMesh.castShadow = true;
    casingMesh.receiveShadow = true;
    masterGroup.add(casingMesh);

    // Inner Metallic Rotating Collar / Ring
    const collarGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.9, 48);
    const collarMesh = new THREE.Mesh(collarGeo, innerCollarMaterial);
    collarMesh.position.y = 1.15;
    masterGroup.add(collarMesh);

    // Stepped Inner Mechanism Collar
    const stepCollarGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.4, 48);
    const stepCollarMesh = new THREE.Mesh(stepCollarGeo, goldMaterial);
    stepCollarMesh.position.y = 1.55;
    masterGroup.add(stepCollarMesh);

    // 4. Lipstick Bullet with Beveled Teardrop Chisel Tip & Embossed Relief
    const floralBump = createFloralBumpTexture();
    const bulletMaterial = new THREE.MeshPhysicalMaterial({
      color: activeShade.colorHex,
      roughness: 0.52,
      metalness: 0.0,
      sheen: 1.0,
      sheenColor: new THREE.Color(0xff88a0),
      sheenRoughness: 0.4,
      clearcoat: 0.15,
      clearcoatRoughness: 0.2,
      bumpMap: floralBump || undefined,
      bumpScale: 0.045,
    });
    bulletMatRef.current = bulletMaterial;

    const bulletSpot = new THREE.SpotLight(0xffffff, 3.8, 16, Math.PI / 4, 0.4);
    bulletSpot.position.set(0, 4.5, 5.5);
    scene.add(bulletSpot);

    // Bullet Geometry with Sculpted Slant Angle
    const bulletRadius = 0.48;
    const bulletHeight = 1.65;
    const bulletGeo = new THREE.CylinderGeometry(bulletRadius, bulletRadius, bulletHeight, 48, 48);
    const posAttr = bulletGeo.attributes.position;

    // Displace vertices to carve the signature teardrop beveled slant tip
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const x = posAttr.getX(i);

      if (y > 0.15) {
        // Angled slant cut plane
        const slantOffset = (z / bulletRadius) * 0.42;
        posAttr.setY(i, y - slantOffset);

        // Taper upper teardrop tip
        if (y > 0.5) {
          const taper = 1.0 - (y - 0.5) * 0.28;
          posAttr.setX(i, x * taper);
        }
      }
    }
    bulletGeo.computeVertexNormals();

    const bulletGroup = new THREE.Group();
    bulletGroup.position.y = targetBulletYRef.current;
    const bulletMesh = new THREE.Mesh(bulletGeo, bulletMaterial);
    bulletMesh.castShadow = true;
    bulletGroup.add(bulletMesh);
    masterGroup.add(bulletGroup);
    bulletGroupRef.current = bulletGroup;

    // 5. Travertine Stone Pedestal & Fallen Crimson Rose Petals
    const pedestalGeo = new THREE.CylinderGeometry(2.1, 2.3, 0.55, 64);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xc8b8a6,
      roughness: 0.88,
      metalness: 0.02,
    });
    const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestalMesh.position.y = -2.1;
    pedestalMesh.receiveShadow = true;
    masterGroup.add(pedestalMesh);

    // Fallen Rose Petal Meshes
    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, -0.3);
    petalShape.bezierCurveTo(0.3, -0.2, 0.4, 0.3, 0, 0.5);
    petalShape.bezierCurveTo(-0.4, 0.3, -0.3, -0.2, 0, -0.3);
    const petalGeo = new THREE.ShapeGeometry(petalShape);
    const petalMat = new THREE.MeshPhysicalMaterial({
      color: 0x991820,
      roughness: 0.6,
      metalness: 0.05,
      sheen: 0.9,
      sheenColor: new THREE.Color(0xff4466),
      side: THREE.DoubleSide,
    });

    const petal1 = new THREE.Mesh(petalGeo, petalMat);
    petal1.position.set(1.1, -1.8, 0.6);
    petal1.rotation.set(-Math.PI / 2.3, 0.3, 0.4);
    petal1.scale.set(0.9, 0.9, 0.9);
    masterGroup.add(petal1);

    const petal2 = new THREE.Mesh(petalGeo, petalMat);
    petal2.position.set(-1.0, -1.81, 0.8);
    petal2.rotation.set(-Math.PI / 2.1, -0.4, -0.6);
    petal2.scale.set(0.75, 0.75, 0.75);
    masterGroup.add(petal2);

    // Initial angles
    masterGroup.rotation.y = targetRotationYRef.current;
    masterGroup.rotation.x = targetRotationXRef.current;

    // 6. Pointer & Drag Interaction Handlers
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDraggingRef.current = true;
      setHasInteracted(true);
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      lastPointerRef.current = { x: clientX, y: clientY };

      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - lastPointerRef.current.x;
      const dy = clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: clientX, y: clientY };

      targetRotationYRef.current += dx * 0.012;
      targetRotationXRef.current = Math.max(-0.25, Math.min(0.45, targetRotationXRef.current + dy * 0.008));
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
      // Resume gentle auto-rotation after 1.8s of idle
      idleTimerRef.current = window.setTimeout(() => {
        setIsAutoRotating(true);
      }, 1800);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);

    domEl.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp);

    // 7. Render Loop with Smooth Physics Interpolation
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Auto-rotation when not actively dragged
      if (isAutoRotating && !isDraggingRef.current) {
        targetRotationYRef.current += 0.008;
      }

      // Smooth rotational damping
      masterGroup.rotation.y += (targetRotationYRef.current - masterGroup.rotation.y) * 0.08;
      masterGroup.rotation.x += (targetRotationXRef.current - masterGroup.rotation.x) * 0.08;

      // Smooth color morphing when shade switches
      if (bulletMatRef.current) {
        bulletMatRef.current.color.lerp(targetColorRef.current, 0.1);
      }

      // Smooth bullet twist position
      if (bulletGroupRef.current) {
        bulletGroupRef.current.position.y += (targetBulletYRef.current - bulletGroupRef.current.position.y) * 0.12;
      }

      // Floating ambient bob
      masterGroup.position.y = -0.4 + Math.sin(clock.getElapsedTime() * 1.5) * 0.04;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Responsive Resize
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 420;
      const newH = container.clientHeight || 500;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      domEl.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      domEl.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }
    };
  }, [viewMode, createCasingLogoTexture, createFloralBumpTexture]);

  return (
    <div className="lipstick-3d-stage-wrapper">
      {/* 3D WebGL Canvas Container or Fallback Studio Still */}
      <div className="lipstick-3d-display-frame">
        {viewMode === "3d" ? (
          <div
            ref={mountRef}
            className="lipstick-3d-canvas-container"
            title="Drag with cursor/touch to inspect 360°"
          />
        ) : (
          <div className="lipstick-still-photo-container">
            <img
              src="/products/Minimal_design/Scarlet Rose Lipstick_still.png"
              alt="Scarlet Rose Lipstick Still Packshot on Travertine"
              className="lipstick-still-image"
            />
          </div>
        )}

        {/* Ambient Halo Studio Light Backing */}
        <div className="lipstick-halo-glow" />

        {/* Top Control Bar: 3D / Photo Mode & Twist Bullet */}
        <div className="lipstick-3d-top-controls">
          <div className="mode-toggle-pill">
            <button
              type="button"
              className={`mode-btn ${viewMode === "3d" ? "active" : ""}`}
              onClick={() => setViewMode("3d")}
              title="Interactive 3D WebGL Model"
            >
              <Rotate3d className="icon-mini" /> <span>3D Model</span>
            </button>
            <button
              type="button"
              className={`mode-btn ${viewMode === "photo" ? "active" : ""}`}
              onClick={() => setViewMode("photo")}
              title="High-Res Studio Still Packshot"
            >
              <Eye className="icon-mini" /> <span>Studio Still</span>
            </button>
          </div>

          {viewMode === "3d" && (
            <button
              type="button"
              className="twist-bullet-btn"
              onClick={toggleTwist}
              title="Twist bullet in/out of golden casing"
            >
              <Sparkles className="icon-mini" />
              <span>{isTwistedUp ? "Twist Down" : "Twist Up"}</span>
            </button>
          )}
        </div>

        {/* Floating Hint Overlay (Auto fades after interaction) */}
        {viewMode === "3d" && !hasInteracted && (
          <div className="lipstick-3d-hint-tag">
            <Rotate3d className="icon-mini spin-slow" />
            <span>Drag to rotate 360° · Tap shade to customize</span>
          </div>
        )}

        {/* Bottom Interactive Shade Switcher Glass Dock */}
        <div className="lipstick-shade-switcher-dock">
          <div className="dock-shade-info">
            <div className="dock-shade-header">
              <span className="dock-bullet-dot" style={{ background: activeShade.hex }} />
              <strong>{activeShade.name}</strong>
              <span className="dock-finish-badge">{activeShade.finish}</span>
            </div>
            <p className="dock-shade-desc">{activeShade.description}</p>
          </div>

          <div className="dock-shade-swatches">
            {LIPSTICK_SHADES.map((shade) => {
              const isSelected = shade.id === activeShade.id;
              return (
                <button
                  key={shade.id}
                  type="button"
                  className={`dock-swatch-btn ${isSelected ? "selected" : ""}`}
                  style={{ backgroundColor: shade.hex }}
                  onClick={() => handleShadeChange(shade)}
                  title={`${shade.name} · ${shade.finish}`}
                  aria-label={`Select shade ${shade.name}`}
                >
                  {isSelected && <Check className="swatch-check-icon" />}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="dock-pdp-action-btn"
            onClick={() => onOpenPdp?.(activeShade)}
            title={`View ${activeShade.name} Formula Details`}
          >
            <span>View Formula</span>
            <ArrowRight className="icon-mini" />
          </button>
        </div>
      </div>
    </div>
  );
}
