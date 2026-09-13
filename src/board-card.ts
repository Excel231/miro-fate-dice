import type {AppCard} from '@mirohq/websdk-types';

import {DIE_LABELS, formatTotal, getTotal, rollFourDice, type DieValue} from './dice';

export const FATE_DICE_METADATA_KEY = 'fate-dice-state';
export const FATE_DICE_TITLE_PREFIX = '🎲 Fate Dice';
export const MAX_ROLL_HISTORY = 5;

export type Locale = 'ru' | 'en';
export type RollResult = {dice: DieValue[]; rolledAt: string; sequence: number};
export type FateDiceState = {
  kind: 'fate-dice';
  version: 2;
  dice: DieValue[];
  rollCount: number;
  rolledAt: string;
  history: RollResult[];
  locale: Locale;
};

const BOARD_COPY = {
  ru: {result: 'Итог', roll: 'Бросок'},
  en: {result: 'Result', roll: 'Roll'},
} as const;

function resultColor(total: number): {fillColor: string; textColor: string} {
  if (total > 0) return {fillColor: '#DDF5EA', textColor: '#0B6B4C'};
  if (total < 0) return {fillColor: '#FCE4E6', textColor: '#A52E38'};
  return {fillColor: '#EEEAF5', textColor: '#5F586B'};
}

function isDice(value: unknown): value is DieValue[] {
  return Array.isArray(value) && value.length === 4 && value.every((die) => die === -1 || die === 0 || die === 1);
}

function applyStateToCard(card: AppCard, state: FateDiceState): void {
  const copy = BOARD_COPY[state.locale];
  const current = state.history[0];
  const total = getTotal(current.dice);
  card.title = `${FATE_DICE_TITLE_PREFIX} · ${copy.result} ${formatTotal(total)}`;
  card.description = '';
  card.fields = state.history.map((roll, index) => ({
    value: `${index + 1} · ${roll.dice.map((die) => DIE_LABELS[die]).join(' ')}  =  ${formatTotal(getTotal(roll.dice))}`,
    tooltip: `${copy.roll} #${roll.sequence}`,
    ...(index === 0 ? resultColor(total) : {fillColor: '#F4F2F8', textColor: '#5F586B'}),
  }));
  card.style = {cardTheme: '#6D4CD4', fillBackground: true};
  card.status = 'connected';
}

export async function createFateDiceCard(locale: Locale = 'ru'): Promise<AppCard> {
  const viewport = await miro.board.viewport.get();
  const firstRoll: RollResult = {dice: rollFourDice(), sequence: 1, rolledAt: new Date().toISOString()};
  const state: FateDiceState = {
    kind: 'fate-dice', version: 2, dice: firstRoll.dice, rollCount: 1,
    rolledAt: firstRoll.rolledAt, history: [firstRoll], locale,
  };
  const card = await miro.board.createAppCard({
    x: viewport.x + viewport.width / 2,
    y: viewport.y + viewport.height / 2,
    width: 420,
    status: 'connected',
  });
  applyStateToCard(card, state);
  await card.setMetadata(FATE_DICE_METADATA_KEY, state);
  await card.sync();
  return card;
}

export async function getFateDiceState(card: AppCard): Promise<FateDiceState | null> {
  const value = await card.getMetadata(FATE_DICE_METADATA_KEY);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<FateDiceState>;
  if (candidate.kind !== 'fate-dice' || !isDice(candidate.dice)) return null;

  const rollCount = typeof candidate.rollCount === 'number' ? candidate.rollCount : 1;
  const rolledAt = typeof candidate.rolledAt === 'string' ? candidate.rolledAt : new Date().toISOString();
  const parsedHistory = Array.isArray(candidate.history)
    ? candidate.history.filter((roll): roll is RollResult => Boolean(roll && typeof roll === 'object' && isDice(roll.dice))).slice(0, MAX_ROLL_HISTORY)
    : [];
  const history = parsedHistory.length ? parsedHistory : [{dice: candidate.dice, rolledAt, sequence: rollCount}];

  return {
    kind: 'fate-dice', version: 2, dice: history[0].dice, rollCount,
    rolledAt: history[0].rolledAt, history, locale: candidate.locale === 'en' ? 'en' : 'ru',
  };
}

async function saveState(card: AppCard, state: FateDiceState): Promise<FateDiceState> {
  applyStateToCard(card, state);
  await card.setMetadata(FATE_DICE_METADATA_KEY, state);
  await card.sync();
  return state;
}

export async function rollAndSyncCard(card: AppCard): Promise<FateDiceState> {
  if (!card.owned) throw new Error('CARD_READ_ONLY');
  const previousState = await getFateDiceState(card);
  if (!previousState) throw new Error('NOT_FATE_DICE_CARD');
  const nextRoll: RollResult = {
    dice: rollFourDice(), sequence: previousState.rollCount + 1, rolledAt: new Date().toISOString(),
  };
  return saveState(card, {
    ...previousState,
    dice: nextRoll.dice,
    rollCount: nextRoll.sequence,
    rolledAt: nextRoll.rolledAt,
    history: [nextRoll, ...previousState.history].slice(0, MAX_ROLL_HISTORY),
  });
}

export async function setCardLocale(card: AppCard, locale: Locale): Promise<FateDiceState> {
  if (!card.owned) throw new Error('CARD_READ_ONLY');
  const state = await getFateDiceState(card);
  if (!state) throw new Error('NOT_FATE_DICE_CARD');
  return saveState(card, {...state, locale});
}
