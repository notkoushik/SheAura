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
  facetTexture: string;
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
    facetTexture: "/products/3D/refined/facet_scarlet.jpg",
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
    facetTexture: "/products/3D/refined/facet_roseberry.jpg",
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
    facetTexture: "/products/3D/refined/facet_blush.jpg",
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
    facetTexture: "/products/3D/refined/facet_orchid.jpg",
    stillPhoto: "/products/3D/other.jpg",
  },
];

interface Lipstick3DViewerProps {
  onSelectShade?: (shade: LipstickShade) => void;
  onOpenPdp?: (shade: LipstickShade) => void;
}

// Parametric Luxury Sculpted Lipstick Geometry Generator
// Slices a cylindrical body with a clean planar slant cut while maintaining 100% isometric UVs (zero vertical smearing)
// Produces two distinct meshes:
// 1. wallGeo: Cylindrical body with bas-relief carving
// 2. facetGeo: Smooth velvet matte applicator facet on the cutting plane
function createSculptedLipstickGeometry(
  radius = 0.44,
  yFront = 0.62,
  yBack = 1.66,
  radialSegments = 96,
  heightSegments = 48
) {
  const yMid = (yFront + yBack) / 2.0;
  const dy = (yBack - yFront) / 2.0;

  const wallPositions: number[] = [];
  const wallNormals: number[] = [];
  const wallUvs: number[] = [];
  const wallIndices: number[] = [];
  const topLoop: THREE.Vector3[] = [];

  for (let j = 0; j <= heightSegments; j++) {
    const vNorm = j / heightSegments;

    for (let i = 0; i <= radialSegments; i++) {
      const uNorm = i / radialSegments;
      const phi = uNorm * Math.PI * 2.0;

      // Planar slant cut height at angle phi:
      // phi=0 is front (+z, lowest cut), phi=PI is back (-z, highest tip)
      const yTop = yMid - dy * Math.cos(phi);

      const y = vNorm * yTop;
      const x = radius * Math.sin(phi);
      const z = radius * Math.cos(phi);

      wallPositions.push(x, y, z);
      wallNormals.push(Math.sin(phi), 0, Math.cos(phi));

      // Isometric UV mapping: u wraps 360 around cylinder, v is linear world height y / yBack
      // Offset u by 0.5 so that front (+z, phi=0) is at u=0.5 (where Nightingale bird is centered)
      const u = (uNorm + 0.5) % 1.0;
      const v = y / yBack;
      wallUvs.push(u, v);

      if (j === heightSegments && i < radialSegments) {
        topLoop.push(new THREE.Vector3(x, y, z));
      }
    }
  }

  for (let j = 0; j < heightSegments; j++) {
    for (let i = 0; i < radialSegments; i++) {
      const row1 = j * (radialSegments + 1);
      const row2 = (j + 1) * (radialSegments + 1);

      const a = row1 + i;
      const b = row1 + i + 1;
      const c = row2 + i + 1;
      const d = row2 + i;

      wallIndices.push(a, b, d);
      wallIndices.push(b, c, d);
    }
  }

  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute("position", new THREE.Float32BufferAttribute(wallPositions, 3));
  wallGeo.setAttribute("normal", new THREE.Float32BufferAttribute(wallNormals, 3));
  wallGeo.setAttribute("uv", new THREE.Float32BufferAttribute(wallUvs, 2));
  wallGeo.setIndex(wallIndices);
  wallGeo.computeVertexNormals();

  // 2. Slanted Applicator Facet Geometry (Smooth planar/slightly convex teardrop cap)
  const facetPositions: number[] = [];
  const facetNormals: number[] = [];
  const facetUvs: number[] = [];
  const facetIndices: number[] = [];

  const slope = dy / radius;
  const planeNormal = new THREE.Vector3(0, 1, slope).normalize();

  const centerPt = new THREE.Vector3(0, yMid + 0.012, 0);
  facetPositions.push(centerPt.x, centerPt.y, centerPt.z);
  facetNormals.push(planeNormal.x, planeNormal.y, planeNormal.z);
  facetUvs.push(0.5, 0.5);

  const loopCount = topLoop.length;
  for (let i = 0; i < loopCount; i++) {
    const pt = topLoop[i];
    facetPositions.push(pt.x, pt.y, pt.z);
    facetNormals.push(planeNormal.x, planeNormal.y, planeNormal.z);

    const fu = (pt.x / radius) * 0.5 + 0.5;
    const fv = (pt.z / radius) * 0.5 + 0.5;
    facetUvs.push(fu, fv);
  }

  for (let i = 0; i < loopCount; i++) {
    const next = (i + 1) % loopCount;
    facetIndices.push(0, i + 1, next + 1);
  }

  const facetGeo = new THREE.BufferGeometry();
  facetGeo.setAttribute("position", new THREE.Float32BufferAttribute(facetPositions, 3));
  facetGeo.setAttribute("normal", new THREE.Float32BufferAttribute(facetNormals, 3));
  facetGeo.setAttribute("uv", new THREE.Float32BufferAttribute(facetUvs, 2));
  facetGeo.setIndex(facetIndices);
  facetGeo.computeVertexNormals();

  return { wallGeo, facetGeo };
}

