export const EPSILON = 1e-7;
export const MODEL = Object.freeze({
  height: 78,
  eye: 70,
  foot: 0,
  distance: 60,
  bottom: 40,
  length: 40,
  top: 80,
  maximumMirrorTop: 95
});

export const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export const clamp = (value, low, high) => Math.min(high, Math.max(low, finite(value, low)));

export function reflectionHeight(bodyPoint, eyeHeight = MODEL.eye) {
  return (Number(bodyPoint) + Number(eyeHeight)) / 2;
}

export function rayHitHeight(reflectionPoint, bodyPoint = MODEL.foot) {
  return 2 * Number(reflectionPoint) - Number(bodyPoint);
}

export function rayForReflection(distance, bodyPoint, reflectionPoint, eyeHeight = MODEL.eye) {
  const d = Number(distance);
  const r = Number(reflectionPoint);
  const y = Number(bodyPoint);
  const eye = Number(eyeHeight);
  if (!(d > 0) || ![d, r, y, eye].every(Number.isFinite)) return null;
  const hit = rayHitHeight(r, y);
  return {
    incident: { from: { x: d, y }, to: { x: 0, y: r } },
    reflected: { from: { x: 0, y: r }, to: { x: d, y: hit } },
    hitHeight: hit,
    reachesEye: Math.abs(hit - eye) <= EPSILON,
    virtualPoint: { x: -d, y }
  };
}

export function angleFromNormal(distance, reflectionPoint, bodyPoint = MODEL.foot) {
  const d = Number(distance);
  if (!(d > 0)) return NaN;
  return Math.atan(Math.abs(Number(reflectionPoint) - Number(bodyPoint)) / d) * 180 / Math.PI;
}

export function virtualImage(distance, bodyHeight) {
  return { x: -Math.abs(Number(distance)), y: Number(bodyHeight) };
}

export function visibleBodyRange(bottom, top, eyeHeight = MODEL.eye, bodyHeight = MODEL.height) {
  const b = Number(bottom);
  const t = Number(top);
  const eye = Number(eyeHeight);
  const height = Number(bodyHeight);
  if (![b, t, eye, height].every(Number.isFinite) || t < b || height < 0) {
    return { min: null, max: null, validMirror: false, empty: true };
  }
  const min = Math.max(0, 2 * b - eye);
  const max = Math.min(height, 2 * t - eye);
  if (max < min - EPSILON) return { min: null, max: null, validMirror: true, empty: true };
  const point = Math.abs(max - min) <= EPSILON;
  return { min, max: point ? min : max, validMirror: true, empty: false, point };
}

export function canSeePoint(bodyPoint, bottom, top, eyeHeight = MODEL.eye) {
  const point = reflectionHeight(bodyPoint, eyeHeight);
  const b = Number(bottom);
  const t = Number(top);
  return Number.isFinite(point) && Number.isFinite(b) && Number.isFinite(t) && t >= b &&
    point >= b - EPSILON && point <= t + EPSILON;
}

export function installation(bottom, top, height = MODEL.height, eyeHeight = MODEL.eye) {
  const b = Number(bottom);
  const t = Number(top);
  const h = Number(height);
  const eye = Number(eyeHeight);
  const valid = [b, t, h, eye].every(Number.isFinite) && t >= b && h >= 0;
  if (!valid) return { valid: false, length: NaN, footVisible: false, headVisible: false, fullBodyVisible: false, shortestCorrect: false, visibleRange: visibleBodyRange(NaN, NaN) };

  const footHeight = reflectionHeight(0, eye);
  const headHeight = reflectionHeight(h, eye);
  const footVisible = canSeePoint(0, b, t, eye);
  const headVisible = canSeePoint(h, b, t, eye);
  const targetBottom = footHeight;
  const targetTop = headHeight;
  return {
    valid,
    length: t - b,
    footReflection: footHeight,
    headReflection: headHeight,
    footVisible,
    headVisible,
    fullBodyVisible: footVisible && headVisible,
    shortestCorrect: footVisible && headVisible && Math.abs(b - targetBottom) <= EPSILON && Math.abs(t - targetTop) <= EPSILON,
    bottomAtTarget: Math.abs(b - targetBottom) <= EPSILON,
    topAtTarget: Math.abs(t - targetTop) <= EPSILON,
    targetBottom,
    targetTop,
    targetLength: targetTop - targetBottom,
    visibleRange: visibleBodyRange(b, t, eye, h)
  };
}

export function solution(height = MODEL.height, eyeHeight = MODEL.eye) {
  const h = Number(height);
  const e = Number(eyeHeight);
  if (![h, e].every(Number.isFinite) || h < 0 || e < 0 || e > h) return null;
  const bottom = e / 2;
  const top = (h + e) / 2;
  return { bottom, top, length: h / 2 };
}

export function distanceSnapshot(distances, bottom, top) {
  return Array.from(distances, (distance) => {
    const d = Number(distance);
    return {
      distance: d,
      mirrorBottom: Number(bottom),
      mirrorTop: Number(top),
      footReflection: reflectionHeight(MODEL.foot),
      headReflection: reflectionHeight(MODEL.height),
      footVisible: canSeePoint(MODEL.foot, bottom, top),
      headVisible: canSeePoint(MODEL.height, bottom, top),
      fullBodyVisible: canSeePoint(MODEL.foot, bottom, top) && canSeePoint(MODEL.height, bottom, top)
    };
  });
}

export function proportionEquivalent(numeratorA, denominatorA, numeratorB, denominatorB) {
  const values = [numeratorA, denominatorA, numeratorB, denominatorB].map(Number);
  if (!values.every(Number.isFinite) || values[1] === 0 || values[3] === 0) return false;
  return Math.abs(values[0] / values[1] - values[2] / values[3]) <= 1e-6;
}

export function controlLimits(bottom, length) {
  const b = Number(bottom);
  const l = Number(length);
  if (![b, l].every(Number.isFinite)) return { bottomMax: 0, lengthMax: 5 };
  return {
    bottomMax: Math.max(0, Math.min(60, MODEL.maximumMirrorTop - l)),
    lengthMax: Math.max(5, Math.min(90, MODEL.maximumMirrorTop - b))
  };
}

const mirrorPhysicsApi = Object.freeze({
  MODEL, EPSILON, clamp, reflectionHeight, rayHitHeight, rayForReflection,
  angleFromNormal, virtualImage, visibleBodyRange, canSeePoint, installation,
  solution, distanceSnapshot, proportionEquivalent, controlLimits
});
if (typeof window !== 'undefined') window.MirrorPhysics = mirrorPhysicsApi;
