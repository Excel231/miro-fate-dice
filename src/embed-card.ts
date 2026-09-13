import type {Embed} from '@mirohq/websdk-types';

import {rollFourDice, type DieValue} from './dice';
import type {Locale, RollResult} from './board-card';
import type {Theme} from './preferences';

export const FATE_DICE_EMBED_METADATA_KEY = 'fate-dice-embed-state';
export const FATE_DICE_CHANNEL = 'fate-dice-board-v1';

export type FateDiceEmbedState = {
  kind: 'fate-dice-embed';
  version: 1;
  instanceId: string;
  dice: DieValue[];
  rollCount: number;
  history: RollResult[];
  locale: Locale;
  theme: Theme;
};

export type EmbedRequest = {
  type: 'request-state' | 'roll' | 'set-locale' | 'set-theme';
  instanceId: string;
  locale?: Locale;
  theme?: Theme;
};

export type EmbedResponse = {
  type: 'state' | 'error';
  instanceId: string;
  state?: FateDiceEmbedState;
  message?: string;
};

function isDice(value: unknown): value is DieValue[] {
  return Array.isArray(value) && value.length === 4 && value.every((die) => die === -1 || die === 0 || die === 1);
}

export function parseEmbedState(value: unknown): FateDiceEmbedState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<FateDiceEmbedState>;
  if (candidate.kind !== 'fate-dice-embed' || typeof candidate.instanceId !== 'string' || !isDice(candidate.dice)) return null;
  const history = Array.isArray(candidate.history)
    ? candidate.history.filter((roll): roll is RollResult => Boolean(roll && typeof roll === 'object' && isDice(roll.dice))).slice(0, 5)
    : [];
  return {
    kind: 'fate-dice-embed',
    version: 1,
    instanceId: candidate.instanceId,
    dice: candidate.dice,
    rollCount: typeof candidate.rollCount === 'number' ? candidate.rollCount : 1,
    history: history.length ? history : [{dice: candidate.dice, sequence: 1, rolledAt: new Date().toISOString()}],
    locale: candidate.locale === 'en' ? 'en' : 'ru',
    theme: candidate.theme === 'dark' ? 'dark' : 'light',
  };
}

export async function getEmbedState(embed: Embed): Promise<FateDiceEmbedState | null> {
  return parseEmbedState(await embed.getMetadata(FATE_DICE_EMBED_METADATA_KEY));
}

export async function saveEmbedState(embed: Embed, state: FateDiceEmbedState): Promise<FateDiceEmbedState> {
  await embed.setMetadata(FATE_DICE_EMBED_METADATA_KEY, state);
  return state;
}

export async function createFateDiceEmbed(locale: Locale, theme: Theme): Promise<Embed> {
  const viewport = await miro.board.viewport.get();
  const instanceId = crypto.randomUUID();
  const dice = rollFourDice();
  const firstRoll: RollResult = {dice, sequence: 1, rolledAt: new Date().toISOString()};
  const state: FateDiceEmbedState = {
    kind: 'fate-dice-embed', version: 1, instanceId, dice,
    rollCount: 1, history: [firstRoll], locale, theme,
  };
  const sourceUrl = `${window.location.origin}/api/embed?instance=${encodeURIComponent(instanceId)}`;
  const embed = await miro.board.createEmbed({
    url: sourceUrl,
    mode: 'inline',
    x: viewport.x + viewport.width / 2,
    y: viewport.y + viewport.height / 2,
    width: 520,
    height: 620,
  });
  await saveEmbedState(embed, state);
  return embed;
}

export function rollEmbedState(state: FateDiceEmbedState): FateDiceEmbedState {
  const dice = rollFourDice();
  const nextRoll: RollResult = {dice, sequence: state.rollCount + 1, rolledAt: new Date().toISOString()};
  return {...state, dice, rollCount: nextRoll.sequence, history: [nextRoll, ...state.history].slice(0, 5)};
}
