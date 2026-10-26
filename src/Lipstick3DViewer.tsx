import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Rotate3d, Sparkles, Eye, ArrowRight, Check } from "lucide-react";

export interface LipstickShade {
  id: string;
  name: string;
  hex: string;
  colorHex: number;
  description: string;
  finish: string;
  bulletTexture: string;
  stillPhoto: string;
}

export const LIPSTICK_SHADES: LipstickShade[] = [
  {
    id: "scarlet-rose",
    name: "Scarlet Rose",
    hex: "#b71d28",
    colorHex: 0xb71d28,
    description: "Iconic Velvet Damask Crimson · Hand-Carved Nightingale Relief",
    finish: "Hydrating Matte",
    bulletTexture: "/products/3D/refined/bullet_scarlet.jpg",
    stillPhoto: "/products/3D/red.jpg",
  },
  {
    id: "roseberry",
    name: "Roseberry",
    hex: "#7e1932",
    colorHex: 0x7e1932,
    description: "Deep Ripe Mulberry · Noir Imperial Allure",
    finish: "Velvet Satin",
    bulletTexture: "/products/3D/refined/bullet_roseberry.jpg",
    stillPhoto: "/products/3D/other.jpg",
  },
  {
    id: "blush-rose",
    name: "Blush Rose",
    hex: "#c46e72",
    colorHex: 0xc46e72,
    description: "Sunlit Dusty Petal Nude · Bare Lip Sophistication",
    finish: "Hydrating Matte",
    bulletTexture: "/products/3D/refined/bullet_blush.jpg",
    stillPhoto: "/products/3D/red.jpg",
  },
  {
    id: "orchid",
    name: "Orchid",
    hex: "#6b2247",
    colorHex: 0x6b2247,
    description: "Smoked Mauve Plum · Contemporary Botanical Pigment",
    finish: "Velvet Matte",
    bulletTexture: "/products/3D/refined/bullet_orchid.jpg",
    stillPhoto: "/products/3D/other.jpg",
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
  const [viewMode, setViewMode] = useState<"3d" | "photo">("3d");

  // References for live Three.js scene updates
  const bulletMeshRef = useRef<THREE.Mesh | null>(null);
  const bulletGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const targetBulletYRef = useRef<number>(1.85);
  const texturesMapRef = useRef<Map<string, THREE.Texture>>(new Map());

  // Handle shade selection
  const handleShadeChange = (shade: LipstickShade) => {
    setActiveShade(shade);
    onSelectShade?.(shade);

    if (bulletMeshRef.current) {
      const mat = bulletMeshRef.current.material as THREE.MeshPhysicalMaterial;
      const cachedTex = texturesMapRef.current.get(shade.id);
      if (cachedTex) {
        mat.map = cachedTex;
        mat.needsUpdate = true;
      }
      mat.color.setHex(shade.colorHex);
      mat.sheenColor.setHex(shade.colorHex);
    }
  };

  // Toggle bullet twist up / down
  const toggleTwist = () => {
    const nextState = !isTwistedUp;
    setIsTwistedUp(nextState);
    targetBulletYRef.current = nextState ? 1.85 : 0.72;
  };

  // Generate procedural contact shadow plane texture
  const createContactShadowTexture = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, 512, 512);
    const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 250);
    grad.addColorStop(0, "rgba(0, 0, 0, 0.75)");
    grad.addColorStop(0.35, "rgba(0, 0, 0, 0.45)");
    grad.addColorStop(0.7, "rgba(0, 0, 0, 0.12)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(256, 256, 250, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  useEffect(() => {
    if (viewMode !== "3d" || !mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 480;
    const height = container.clientHeight || 580;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(0, 0.22, 9.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.38;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 2. OrbitControls for smooth, natural 360 rotation
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;
    controls.enableZoom = false; // Prevent hijack of page scroll
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI / 3.4;
    controls.maxPolarAngle = Math.PI / 1.88;
    controls.target.set(0, 0.18, 0);

    // Pause auto-rotate during user drag; resume after 3.5s idle
    let resumeTimeout: number | null = null;
    controls.addEventListener("start", () => {
      controls.autoRotate = false;
      if (resumeTimeout) clearTimeout(resumeTimeout);
    });
    controls.addEventListener("end", () => {
      resumeTimeout = window.setTimeout(() => {
        controls.autoRotate = true;
      }, 3500);
    });

    // 3. PMREM Studio Environment for Rich Champagne Gold Metal Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x28140c);

    // Studio softbox 1: Front Key
    const softbox1 = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfffcf5 })
    );
    softbox1.position.set(4, 7, 7);
    softbox1.lookAt(0, 0, 0);
    envScene.add(softbox1);

    // Studio softbox 2: Gold Rim
    const softbox2 = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ color: 0xdfb895 })
    );
    softbox2.position.set(-6, 5, -4);
    softbox2.lookAt(0, 0, 0);
    envScene.add(softbox2);

    // Studio softbox 3: Top Ambient
    const softbox3 = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ color: 0xffeedd })
    );
    softbox3.position.set(0, 9, 2);
    softbox3.lookAt(0, 0, 0);
    envScene.add(softbox3);

    // Studio softbox 4: Ruby Bounce
    const softbox4 = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshBasicMaterial({ color: 0xa81920 })
    );
    softbox4.position.set(0, -5, 4);
    softbox4.lookAt(0, 0, 0);
    envScene.add(softbox4);

    scene.environment = pmremGenerator.fromScene(envScene).texture;

    // 4. Multi-Point Luxury Studio Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xfffaef, 4.4);
    keyLight.position.set(2.5, 4.5, 5.5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffecd6, 3.2);
    fillLight.position.set(-3.5, 3.0, 4.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xdfb895, 3.6);
    rimLight.position.set(-5, 4, -4);
    scene.add(rimLight);

    const topSoftLight = new THREE.DirectionalLight(0xffffff, 3.0);
    topSoftLight.position.set(0, 8, 2);
    scene.add(topSoftLight);

    const rubyBounce = new THREE.PointLight(0xa81920, 2.4, 12);
    rubyBounce.position.set(0, -1.5, 3.5);
    scene.add(rubyBounce);

    const ambientLight = new THREE.AmbientLight(0xfff2e5, 2.0);
    scene.add(ambientLight);

    // 5. Texture Loader & Caching
    const textureLoader = new THREE.TextureLoader();

    // Preload all shade textures
    LIPSTICK_SHADES.forEach((shade) => {
      textureLoader.load(shade.bulletTexture, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        texturesMapRef.current.set(shade.id, tex);

        if (shade.id === activeShade.id && bulletMeshRef.current) {
          (bulletMeshRef.current.material as THREE.MeshPhysicalMaterial).map = tex;
          (bulletMeshRef.current.material as THREE.MeshPhysicalMaterial).needsUpdate = true;
        }
      });
    });

    const bulletNormalMap = textureLoader.load("/products/3D/refined/bullet_normal_seamless.png");
    bulletNormalMap.wrapS = THREE.RepeatWrapping;
    bulletNormalMap.wrapT = THREE.ClampToEdgeWrapping;

    const bulletRoughnessMap = textureLoader.load("/products/3D/refined/bullet_roughness.png");
    bulletRoughnessMap.wrapS = THREE.RepeatWrapping;
    bulletRoughnessMap.wrapT = THREE.ClampToEdgeWrapping;

    const casingFrontTex = textureLoader.load("/products/3D/refined/sheaura_casing_vertical.jpg");
    casingFrontTex.colorSpace = THREE.SRGBColorSpace;

    // 6. Master Lipstick Group (Centered vertically at y=0)
    const masterGroup = new THREE.Group();
    masterGroup.position.set(0, -0.38, 0);
    scene.add(masterGroup);

    // Contact Ground Shadow Disc
    const shadowTex = createContactShadowTexture();
    if (shadowTex) {
      const shadowGeo = new THREE.PlaneGeometry(5.2, 5.2);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -1.93;
      masterGroup.add(shadowMesh);
    }

    // A. Square Polished Champagne Gold Casing Body
    const casingGeo = new RoundedBoxGeometry(1.48, 2.35, 1.48, 6, 0.08);
    const casingGoldMat = new THREE.MeshPhysicalMaterial({
      color: 0xecd5a4,
      metalness: 0.94,
      roughness: 0.14,
      clearcoat: 0.85,
      clearcoatRoughness: 0.1,
      reflectivity: 0.95,
      envMapIntensity: 2.8,
    });
    const casingMesh = new THREE.Mesh(casingGeo, casingGoldMat);
    casingMesh.position.y = -0.75;
    casingMesh.castShadow = true;
    casingMesh.receiveShadow = true;
    masterGroup.add(casingMesh);

    // Front Debossed Logo Plane (Authentic She'Aura Signature)
    const frontFaceGeo = new THREE.PlaneGeometry(1.38, 2.25);
    const frontFaceMat = new THREE.MeshPhysicalMaterial({
      map: casingFrontTex,
      metalness: 0.90,
      roughness: 0.16,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9,
      envMapIntensity: 2.5,
    });
    const frontFaceMesh = new THREE.Mesh(frontFaceGeo, frontFaceMat);
    frontFaceMesh.position.set(0, -0.75, 0.745);
    masterGroup.add(frontFaceMesh);

    // Casing Top Recess Collar Lip
    const casingTopRingGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.08, 48);
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x241710,
      metalness: 0.9,
      roughness: 0.3,
    });
    const casingTopRing = new THREE.Mesh(casingTopRingGeo, darkMetalMat);
    casingTopRing.position.y = 0.43;
    masterGroup.add(casingTopRing);

    // B. Inner Mirror Gold Collar (Sleek High-Polish Jewelry Neck)
    const collarGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.95, 64);
    const innerCollarMat = new THREE.MeshPhysicalMaterial({
      color: 0xffe0a0,
      metalness: 0.98,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 1.0,
      envMapIntensity: 3.2,
    });
    const collarMesh = new THREE.Mesh(collarGeo, innerCollarMat);
    collarMesh.position.y = 0.88;
    collarMesh.castShadow = true;
    masterGroup.add(collarMesh);

    // Beveled Torus Collar Rim
    const collarRimGeo = new THREE.TorusGeometry(0.52, 0.035, 16, 64);
    const collarRimMesh = new THREE.Mesh(collarRimGeo, innerCollarMat);
    collarRimMesh.rotation.x = Math.PI / 2;
    collarRimMesh.position.y = 1.355;
    masterGroup.add(collarRimMesh);

    // C. Sculpted Lipstick Bullet with Hand-Carved Imperial Bird & Floral Relief
    const bulletRadius = 0.44;
    const bulletHeight = 1.65;
    const bulletGeo = new THREE.CylinderGeometry(bulletRadius, bulletRadius, bulletHeight, 64, 64);
    const posAttr = bulletGeo.attributes.position;

    // Mathematical teardrop chisel cut
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const x = posAttr.getX(i);

      if (y > 0.12) {
        // Angled chisel slant cut
        const slantOffset = (z / bulletRadius) * 0.42;
        posAttr.setY(i, y - slantOffset);

        // Taper upper teardrop tip
        if (y > 0.42) {
          const taper = 1.0 - (y - 0.42) * 0.28;
          posAttr.setX(i, x * taper);
        }
      }
    }
    bulletGeo.computeVertexNormals();

    const bulletMaterial = new THREE.MeshPhysicalMaterial({
      color: activeShade.colorHex,
      roughness: 0.58,
      roughnessMap: bulletRoughnessMap,
      metalness: 0.02,
      sheen: 0.88,
      sheenColor: new THREE.Color(activeShade.colorHex),
      sheenRoughness: 0.38,
      clearcoat: 0.12,
      clearcoatRoughness: 0.18,
      normalMap: bulletNormalMap,
      normalScale: new THREE.Vector2(1.3, 1.3),
    });

    const activeTexture = texturesMapRef.current.get(activeShade.id);
    if (activeTexture) {
      bulletMaterial.map = activeTexture;
    }

    const bulletMesh = new THREE.Mesh(bulletGeo, bulletMaterial);
    bulletMesh.castShadow = true;
    bulletMeshRef.current = bulletMesh;

    const bulletGroup = new THREE.Group();
    bulletGroup.position.y = targetBulletYRef.current;
    bulletGroup.add(bulletMesh);
    bulletGroupRef.current = bulletGroup;
    masterGroup.add(bulletGroup);

    // 7. Animation Loop with Smooth Damped Twisting & Orbit
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      clock.getDelta();

      // Smooth twist up / down animation
      if (bulletGroupRef.current) {
        bulletGroupRef.current.position.y += (targetBulletYRef.current - bulletGroupRef.current.position.y) * 0.08;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      if (resumeTimeout) clearTimeout(resumeTimeout);
      controls.dispose();
      renderer.dispose();
      pmremGenerator.dispose();
      casingGeo.dispose();
      collarGeo.dispose();
      bulletGeo.dispose();
      container.innerHTML = "";
    };
  }, [viewMode]);

  return (
    <div className="lipstick-3d-stage-wrapper">
      <div className="lipstick-3d-display-frame">
        {/* Top Controls: 3D / Studio Still Toggle & Twist Action */}
        <div className="lipstick-3d-top-controls">
          <div className="mode-toggle-pill">
            <button
              className={`mode-btn ${viewMode === "3d" ? "active" : ""}`}
              onClick={() => setViewMode("3d")}
              aria-label="3D Interactive Model"
            >
              <Rotate3d size={12} />
              <span>3D Model</span>
            </button>
            <button
              className={`mode-btn ${viewMode === "photo" ? "active" : ""}`}
              onClick={() => setViewMode("photo")}
              aria-label="Studio Still Packshot"
            >
              <Eye size={12} />
              <span>Studio Still</span>
            </button>
          </div>

          {viewMode === "3d" && (
            <button
              className="twist-bullet-btn"
              onClick={toggleTwist}
              aria-label={isTwistedUp ? "Twist Bullet Down" : "Twist Bullet Up"}
            >
              <Sparkles size={11} />
              <span>{isTwistedUp ? "Twist Down" : "Twist Up"}</span>
            </button>
          )}
        </div>

        {/* Floating Rotation Hint */}
        {viewMode === "3d" && (
          <div className="lipstick-3d-hint-tag">
            <Rotate3d size={10} />
            <span>Drag to rotate 360° · Tap shade to customize</span>
          </div>
        )}

        {/* Viewport: 3D WebGL Canvas or High-Res Studio Still */}
        {viewMode === "3d" ? (
          <div ref={mountRef} className="lipstick-3d-canvas-container" />
        ) : (
          <div className="lipstick-still-photo-container">
            <img
              src={activeShade.stillPhoto}
              alt={`${activeShade.name} She'Aura Lipstick Studio Packshot`}
              className="lipstick-still-image"
            />
          </div>
        )}

        {/* Bottom Floating Shade Switcher Glass Dock */}
        <div className="lipstick-shade-switcher-dock">
          <div className="dock-shade-info">
            <div className="dock-shade-header">
              <span className="dock-bullet-dot" style={{ backgroundColor: activeShade.hex }} />
              <strong>{activeShade.name}</strong>
              <span className="dock-finish-badge">{activeShade.finish}</span>
            </div>
            <p className="dock-shade-desc">{activeShade.description}</p>
          </div>

          <div className="dock-shade-swatches">
            {LIPSTICK_SHADES.map((shade) => {
              const isSelected = activeShade.id === shade.id;
              return (
                <button
                  key={shade.id}
                  className={`dock-swatch-btn ${isSelected ? "selected" : ""}`}
                  style={{ backgroundColor: shade.hex }}
                  onClick={() => handleShadeChange(shade)}
                  aria-label={`Select ${shade.name}`}
                  title={shade.name}
                >
                  {isSelected && <Check size={12} className="dock-swatch-check" />}
                </button>
              );
            })}
          </div>

          <button
            className="dock-pdp-action-btn"
            onClick={() => onOpenPdp?.(activeShade)}
          >
            <span>View Formula</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