export default function Lipstick3DViewer({ onSelectShade, onOpenPdp }: Lipstick3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeShade, setActiveShade] = useState<LipstickShade>(LIPSTICK_SHADES[0]);
  const [isTwistedUp, setIsTwistedUp] = useState(true);
  const [viewMode, setViewMode] = useState<"3d" | "photo">("3d");

  // References for live Three.js scene updates
  const bulletMeshRef = useRef<THREE.Mesh | null>(null);
  const bulletFacetMeshRef = useRef<THREE.Mesh | null>(null);
  const bulletGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const targetBulletYRef = useRef<number>(1.25);
  const texturesMapRef = useRef<Map<string, THREE.Texture>>(new Map());
  const facetTexturesMapRef = useRef<Map<string, THREE.Texture>>(new Map());

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
      mat.sheenColor.setHex(shade.colorHex);
    }

    if (bulletFacetMeshRef.current) {
      const facetMat = bulletFacetMeshRef.current.material as THREE.MeshPhysicalMaterial;
      const cachedFacetTex = facetTexturesMapRef.current.get(shade.id);
      if (cachedFacetTex) {
        facetMat.map = cachedFacetTex;
        facetMat.needsUpdate = true;
      }
      facetMat.sheenColor.setHex(shade.colorHex);
    }
  };

  // Toggle bullet twist up / down
  const toggleTwist = () => {
    const nextState = !isTwistedUp;
    setIsTwistedUp(nextState);
    targetBulletYRef.current = nextState ? 1.25 : 0.45;
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
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 2. OrbitControls for smooth, natural 360 rotation
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = false; // Hero lands on iconic Nightingale front view
    controls.autoRotateSpeed = 0.8;
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

    // 4. Multi-Point Luxury Studio Lighting Rig (Soft, diffuse studio lighting matching camera photos)
    const keyLight = new THREE.DirectionalLight(0xfffaef, 2.6);
    keyLight.position.set(2.5, 4.5, 5.5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffecd6, 2.0);
    fillLight.position.set(-3.5, 3.0, 4.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xdfb895, 2.4);
    rimLight.position.set(-5, 4, -4);
    scene.add(rimLight);

    const topSoftLight = new THREE.DirectionalLight(0xffffff, 1.8);
    topSoftLight.position.set(0, 8, 2);
    scene.add(topSoftLight);

    const rubyBounce = new THREE.PointLight(0xa81920, 1.6, 12);
    rubyBounce.position.set(0, -1.5, 3.5);
    scene.add(rubyBounce);

    const ambientLight = new THREE.AmbientLight(0xfff2e5, 2.0);
    scene.add(ambientLight);

    // 5. Texture Loader & Caching
    const textureLoader = new THREE.TextureLoader();

    // Preload all shade textures (Wall cylindrical relief + Facet smooth velvet)
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

      textureLoader.load(shade.facetTexture, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        facetTexturesMapRef.current.set(shade.id, tex);

        if (shade.id === activeShade.id && bulletFacetMeshRef.current) {
          (bulletFacetMeshRef.current.material as THREE.MeshPhysicalMaterial).map = tex;
          (bulletFacetMeshRef.current.material as THREE.MeshPhysicalMaterial).needsUpdate = true;
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
    masterGroup.position.set(0, -0.52, 0);
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
    // Two-part architecture:
    // Part 1: Cylindrical relief wall (100% isometric mapping, zero vertical smearing)
    // Part 2: Smooth slanted teardrop applicator facet (pure velvet matte wax)
    const { wallGeo, facetGeo } = createSculptedLipstickGeometry(0.44, 0.70, 1.70, 96, 48);

    const wallMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.82,
      roughnessMap: bulletRoughnessMap,
      metalness: 0.0,
      sheen: 0.35,
      sheenColor: new THREE.Color(activeShade.colorHex),
      sheenRoughness: 0.5,
      clearcoat: 0.0,
      normalMap: bulletNormalMap,
      normalScale: new THREE.Vector2(0.80, 0.80),
    });

    const activeTexture = texturesMapRef.current.get(activeShade.id);
    if (activeTexture) {
      wallMaterial.map = activeTexture;
    }

    const wallMesh = new THREE.Mesh(wallGeo, wallMaterial);
    wallMesh.castShadow = true;
    bulletMeshRef.current = wallMesh;

    // Smooth Velvet Matte Applicator Facet
    const facetMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.86,
      metalness: 0.0,
      sheen: 0.40,
      sheenColor: new THREE.Color(activeShade.colorHex),
      sheenRoughness: 0.5,
      clearcoat: 0.0,
    });

    const activeFacetTexture = facetTexturesMapRef.current.get(activeShade.id);
    if (activeFacetTexture) {
      facetMaterial.map = activeFacetTexture;
    }

    const facetMesh = new THREE.Mesh(facetGeo, facetMaterial);
    facetMesh.castShadow = true;
    bulletFacetMeshRef.current = facetMesh;

    const bulletGroup = new THREE.Group();
    bulletGroup.position.y = targetBulletYRef.current;
    bulletGroup.add(wallMesh);
    bulletGroup.add(facetMesh);
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

        {/* Minimal Floating Shade Swatch Bar (Zero Text Obscuring the 3D Model) */}
        <div className="lipstick-minimal-swatch-bar">
          <span className="swatch-bar-name">{activeShade.name}</span>
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
                  {isSelected && <Check size={11} className="dock-swatch-check" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
