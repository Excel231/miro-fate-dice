import type {Embed} from '@mirohq/websdk-types';

import type {Locale} from './board-card';
import type {Theme} from './preferences';

export const SCENE_SHEET_METADATA_KEY = 'fate-scene-sheet-state';
export const SCENE_SHEET_CHANNEL = 'fate-scene-sheet-board-v1';
export const SCENE_SHEET_SIZE = {width: 1280, height: 4757};

export type SceneZone = {id: string; name: string; aspects: string[]};
export type SceneProgress = {id: string; name: string; checks: boolean[]};

export type SceneSheetState = {
  kind: 'fate-scene-sheet';
  version: 2;
  instanceId: string;
  locale: Locale;
  theme: Theme;
  name: string;
  description: string;
  location: string;
  aspects: string[];
  zones: SceneZone[];
  notes: string;
  progresses: SceneProgress[];
  backgroundStart: string;
  backgroundEnd: string;
  gradientAngle: number;
  backgroundImageUrl: string;
};

export type SceneSheetRequest =
  | {type: 'request-state'; instanceId: string}
  | {type: 'save-state'; instanceId: string; state: SceneSheetState};

export type SceneSheetResponse = {
  type: 'state' | 'error';
  instanceId: string;
  state?: SceneSheetState;
  message?: string;
};

const uid = () => crypto.randomUUID();

export function createInitialSceneState(instanceId: string, locale: Locale, theme: Theme): SceneSheetState {
  const isRu = locale === 'ru';
  return {
    kind: 'fate-scene-sheet',
    version: 2,
    instanceId,
    locale,
    theme,
    name: isRu ? 'Новая сцена' : 'New scene',
    description: '',
    location: '',
    aspects: Array.from({length: 4}, () => ''),
    zones: Array.from({length: 3}, (_, index) => ({id: uid(), name: isRu ? `Зона ${index + 1}` : `Zone ${index + 1}`, aspects: ['']})),
    notes: '',
    progresses: [{id: uid(), name: isRu ? 'Прогресс сцены' : 'Scene progress', checks: Array.from({length: 6}, () => false)}],
    backgroundStart: '#10131d',
    backgroundEnd: '#29334b',
    gradientAngle: 145,
    backgroundImageUrl: '',
  };
}

export function parseSceneSheetState(value: unknown): SceneSheetState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<SceneSheetState> & {
    progress?: unknown;
    zones?: unknown;
  };
  if (candidate.kind !== 'fate-scene-sheet' || typeof candidate.instanceId !== 'string') return null;
  const fallback = createInitialSceneState(candidate.instanceId, candidate.locale === 'en' ? 'en' : 'ru', candidate.theme === 'dark' ? 'dark' : 'light');
  const color = (value: unknown, fallbackValue: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallbackValue;
  const strings = (value: unknown, limit: number, fallbackValue: string[]) => Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').slice(0, limit)
    : fallbackValue;
  return {
    ...fallback,
    version: 2,
    locale: candidate.locale === 'en' ? 'en' : 'ru',
    theme: candidate.theme === 'dark' ? 'dark' : 'light',
    name: typeof candidate.name === 'string' ? candidate.name.slice(0, 160) : fallback.name,
    description: typeof candidate.description === 'string' ? candidate.description.slice(0, 4000) : '',
    location: typeof candidate.location === 'string' ? candidate.location.slice(0, 500) : '',
    aspects: strings(candidate.aspects, 8, fallback.aspects),
    zones: Array.isArray(candidate.zones) ? candidate.zones.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const zone = item as Partial<SceneZone> & {aspect?: unknown};
      if (typeof zone.id !== 'string' || typeof zone.name !== 'string') return [];
      const legacyAspect = typeof zone.aspect === 'string' ? [zone.aspect] : [''];
      const aspects = strings(zone.aspects, 12, legacyAspect).map((aspect) => aspect.slice(0, 500));
      return [{
        id: zone.id,
        name: zone.name.slice(0, 160),
        aspects: aspects.length ? aspects : [''],
      }];
    }).slice(0, 8) : fallback.zones,
    notes: typeof candidate.notes === 'string' ? candidate.notes.slice(0, 5000) : '',
    progresses: Array.isArray(candidate.progresses) ? candidate.progresses.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const progress = item as Partial<SceneProgress>;
      if (typeof progress.id !== 'string' || typeof progress.name !== 'string' || !Array.isArray(progress.checks)) return [];
      return [{
        id: progress.id,
        name: progress.name.slice(0, 160),
        checks: progress.checks.length ? progress.checks.slice(0, 24).map(Boolean) : [false],
      }];
    }).slice(0, 12) : Array.isArray(candidate.progress)
      ? [{id: uid(), name: fallback.progresses[0].name, checks: candidate.progress.length ? candidate.progress.slice(0, 24).map(Boolean) : [false]}]
      : fallback.progresses,
    backgroundStart: color(candidate.backgroundStart, fallback.backgroundStart),
    backgroundEnd: color(candidate.backgroundEnd, fallback.backgroundEnd),
    gradientAngle: typeof candidate.gradientAngle === 'number' && Number.isFinite(candidate.gradientAngle) ? Math.max(0, Math.min(360, candidate.gradientAngle)) : fallback.gradientAngle,
    backgroundImageUrl: typeof candidate.backgroundImageUrl === 'string' ? candidate.backgroundImageUrl.trim().slice(0, 2048) : '',
  };
}

export async function getSceneSheetState(embed: Embed): Promise<SceneSheetState | null> {
  return parseSceneSheetState(await embed.getMetadata(SCENE_SHEET_METADATA_KEY));
}

export async function saveSceneSheetState(embed: Embed, state: SceneSheetState): Promise<SceneSheetState> {
  await embed.setMetadata(SCENE_SHEET_METADATA_KEY, state);
  return state;
}

export async function createSceneSheetEmbed(locale: Locale, theme: Theme): Promise<Embed> {
  const viewport = await miro.board.viewport.get();
  const instanceId = crypto.randomUUID();
  const state = createInitialSceneState(instanceId, locale, theme);
  const sourceUrl = `${window.location.origin}/api/scene?instance=${encodeURIComponent(instanceId)}`;
  const embed = await miro.board.createEmbed({
    url: sourceUrl,
    mode: 'inline',
    x: viewport.x + viewport.width / 2,
    y: viewport.y + viewport.height / 2,
    width: SCENE_SHEET_SIZE.width,
    height: SCENE_SHEET_SIZE.height,
  });
  await saveSceneSheetState(embed, state);
  return embed;
}
