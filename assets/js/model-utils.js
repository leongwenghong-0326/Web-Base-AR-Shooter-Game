import * as THREE from 'three';

/**
 * Convert materials to MeshBasicMaterial while keeping original GLB colors/maps.
 * This matches the downloaded look and always shows on phone AR (no lighting dependency).
 */
export function prepareModelForAr(root) {
  if (!root) return;

  root.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return;

    obj.frustumCulled = false;
    obj.castShadow = false;
    obj.receiveShadow = false;
    obj.visible = true;
    obj.matrixAutoUpdate = true;

    try {
      if (!obj.geometry.attributes.normal) {
        obj.geometry.computeVertexNormals();
      }
    } catch (_) {}

    const hasVertexColors = !!obj.geometry.attributes.color;
    const srcMats = Array.isArray(obj.material) ? obj.material : [obj.material];

    const out = srcMats.map((mat) => {
      if (!mat) {
        return new THREE.MeshBasicMaterial({ color: 0xffd740, side: THREE.DoubleSide });
      }

      // Already basic — keep
      if (mat.isMeshBasicMaterial && !mat.userData._arPrepared) {
        mat.side = THREE.DoubleSide;
        mat.vertexColors = hasVertexColors || mat.vertexColors;
        mat.userData._arPrepared = true;
        return mat;
      }

      const color = mat.color ? mat.color.clone() : new THREE.Color(0xffffff);
      // Slightly lift very dark PBR factors so details stay readable on phone LCDs
      const lum = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
      if (lum > 0.001 && lum < 0.08) {
        color.multiplyScalar(2.2);
      }

      const basic = new THREE.MeshBasicMaterial({
        color,
        map: mat.map || null,
        alphaMap: mat.alphaMap || null,
        transparent: !!mat.transparent || (mat.opacity != null && mat.opacity < 0.999),
        opacity: mat.opacity != null ? mat.opacity : 1,
        side: THREE.DoubleSide,
        vertexColors: hasVertexColors || !!mat.vertexColors,
        alphaTest: mat.alphaTest || 0,
        depthWrite: mat.depthWrite !== false,
        depthTest: true,
        name: mat.name || ''
      });
      basic.userData._arPrepared = true;
      return basic;
    });

    obj.material = Array.isArray(obj.material) ? out : out[0];
  });
}

export function meshBoundingBox(root) {
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3();
  let found = false;
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return;
    // Prefer geometry bounds transformed by mesh for skinned safety after first update
    const b = new THREE.Box3().setFromObject(obj);
    if (b.isEmpty()) return;
    if (!found) {
      box.copy(b);
      found = true;
    } else {
      box.union(b);
    }
  });
  if (!found) box.setFromObject(root);
  return box;
}

/**
 * Scale a PARENT group so content fits maxSize. Never move skinned mesh internals.
 * Call AFTER model is added to `group`.
 */
export function fitGroupToSize(group, maxSize) {
  group.updateWorldMatrix(true, true);
  const box = meshBoundingBox(group);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
  const s = maxSize / maxDim;
  group.scale.setScalar(s);
  return s;
}

/** Shift group so its bottom sits on y=0 (local). */
export function groundGroup(group) {
  group.updateWorldMatrix(true, true);
  const box = meshBoundingBox(group);
  group.position.y -= box.min.y;
}