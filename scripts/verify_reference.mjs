#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const bundledSiteDir = path.resolve(scriptDir, '..', 'assets', 'reference-site');
if (process.argv.length > 2 && (process.argv.length !== 4 || process.argv[2] !== '--site')) {
  throw new Error('Usage: node verify_reference.mjs [--site SITE_FOLDER]');
}
const siteDir = process.argv[2] === '--site' ? path.resolve(process.argv[3]) : bundledSiteDir;
let checks = 0;

function check(condition, message) {
  checks += 1;
  assert.ok(condition, message);
}

function near(actual, expected, message, epsilon = 1e-9) {
  check(Number.isFinite(actual) && Math.abs(actual - expected) <= epsilon,
    `${message}: expected ${expected}, got ${actual}`);
}

async function listFiles(directory, relativeTo = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(absolute, relativeTo));
    else files.push(path.relative(relativeTo, absolute).split(path.sep).join('/'));
  }
  return files.sort();
}

async function pngChunkTypes(file) {
  const data = await readFile(file);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  check(data.subarray(0, 8).equals(signature), `${file} has a PNG signature`);
  const types = [];
  let offset = 8;
  while (offset + 12 <= data.length) {
    const size = data.readUInt32BE(offset);
    const end = offset + 12 + size;
    if (end > data.length) {
      check(false, `${file} has complete PNG chunks`);
      return types;
    }
    types.push(data.toString('ascii', offset + 4, offset + 8));
    offset = end;
    if (types.at(-1) === 'IEND') break;
  }
  check(offset === data.length && types.at(-1) === 'IEND', `${file} ends cleanly at IEND`);
  return types;
}

const modelFile = path.join(siteDir, 'mirror-physics.js');
const modelSource = await readFile(modelFile, 'utf8');
const modelUrl = `data:text/javascript;base64,${Buffer.from(modelSource).toString('base64')}`;
const physics = await import(modelUrl);
const { MODEL } = physics;

// Solve the fixed worked example and verify both derived edges and the mirror length.
const answer = physics.solution(MODEL.height, MODEL.eye);
near(answer.bottom, 35, 'lower edge');
near(answer.top, 74, 'upper edge');
near(answer.length, 39, 'minimum mirror length');
near(answer.bottom + answer.length, answer.top, 'edge/length consistency');
check(physics.proportionEquivalent(answer.bottom, MODEL.eye, MODEL.distance, 2 * MODEL.distance),
  'lower-edge similar-triangle ratio');
check(physics.proportionEquivalent(answer.length, MODEL.height, MODEL.distance, 2 * MODEL.distance),
  'minimum-length similar-triangle ratio');

// The shortest installation shows both endpoints; a longer mirror also shows the whole body.
const shortest = physics.installation(answer.bottom, answer.top);
check(shortest.fullBodyVisible && shortest.shortestCorrect, 'shortest installation shows the full body');
const longer = physics.installation(30, 80);
check(longer.fullBodyVisible && !longer.shortestCorrect, 'a longer mirror is sufficient but not shortest');

// Clipping returns only the intersecting body interval, without claiming cropped endpoints.
const cropped = physics.installation(40, 70);
check(!cropped.visibleRange.empty, 'a mirror covering the middle of the body has a visible interval');
near(cropped.visibleRange.min, 10, 'cropped visible-range lower bound');
near(cropped.visibleRange.max, 70, 'cropped visible-range upper bound');
check(!cropped.footVisible && !cropped.headVisible && !cropped.fullBodyVisible,
  'cropping both ends does not report either endpoint as visible');
const belowBody = physics.visibleBodyRange(0, 20, MODEL.eye, MODEL.height);
check(belowBody.empty && belowBody.min === null && belowBody.max === null,
  'a mirror with no body-image intersection has no visible endpoints');
const exactTangent = physics.visibleBodyRange(0, 35, MODEL.eye, MODEL.height);
check(!exactTangent.empty && exactTangent.point && exactTangent.min === 0 && exactTangent.max === 0,
  'a single tangent point is represented as a point, not a full-body interval');
check(physics.canSeePoint(MODEL.foot, 0, 35) && !physics.canSeePoint(MODEL.height, 0, 35),
  'a mirror ending at the foot reflection shows the foot but not the head');

