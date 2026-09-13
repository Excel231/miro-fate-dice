import type {Embed} from '@mirohq/websdk-types';

import type {Locale} from './board-card';
import type {Theme} from './preferences';

export const CHARACTER_SHEET_METADATA_KEY = 'fate-character-sheet-state';
export const CHARACTER_SHEET_CHANNEL = 'fate-character-sheet-board-v1';
export const CHARACTER_ASSET_COLLECTION = 'fate-character-assets';

export type CharacterMode = 'core' | 'accelerated';
export type CharacterAssetKind = 'photo' | 'background';
export const CHARACTER_SHEET_SIZES: Record<CharacterMode, {width: number; height: number}> = {
  core: {width: 1280, height: 910},
  accelerated: {width: 1280, height: 910},
};
export type RatedTrait = {id: string; name: string; value: number};
export type Consequence = {id: string; severity: 2 | 4 | 6; value: string};

export type CharacterSheetState = {
  kind: 'fate-character-sheet';
  version: 1;
  instanceId: string;
  mode: CharacterMode;
  locale: Locale;
  theme: Theme;
  name: string;
  description: string;
  backgroundStart: string;
  backgroundEnd: string;
  gradientAngle: number;
  photoUrl: string;
  backgroundImageUrl: string;
  aspects: string[];
  refresh: number;
  fatePoints: number;
  traits: RatedTrait[];
  physicalStress: boolean[];
  mentalStress: boolean[];
  consequences: Consequence[];
  stunts: string[];
};

export type CharacterSheetRequest =
  | {type: 'request-state'; instanceId: string}
  | {type: 'save-state'; instanceId: string; state: CharacterSheetState}
  | {type: 'save-asset'; instanceId: string; kind: CharacterAssetKind; dataUrl: string; state: CharacterSheetState}
  | {type: 'remove-asset'; instanceId: string; kind: CharacterAssetKind; state: CharacterSheetState};

export type CharacterSheetResponse = {
  type: 'state' | 'error';
  instanceId: string;
  state?: CharacterSheetState;
  assets?: Partial<Record<CharacterAssetKind, string>>;
  message?: string;
};

const CORE_SKILLS = [
  ['Great', 4], ['Good', 3], ['Good', 3], ['Fair', 2], ['Fair', 2], ['Fair', 2],
  ['Average', 1], ['Average', 1], ['Average', 1], ['Average', 1],
] as const;

const ACCELERATED_APPROACHES = [
  ['Careful', 0], ['Clever', 0], ['Flashy', 0], ['Forceful', 0], ['Quick', 0], ['Sneaky', 0],
] as const;

const uid = () => crypto.randomUUID();

export function createInitialCharacterState(mode: CharacterMode, instanceId: string, locale: Locale, theme: Theme): CharacterSheetState {
  const isRu = locale === 'ru';
  const approachNames: Record<string, string> = {Careful: 'Осторожный', Clever: 'Хитрый', Flashy: 'Эффектный', Forceful: 'Сильный', Quick: 'Быстрый', Sneaky: 'Скрытный'};
  const traits = (mode === 'core' ? CORE_SKILLS : ACCELERATED_APPROACHES).map(([name, value]) => ({
    id: uid(),
    name: mode === 'core' ? '' : (isRu ? approachNames[name] ?? name : name),
    value,
  }));
  return {
    kind: 'fate-character-sheet', version: 1, instanceId, mode, locale, theme,
    name: isRu ? 'Новый персонаж' : 'New character',
    description: '',
    backgroundStart: mode === 'core' ? '#fff4df' : '#effbf7',
    backgroundEnd: mode === 'core' ? '#e2bfae' : '#b9ddd7',
    gradientAngle: 145,
    photoUrl: '',
    backgroundImageUrl: '',
    aspects: Array.from({length: 5}, () => ''),
    refresh: 3,
    fatePoints: 3,
    traits,
    physicalStress: Array.from({length: 5}, () => false),
    mentalStress: Array.from({length: 5}, () => false),
    consequences: ([2, 4, 6] as const).map((severity) => ({id: uid(), severity, value: ''})),
    stunts: Array.from({length: mode === 'core' ? 3 : 2}, () => ''),
  };
}

function isMode(value: unknown): value is CharacterMode {
  return value === 'core' || value === 'accelerated';
}

