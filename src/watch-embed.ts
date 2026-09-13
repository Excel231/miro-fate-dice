import type {Embed} from '@mirohq/websdk-types';

export type WatchRoom = {
  type: 'room_id' | 'access_key';
  value: string;
};

const WATCH_ROOM_VALUE = /^[a-z0-9_-]+$/i;

export function parseWatchRoom(value: string): WatchRoom | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (WATCH_ROOM_VALUE.test(trimmed)) return {type: 'room_id', value: trimmed};

  try {
    const pastedUrl = (trimmed.match(/https?:\/\/[^\s]+/i)?.[0] ?? trimmed).replace(/[),.;]+$/, '');
    const url = new URL(/^https?:\/\//i.test(pastedUrl) ? pastedUrl : `https://${pastedUrl}`);
    if (!/(^|\.)(w2g\.tv|watch2gether\.com)$/i.test(url.hostname)) return null;

    const accessKey = url.searchParams.get('access_key');
    if (accessKey && WATCH_ROOM_VALUE.test(accessKey)) return {type: 'access_key', value: accessKey};

    const queryRoom = url.searchParams.get('room_id') ?? url.searchParams.get('r');
    if (queryRoom && WATCH_ROOM_VALUE.test(queryRoom)) return {type: 'room_id', value: queryRoom};

    const parts = url.pathname.split('/').filter(Boolean);
    const roomsIndex = parts.findIndex((part) => part.toLowerCase() === 'rooms');
    const room = roomsIndex >= 0 ? parts[roomsIndex + 1] : parts.at(-1);
    return room && WATCH_ROOM_VALUE.test(room) ? {type: 'room_id', value: room} : null;
  } catch {
    return null;
  }
}

export function serializeWatchRoom(room: WatchRoom): string {
  return `${room.type}=${encodeURIComponent(room.value)}`;
}

export function restoreWatchRoom(value: string | null): WatchRoom | null {
  if (!value) return null;
  const params = new URLSearchParams(value.includes('=') ? value : `room_id=${value}`);
  const type = params.has('access_key') ? 'access_key' : 'room_id';
  const roomValue = params.get(type) ?? '';
  return WATCH_ROOM_VALUE.test(roomValue) ? {type, value: roomValue} : null;
}

export async function createWatch2GetherEmbed(room: WatchRoom): Promise<Embed> {
  const viewport = await miro.board.viewport.get();
  const sourceUrl = `${window.location.origin}/api/watch?${serializeWatchRoom(room)}`;
  return miro.board.createEmbed({
    url: sourceUrl,
    mode: 'inline',
    x: viewport.x + viewport.width / 2,
    y: viewport.y + viewport.height / 2,
    width: 960,
    height: 540,
  });
}
