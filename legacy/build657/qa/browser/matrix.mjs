import { readFile } from 'node:fs/promises';
import { resolveCase } from '../node/case-loader.mjs';

export const TARGET_URL = process.env.MEH_VISUAL_QA_URL
  || 'http://127.0.0.1:8520/meh5.html';

export const VIEWPORT = Object.freeze({
  width: 1600,
  height: 1000,
  deviceScaleFactor: 1,
});

export const VIEW_MATRIX = Object.freeze([
  Object.freeze({
    id: 'front-full',
    label: 'front/full',
    viewValue: 'full',
    xray: false,
  }),
  Object.freeze({
    id: 'no-driver-assembly',
    label: 'rear-oblique/no-drivers',
    viewValue: 'nodrv',
    xray: false,
  }),
  Object.freeze({
    id: 'rear-mount',
    label: 'rear/mount',
    viewValue: 'mount',
    mountFocus: '0',
    xray: false,
  }),
  Object.freeze({
    id: 'taps-xray',
    label: 'taps/xray',
    viewValue: 'taps',
    xray: true,
  }),
  Object.freeze({
    id: 'side-oblique-full',
    label: 'side-oblique/full',
    viewValue: 'full',
    xray: false,
    camera: Object.freeze({
      yaw: 1.16,
      pitch: 0.34,
      dist: 1.25,
    }),
  }),
]);

const CANONICAL_CASES_URL = new URL('../cases/canonical.json', import.meta.url);

export async function loadCanonicalPresetMatrix() {
  const fixture = JSON.parse(await readFile(CANONICAL_CASES_URL, 'utf8'));
  const presets = fixture.cases
    .filter((entry) => (
      (
        entry.source?.type === 'build'
        || (
          entry.source?.type === 'family'
          && entry.tags?.includes('browser-regression')
        )
      )
      && entry.expected?.status === 'valid'
      && entry.tags?.includes('plan')
    ))
    .map((entry) => {
      const sourceType = entry.source.type;
      const presetKey = sourceType === 'family'
        ? entry.overrides?.twoDesign || `arch:${entry.source.key}`
        : entry.source.key;
      const resolvedState = sourceType === 'family'
        ? resolveCase(fixture, entry)
        : null;
      return {
        id: entry.id,
        title: entry.title,
        sourceType,
        presetKey,
        expectedState: {
          ...(resolvedState || {
            topo: '2way',
            twoDesign: presetKey,
            ...(entry.overrides || {}),
          }),
          ...(entry.expected.intent || {}),
        },
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  if (presets.length === 0) {
    throw new Error(
      'No valid canonical build or tagged browser-regression presets were found '
      + 'in qa/cases/canonical.json.',
    );
  }

  const duplicateIds = presets
    .map((preset) => preset.id)
    .filter((id, index, all) => all.indexOf(id) !== index);
  const duplicateKeys = presets
    .map((preset) => preset.presetKey)
    .filter((key, index, all) => all.indexOf(key) !== index);

  if (duplicateIds.length || duplicateKeys.length) {
    throw new Error(
      `Canonical browser matrix contains duplicate identifiers: ${
        [...duplicateIds, ...duplicateKeys].join(', ')
      }.`,
    );
  }

  return presets;
}