export function parseCharacterSheetState(value: unknown): CharacterSheetState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<CharacterSheetState>;
  if (candidate.kind !== 'fate-character-sheet' || typeof candidate.instanceId !== 'string' || !isMode(candidate.mode)) return null;
  const fallback = createInitialCharacterState(candidate.mode, candidate.instanceId, candidate.locale === 'en' ? 'en' : 'ru', candidate.theme === 'dark' ? 'dark' : 'light');
  const normalizeStress = (items: unknown): boolean[] => Array.from(
    {length: 5},
    (_, index) => Array.isArray(items) ? Boolean(items[index]) : false,
  );
  const parsedStart = typeof candidate.backgroundStart === 'string' && /^#[0-9a-f]{6}$/i.test(candidate.backgroundStart) ? candidate.backgroundStart : fallback.backgroundStart;
  const parsedEnd = typeof candidate.backgroundEnd === 'string' && /^#[0-9a-f]{6}$/i.test(candidate.backgroundEnd) ? candidate.backgroundEnd : fallback.backgroundEnd;
  const parsedAngle = typeof candidate.gradientAngle === 'number' && Number.isFinite(candidate.gradientAngle) ? Math.max(0, Math.min(360, candidate.gradientAngle)) : fallback.gradientAngle;
  const hasLegacyDefaultGradient = parsedStart.toLowerCase() === '#ffffff'
    && parsedEnd.toLowerCase() === (candidate.mode === 'core' ? '#f5f1e8' : '#f2f4ed')
    && parsedAngle === 135;
  return {
    ...fallback,
    ...candidate,
    version: 1,
    locale: candidate.locale === 'en' ? 'en' : 'ru',
    theme: candidate.theme === 'dark' ? 'dark' : 'light',
    backgroundStart: hasLegacyDefaultGradient ? fallback.backgroundStart : parsedStart,
    backgroundEnd: hasLegacyDefaultGradient ? fallback.backgroundEnd : parsedEnd,
    gradientAngle: hasLegacyDefaultGradient ? fallback.gradientAngle : parsedAngle,
    photoUrl: typeof candidate.photoUrl === 'string' ? candidate.photoUrl.trim().slice(0, 2048) : '',
    backgroundImageUrl: typeof candidate.backgroundImageUrl === 'string' ? candidate.backgroundImageUrl.trim().slice(0, 2048) : '',
    aspects: Array.isArray(candidate.aspects) ? candidate.aspects.filter((item): item is string => typeof item === 'string').slice(0, 8) : fallback.aspects,
    traits: Array.isArray(candidate.traits) ? candidate.traits.filter((item): item is RatedTrait => Boolean(item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.value === 'number')).slice(0, 24) : fallback.traits,
    physicalStress: Array.isArray(candidate.physicalStress) ? normalizeStress(candidate.physicalStress) : fallback.physicalStress,
    mentalStress: Array.isArray(candidate.mentalStress) ? normalizeStress(candidate.mentalStress) : fallback.mentalStress,
    consequences: Array.isArray(candidate.consequences) ? candidate.consequences.filter((item): item is Consequence => Boolean(item && typeof item.id === 'string' && (item.severity === 2 || item.severity === 4 || item.severity === 6) && typeof item.value === 'string')).slice(0, 6) : fallback.consequences,
    stunts: Array.isArray(candidate.stunts) ? candidate.stunts.filter((item): item is string => typeof item === 'string').slice(0, 8) : fallback.stunts,
  };
}

export async function getCharacterSheetState(embed: Embed): Promise<CharacterSheetState | null> {
  return parseCharacterSheetState(await embed.getMetadata(CHARACTER_SHEET_METADATA_KEY));
}

export async function saveCharacterSheetState(embed: Embed, state: CharacterSheetState): Promise<CharacterSheetState> {
  await embed.setMetadata(CHARACTER_SHEET_METADATA_KEY, state);
  return state;
}

export async function createCharacterSheetEmbed(mode: CharacterMode, locale: Locale, theme: Theme): Promise<Embed> {
  const viewport = await miro.board.viewport.get();
  const instanceId = crypto.randomUUID();
  const state = createInitialCharacterState(mode, instanceId, locale, theme);
  const size = CHARACTER_SHEET_SIZES[mode];
  const sourceUrl = `${window.location.origin}/api/character?instance=${encodeURIComponent(instanceId)}&mode=${mode}`;
  const embed = await miro.board.createEmbed({
    url: sourceUrl,
    mode: 'inline',
    x: viewport.x + viewport.width / 2,
    y: viewport.y + viewport.height / 2,
    width: size.width,
    height: size.height,
  });
  await saveCharacterSheetState(embed, state);
  return embed;
}
