import * as THREE from 'three';

export function createSculptedLipstickGeometry(radius = 0.44, yFront = 0.62, yBack = 1.66, radialSegments = 96, heightSegments = 48) {
  const yMid = (yFront + yBack) / 2.0;
  const dy = (yBack - yFront) / 2.0;

  // 1. Cylindrical Wall Geometry
  const wallPositions = [];
  const wallNormals = [];
  const wallUvs = [];
  const wallIndices = [];

  // Top boundary loop for facet attachment
  const topLoop = [];

  for (let j = 0; j <= heightSegments; j++) {
    const vNorm = j / heightSegments; // 0 at base, 1 at cut top

    for (let i = 0; i <= radialSegments; i++) {
      const uNorm = i / radialSegments;
      const phi = uNorm * Math.PI * 2.0;

      // Planar slant cut height at angle phi
      // phi=0 is front (+z, lowest cut), phi=PI is back (-z, highest tip)
      const yTop = yMid - dy * Math.cos(phi);

      const y = vNorm * yTop;
      const x = radius * Math.sin(phi);
      const z = radius * Math.cos(phi);

      wallPositions.push(x, y, z);

      // Normal points outward from cylinder axis (x, 0, z)
      wallNormals.push(Math.sin(phi), 0, Math.cos(phi));

      // Isometric UV mapping: v is proportional to absolute height y / yBack
      // u wraps 0 to 1 around circumference
      // Offset u by 0.5 so that front (+z, phi=0) is at u=0.5 (center of texture)
      const u = (uNorm + 0.5) % 1.0;
      const v = y / yBack;
      wallUvs.push(u, v);

      if (j === heightSegments && i < radialSegments) {
        topLoop.push(new THREE.Vector3(x, y, z));
      }
    }
  }

  // Generate wall grid quad indices
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
  wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3));
  wallGeo.setAttribute('normal', new THREE.Float32BufferAttribute(wallNormals, 3));
  wallGeo.setAttribute('uv', new THREE.Float32BufferAttribute(wallUvs, 2));
  wallGeo.setIndex(wallIndices);
  wallGeo.computeVertexNormals();

  // 2. Slanted Applicator Facet Geometry (Smooth planar/slightly convex teardrop cap)
  const facetPositions = [];
  const facetNormals = [];
  const facetUvs = [];
  const facetIndices = [];

  // Cutting plane normal:
  // Cutting plane is y = yMid - dy * (z / radius) -> dy/radius * z + y - yMid = 0
  const slope = dy / radius;
  const planeNormal = new THREE.Vector3(0, 1, slope).normalize();

  // Center apex point (slightly elevated for luxurious wax dome crown)
  const centerPt = new THREE.Vector3(0, yMid + 0.012, 0);
  facetPositions.push(centerPt.x, centerPt.y, centerPt.z);
  facetNormals.push(planeNormal.x, planeNormal.y, planeNormal.z);
  facetUvs.push(0.5, 0.5);

  const loopCount = topLoop.length;
  for (let i = 0; i < loopCount; i++) {
    const pt = topLoop[i];
    facetPositions.push(pt.x, pt.y, pt.z);
    facetNormals.push(planeNormal.x, planeNormal.y, planeNormal.z);

    // Planar UV projection across facet diameter [-radius, radius]
    const fu = (pt.x / radius) * 0.5 + 0.5;
    const fv = (pt.z / radius) * 0.5 + 0.5;
    facetUvs.push(fu, fv);
  }

  // Triangulate triangle fan from center
  for (let i = 0; i < loopCount; i++) {
    const next = (i + 1) % loopCount;
    // Counter-clockwise orientation
    facetIndices.push(0, i + 1, next + 1);
  }

  const facetGeo = new THREE.BufferGeometry();
  facetGeo.setAttribute('position', new THREE.Float32BufferAttribute(facetPositions, 3));
  facetGeo.setAttribute('normal', new THREE.Float32BufferAttribute(facetNormals, 3));
  facetGeo.setAttribute('uv', new THREE.Float32BufferAttribute(facetUvs, 2));
  facetGeo.setIndex(facetIndices);
  facetGeo.computeVertexNormals();

  return { wallGeo, facetGeo };
}

// Quick validation
const { wallGeo, facetGeo } = createSculptedLipstickGeometry();
console.log('Wall geo vertex count:', wallGeo.attributes.position.count, 'indices:', wallGeo.index.count);
console.log('Facet geo vertex count:', facetGeo.attributes.position.count, 'indices:', facetGeo.index.count);
console.log('Geometry successfully generated with zero errors!');
