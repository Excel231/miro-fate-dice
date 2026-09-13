import type {AppCard, Embed, ItemsUpdateEvent} from '@mirohq/websdk-types';

import {FATE_DICE_TITLE_PREFIX, getFateDiceState, rollAndSyncCard} from './board-card';
import {CHARACTER_ASSET_COLLECTION, CHARACTER_SHEET_CHANNEL, getCharacterSheetState, parseCharacterSheetState, saveCharacterSheetState, type CharacterAssetKind, type CharacterSheetRequest, type CharacterSheetResponse, type CharacterSheetState} from './character-sheet';
import {formatTotal, getTotal} from './dice';
import {FATE_DICE_CHANNEL, getEmbedState, rollEmbedState, saveEmbedState, type EmbedRequest, type EmbedResponse} from './embed-card';
import {getSceneSheetState, parseSceneSheetState, saveSceneSheetState, SCENE_SHEET_CHANNEL, type SceneSheetRequest, type SceneSheetResponse} from './scene-sheet';

export async function init() {
  // The same document is the public landing page outside of Miro.
  if (window.self === window.top) return;

  miro.board.ui.on('icon:click', async () => {
    await miro.board.ui.openPanel({url: 'app.html'});
  });

  miro.board.ui.on('app_card:open', async ({appCard}) => {
    const state = await getFateDiceState(appCard);
    if (!state) return;

    await miro.board.ui.openModal({
      url: 'modal.html',
      width: 520,
      height: 720,
      data: {appCardId: appCard.id},
    });
  });

  const embedChannel = new BroadcastChannel(FATE_DICE_CHANNEL);
  const sendEmbedState = (instanceId: string, state: Awaited<ReturnType<typeof getEmbedState>>) => {
    if (!state) return;
    embedChannel.postMessage({type: 'state', instanceId, state} as EmbedResponse);
  };
  const findEmbed = async (instanceId: string): Promise<{embed: Embed; state: NonNullable<Awaited<ReturnType<typeof getEmbedState>>>} | null> => {
    const embeds = await miro.board.get({type: 'embed'});
    for (const embed of embeds) {
      const state = await getEmbedState(embed);
      if (state?.instanceId === instanceId) return {embed, state};
    }
    return null;
  };

  embedChannel.addEventListener('message', (event: MessageEvent<EmbedRequest>) => {
    const request = event.data;
    if (!request || !request.instanceId || !['request-state', 'roll', 'set-locale', 'set-theme'].includes(request.type)) return;
    void (async () => {
      try {
        const match = await findEmbed(request.instanceId);
        if (!match) throw new Error('EMBED_NOT_FOUND');
        let nextState = match.state;
        if (request.type === 'roll') nextState = rollEmbedState(nextState);
        if (request.type === 'set-locale' && request.locale) nextState = {...nextState, locale: request.locale};
        if (request.type === 'set-theme' && request.theme) nextState = {...nextState, theme: request.theme};
        if (request.type !== 'request-state') await saveEmbedState(match.embed, nextState);
        sendEmbedState(request.instanceId, nextState);
      } catch (error) {
        console.error(error);
        embedChannel.postMessage({type: 'error', instanceId: request.instanceId, message: 'Unable to update Fate Dice.'} as EmbedResponse);
      }
    })();
  });

  const syncUpdatedEmbeds = ({items}: ItemsUpdateEvent) => {
    void Promise.all(items.filter((item) => item.type === 'embed').map(async (item) => {
      if (!('mode' in item)) return;
      const state = await getEmbedState(item as Embed);
      if (state) sendEmbedState(state.instanceId, state);
    }));
  };
  miro.board.ui.on('experimental:items:update', syncUpdatedEmbeds);

  const characterChannel = new BroadcastChannel(CHARACTER_SHEET_CHANNEL);
  const characterAssets = miro.board.storage.collection(CHARACTER_ASSET_COLLECTION);
  const assetToken = (kind: CharacterAssetKind) => `miro-storage:${kind}`;
  const assetKey = (instanceId: string, kind: CharacterAssetKind) => `${instanceId}:${kind}`;
  const assetField = (kind: CharacterAssetKind): 'photoUrl' | 'backgroundImageUrl' => kind === 'photo' ? 'photoUrl' : 'backgroundImageUrl';
  const loadCharacterAssets = async (state: CharacterSheetState) => {
    const assets: Partial<Record<CharacterAssetKind, string>> = {};
    for (const kind of ['photo', 'background'] as const) {
      if (state[assetField(kind)] !== assetToken(kind)) continue;
      const value = await characterAssets.get<string>(assetKey(state.instanceId, kind));
      if (typeof value === 'string' && /^data:image\/(?:jpeg|png|webp);base64,/i.test(value)) assets[kind] = value;
    }
    return assets;
  };
  const sendCharacterState = async (instanceId: string, state: Awaited<ReturnType<typeof getCharacterSheetState>>) => {
    if (!state) return;
    characterChannel.postMessage({type: 'state', instanceId, state, assets: await loadCharacterAssets(state)} as CharacterSheetResponse);
  };
  const findCharacterSheet = async (instanceId: string): Promise<{embed: Embed; state: NonNullable<Awaited<ReturnType<typeof getCharacterSheetState>>>} | null> => {
    const embeds = await miro.board.get({type: 'embed'});
    for (const embed of embeds) {
      const state = await getCharacterSheetState(embed);
      if (state?.instanceId === instanceId) return {embed, state};
    }
    return null;
  };
  characterChannel.addEventListener('message', (event: MessageEvent<CharacterSheetRequest>) => {
    const request = event.data;
    if (!request || !request.instanceId || !['request-state', 'save-state', 'save-asset', 'remove-asset'].includes(request.type)) return;
    void (async () => {
      try {
        const match = await findCharacterSheet(request.instanceId);
        if (!match) throw new Error('CHARACTER_SHEET_NOT_FOUND');
        const requestedState = request.type === 'request-state' ? null : parseCharacterSheetState(request.state);
        if (request.type !== 'request-state' && requestedState?.instanceId !== request.instanceId) throw new Error('INVALID_CHARACTER_SHEET_STATE');
        let nextState = requestedState ?? match.state;
        if (request.type === 'save-state') {
          for (const kind of ['photo', 'background'] as const) {
            if (match.state[assetField(kind)] === assetToken(kind) && nextState[assetField(kind)] !== assetToken(kind)) {
              await characterAssets.remove(assetKey(request.instanceId, kind));
            }
          }
          await saveCharacterSheetState(match.embed, nextState);
        }
        if (request.type === 'save-asset') {
          if (!/^data:image\/jpeg;base64,/i.test(request.dataUrl) || request.dataUrl.length > 63000) throw new Error('INVALID_CHARACTER_ASSET');
          await characterAssets.set(assetKey(request.instanceId, request.kind), request.dataUrl);
          nextState = {...(requestedState ?? match.state), [assetField(request.kind)]: assetToken(request.kind)};
          await saveCharacterSheetState(match.embed, nextState);
        }
        if (request.type === 'remove-asset') {
          await characterAssets.remove(assetKey(request.instanceId, request.kind));
          nextState = {...(requestedState ?? match.state), [assetField(request.kind)]: ''};
          await saveCharacterSheetState(match.embed, nextState);
        }
        await sendCharacterState(request.instanceId, nextState);
      } catch (error) {
        console.error(error);
        characterChannel.postMessage({type: 'error', instanceId: request.instanceId, message: 'Unable to update character sheet.'} as CharacterSheetResponse);
      }
    })();
  });

  miro.board.ui.on('experimental:items:update', ({items}: ItemsUpdateEvent) => {
    void Promise.all(items.filter((item) => item.type === 'embed').map(async (item) => {
      if (!('mode' in item)) return;
      const state = await getCharacterSheetState(item as Embed);
      if (state) void sendCharacterState(state.instanceId, state);
    }));
  });

  const sceneChannel = new BroadcastChannel(SCENE_SHEET_CHANNEL);
  const sendSceneState = (instanceId: string, state: Awaited<ReturnType<typeof getSceneSheetState>>) => {
    if (state) sceneChannel.postMessage({type: 'state', instanceId, state} as SceneSheetResponse);
  };
  const findSceneSheet = async (instanceId: string): Promise<{embed: Embed; state: NonNullable<Awaited<ReturnType<typeof getSceneSheetState>>>} | null> => {
    const embeds = await miro.board.get({type: 'embed'});
    for (const embed of embeds) {
      const state = await getSceneSheetState(embed);
      if (state?.instanceId === instanceId) return {embed, state};
    }
    return null;
  };
  sceneChannel.addEventListener('message', (event: MessageEvent<SceneSheetRequest>) => {
    const request = event.data;
    if (!request || !request.instanceId || !['request-state', 'save-state'].includes(request.type)) return;
    void (async () => {
      try {
        const match = await findSceneSheet(request.instanceId);
        if (!match) throw new Error('SCENE_SHEET_NOT_FOUND');
        const requestedState = request.type === 'save-state' ? parseSceneSheetState(request.state) : null;
        if (request.type === 'save-state' && requestedState?.instanceId !== request.instanceId) throw new Error('INVALID_SCENE_SHEET_STATE');
        const nextState = requestedState ?? match.state;
        if (request.type === 'save-state') await saveSceneSheetState(match.embed, nextState);
        sendSceneState(request.instanceId, nextState);
      } catch (error) {
        console.error(error);
        sceneChannel.postMessage({type: 'error', instanceId: request.instanceId, message: 'Unable to update scene sheet.'} as SceneSheetResponse);
      }
    })();
  });

  miro.board.ui.on('experimental:items:update', ({items}: ItemsUpdateEvent) => {
    void Promise.all(items.filter((item) => item.type === 'embed').map(async (item) => {
      if (!('mode' in item)) return;
      const state = await getSceneSheetState(item as Embed);
      if (state) sendSceneState(state.instanceId, state);
    }));
  });

  const rollFromCardMenu = async ({items}: {items: unknown[]}) => {
    const card = items.find(
      (item): item is AppCard =>
        typeof item === 'object' && item !== null && 'type' in item && item.type === 'app_card',
    );
    if (!card) return;

    try {
      const state = await rollAndSyncCard(card);
      await miro.board.notifications.showInfo(`Fate Dice: ${formatTotal(getTotal(state.dice))}`);
    } catch (error) {
      const message =
        error instanceof Error && error.message === 'CARD_READ_ONLY'
          ? 'Эта копия карточки доступна только для чтения. Добавьте новую через Fate Dice.'
          : 'Не удалось бросить кубики.';
      await miro.board.notifications.showError(message);
    }
  };

  // Custom actions are currently experimental and available only for private apps.
  // The app-card modal above remains the stable interaction path if registration fails.
  try {
    miro.board.ui.on('custom:roll-fate-dice', rollFromCardMenu);
    await miro.board.experimental.action.register({
      event: 'roll-fate-dice',
      ui: {
        label: 'Roll',
        description: 'Roll four Fate dice and update the shared result.',
        icon: 'refresh',
      },
      selection: 'single',
      scope: 'local',
      predicate: {
        type: 'app_card',
        title: {$regex: `^${FATE_DICE_TITLE_PREFIX}`},
      },
      contexts: {item: {}},
    });
  } catch (error) {
    console.info('Fate Dice custom action is not available in this Miro environment.', error);
  }
}

void init();
