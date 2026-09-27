import * as THREE from 'three';

const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();

/** Turns a flat label around Y so it reads upright from the camera's current azimuth. */
export function faceCamera(obj: THREE.Object3D, camera: THREE.Camera): void {
  const parentYaw = obj.parent ? tmpEuler.setFromQuaternion(obj.parent.getWorldQuaternion(tmpQuat), 'YXZ').y : 0;
  obj.rotation.y = Math.atan2(camera.position.x, camera.position.z) - parentYaw;
}