// Distance changes ray geometry but not the required mirror edges or visibility in this model.
const distances = [30, 60, 80];
const snapshots = physics.distanceSnapshot(distances, answer.bottom, answer.top);
check(snapshots.length === distances.length, 'distance snapshots preserve every requested distance');
check(snapshots.every((snapshot, index) =>
  snapshot.distance === distances[index] && snapshot.mirrorBottom === 35 &&
  snapshot.mirrorTop === 74 && snapshot.fullBodyVisible),
  'the solved mirror edges and endpoint visibility are distance-independent');
for (const distance of distances) {
  const footRay = physics.rayForReflection(distance, MODEL.foot, answer.bottom, MODEL.eye);
  const headRay = physics.rayForReflection(distance, MODEL.height, answer.top, MODEL.eye);
  check(footRay?.reachesEye && headRay?.reachesEye,
    `foot and head reflection rays reach the eye at distance ${distance} cm`);
  near(footRay.hitHeight, MODEL.eye, `foot-ray eye height at distance ${distance} cm`);
  near(headRay.hitHeight, MODEL.eye, `head-ray eye height at distance ${distance} cm`);
}
const image = physics.virtualImage(MODEL.distance, MODEL.height);
near(image.x, -60, 'virtual image lies the same distance behind the mirror');
near(image.y, 78, 'virtual image preserves height');
check(physics.rayForReflection(0, MODEL.foot, answer.bottom) === null,
  'zero object-to-mirror distance is rejected for a ray');

// Invalid mirror edges and a valid mirror with no image intersection stay distinct.
const reversed = physics.visibleBodyRange(50, 49);
check(!reversed.validMirror && reversed.empty && reversed.min === null && reversed.max === null,
  'reversed mirror edges are invalid');
const invalidInstallation = physics.installation(50, 49);
check(!invalidInstallation.valid && !invalidInstallation.fullBodyVisible,
  'an installation with reversed edges is invalid');
const aboveBody = physics.visibleBodyRange(80, 90, MODEL.eye, MODEL.height);
check(aboveBody.validMirror && aboveBody.empty && aboveBody.min === null && aboveBody.max === null,
  'a valid mirror entirely above the body image has an empty intersection');
const invalidSolution = physics.solution(70, 78);
check(invalidSolution === null, 'an eye height above the person is rejected');

// Check every bundled local asset reference and ensure the duplicate/unused images are absent.
const siteFiles = await listFiles(siteDir);
const textFiles = siteFiles.filter((file) => /\.(html|css|js|mjs)$/i.test(file));
const textContents = await Promise.all(textFiles.map(async (file) =>
  [file, await readFile(path.join(siteDir, file), 'utf8')]
));
const referencedAssets = new Set();
for (const [file, content] of textContents) {
  for (const match of content.matchAll(/\.\/assets\/([A-Za-z0-9._/-]+)/g)) {
    const asset = match[1];
    referencedAssets.add(asset);
    check(existsSync(path.join(siteDir, 'assets', asset)), `${file} asset reference exists: ${asset}`);
  }
}
const imageFiles = siteFiles.filter((file) => /^assets\/.*\.(png|jpe?g|webp|gif|svg)$/i.test(file));
check(imageFiles.length === 3, 'reference site includes only the three used illustrations/sprites');
for (const imageFile of imageFiles) {
  check(referencedAssets.has(imageFile.slice('assets/'.length)), `${imageFile} is used by the site`);
  const chunkTypes = await pngChunkTypes(path.join(siteDir, imageFile));
  check(chunkTypes.includes('IDAT'), `${imageFile} contains image data`);
}
check(!existsSync(path.join(siteDir, 'assets', 'mirror', 'girl.png')),
  'duplicate nested girl artwork was removed');
check(!existsSync(path.join(siteDir, 'assets', 'mirror', 'mirror-scene.png')),
  'unused mirror-scene image was removed');

const index = await readFile(path.join(siteDir, 'index.html'), 'utf8');
for (const match of index.matchAll(/(?:src|href)="\.\/([^"#?]+)"/g)) {
  check(existsSync(path.join(siteDir, match[1])), `index entrypoint exists: ${match[1]}`);
}
const allText = textContents.map(([, content]) => content).join('\n');
check(!/\/Users\/|CloudStorage|file:\/\/|\.openai(?:\/|\b)|\.git(?:\/|\b)/i.test(allText),
  'site source contains no absolute user paths or local/private metadata');
check(!/https:\/\//i.test(allText), 'site source contains no private or external HTTPS URL');

console.log(`PASS: ${checks} reference-site and plane-mirror model checks.`);
