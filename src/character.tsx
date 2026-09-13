import * as React from 'react';
import {createRoot} from 'react-dom/client';

import './assets/style.css';
import {
  CHARACTER_SHEET_CHANNEL,
  createInitialCharacterState,
  parseCharacterSheetState,
  type CharacterAssetKind,
  type CharacterMode,
  type CharacterSheetRequest,
  type CharacterSheetResponse,
  type CharacterSheetState,
} from './character-sheet';
import {DIE_LABELS, formatTotal, getTotal, rollFourDice, type DieValue} from './dice';

const COPY = {
  ru: {
    core: 'Fate Core', accelerated: 'Fate Accelerated', character: 'Персонаж', description: 'Описание',
    descriptionPlaceholder: 'Кто этот персонаж?', aspects: 'Аспекты', highConcept: 'Высокая концепция', trouble: 'Проблема', aspect: 'Аспект',
    skills: 'Навыки', approaches: 'Подходы', skillPlaceholder: 'Название навыка', refresh: 'Обновление', fatePoints: 'Жетоны судьбы',
    stress: 'Стресс', physical: 'Физический', mental: 'Ментальный', consequences: 'Последствия', mild: 'Лёгкое', moderate: 'Среднее', severe: 'Тяжёлое',
    stunts: 'Трюки', stuntPlaceholder: 'Опишите трюк…', addAspect: 'Добавить аспект', addStunt: 'Добавить трюк',
    saving: 'Сохраняем…', saved: 'Сохранено', loading: 'Подключение к доске…', unavailable: 'Откройте Fate Tools на этой доске, чтобы редактировать лист.',
    characterName: 'Имя персонажа', remove: 'Удалить', theme: 'Переключить тему', sheet: 'Лист', settings: 'Настройки',
    appearance: 'Оформление', gradientStart: 'Первый цвет', gradientEnd: 'Второй цвет', gradientAngle: 'Угол градиента',
    gradientPresets: 'Готовые градиенты', gradientCustom: 'Свой', gradientOption: 'Вариант',
    portrait: 'Фото персонажа', photoUrl: 'Ссылка на изображение', photoHint: 'Используйте прямую HTTPS-ссылку на изображение.', removePhoto: 'Убрать фото',
    backgroundImage: 'Фоновое изображение', backgroundUrl: 'Ссылка на фон', uploadImage: 'Загрузить файл', removeBackground: 'Убрать фон', resetGradient: 'Вернуть стандартный градиент',
    uploadError: 'Не удалось обработать изображение. Выберите JPG, PNG или WebP.', uploading: 'Обрабатываем…',
    roll: 'Бросить', rollPrompt: 'Нажмите на ✦ у навыка или подхода', rollResult: 'Результат броска',
  },
  en: {
    core: 'Fate Core', accelerated: 'Fate Accelerated', character: 'Character', description: 'Description',
    descriptionPlaceholder: 'Who is this character?', aspects: 'Aspects', highConcept: 'High concept', trouble: 'Trouble', aspect: 'Aspect',
    skills: 'Skills', approaches: 'Approaches', skillPlaceholder: 'Skill name', refresh: 'Refresh', fatePoints: 'Fate points',
    stress: 'Stress', physical: 'Physical', mental: 'Mental', consequences: 'Consequences', mild: 'Mild', moderate: 'Moderate', severe: 'Severe',
    stunts: 'Stunts', stuntPlaceholder: 'Describe a stunt…', addAspect: 'Add aspect', addStunt: 'Add stunt',
    saving: 'Saving…', saved: 'Saved', loading: 'Connecting to board…', unavailable: 'Open Fate Tools on this board to edit the sheet.',
    characterName: 'Character name', remove: 'Remove', theme: 'Toggle theme', sheet: 'Sheet', settings: 'Settings',
    appearance: 'Appearance', gradientStart: 'First color', gradientEnd: 'Second color', gradientAngle: 'Gradient angle',
    gradientPresets: 'Gradient presets', gradientCustom: 'Custom', gradientOption: 'Option',
    portrait: 'Character photo', photoUrl: 'Image URL', photoHint: 'Use a direct HTTPS image URL.', removePhoto: 'Remove photo',
    backgroundImage: 'Background image', backgroundUrl: 'Background URL', uploadImage: 'Upload file', removeBackground: 'Remove background', resetGradient: 'Reset default gradient',
    uploadError: 'Could not process this image. Choose a JPG, PNG, or WebP file.', uploading: 'Processing…',
    roll: 'Roll', rollPrompt: 'Press ✦ next to a skill or approach', rollResult: 'Roll result',
  },
} as const;

type GradientPreset = {id: string; start: string; end: string; angle: number};

const GRADIENT_PRESETS: GradientPreset[] = [
  {id: 'warm', start: '#fff4df', end: '#e2bfae', angle: 145},
  {id: 'mint', start: '#effbf7', end: '#b9ddd7', angle: 145},
  {id: 'lavender', start: '#f3efff', end: '#c9bde8', angle: 135},
  {id: 'sky', start: '#edf7ff', end: '#b5d8ed', angle: 145},
  {id: 'coral', start: '#fff1eb', end: '#efb4a3', angle: 135},
  {id: 'gold', start: '#fff8dc', end: '#e7ca86', angle: 155},
  {id: 'rose', start: '#f9eff5', end: '#d8b8c9', angle: 145},
  {id: 'silver', start: '#f4f5f7', end: '#c6cbd3', angle: 135},
  {id: 'midnight', start: '#1d2638', end: '#46516f', angle: 145},
  {id: 'plum', start: '#241d2b', end: '#583b55', angle: 135},
  {id: 'abyss', start: '#080b13', end: '#1c2940', angle: 150},
  {id: 'ember', start: '#180d0c', end: '#54241b', angle: 135},
  {id: 'forest', start: '#07140f', end: '#1d4435', angle: 150},
  {id: 'eclipse', start: '#100e16', end: '#40334d', angle: 130},
  {id: 'deep-sea', start: '#061520', end: '#185069', angle: 155},
  {id: 'blood-moon', start: '#180914', end: '#641b39', angle: 140},
  {id: 'graphite', start: '#111315', end: '#3e454b', angle: 145},
  {id: 'nightshade', start: '#121020', end: '#343064', angle: 135},
  {id: 'black-gold', start: '#12100b', end: '#4d3b1f', angle: 155},
];

const isDarkColor = (hex: string) => {
  const [red, green, blue] = (hex.match(/[0-9a-f]{2}/gi) ?? ['ff', 'ff', 'ff']).map((channel) => Number.parseInt(channel, 16));
  return (red * 299 + green * 587 + blue * 114) / 1000 < 128;
};

const mixHex = (source: string, target: string, targetWeight: number) => {
  const channels = (hex: string) => (hex.match(/[0-9a-f]{2}/gi) ?? ['00', '00', '00']).map((channel) => Number.parseInt(channel, 16));
  const sourceChannels = channels(source);
  const targetChannels = channels(target);
  return `#${sourceChannels.map((channel, index) => Math.round(channel * (1 - targetWeight) + targetChannels[index] * targetWeight).toString(16).padStart(2, '0')).join('')}`;
};

const hexToRgba = (hex: string, alpha: number) => {
  const [red, green, blue] = (hex.match(/[0-9a-f]{2}/gi) ?? ['00', '00', '00']).map((channel) => Number.parseInt(channel, 16));
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const instanceId = new URLSearchParams(window.location.search).get('instance') ?? '';
const autoSizeEnabled = new URLSearchParams(window.location.search).get('autosize') === '1';
const requestedPreview = new URLSearchParams(window.location.search).get('preview');
const previewMode: CharacterMode | null = ['localhost', '127.0.0.1'].includes(window.location.hostname) && (requestedPreview === 'core' || requestedPreview === 'accelerated') ? requestedPreview : null;

const NumericField: React.FC<{label: string; value: number; onChange: (value: number) => void}> = ({label, value, onChange}) => (
  <label className="character-counter"><span>{label}</span><input type="number" min="0" max="12" value={value} onChange={(event) => onChange(Math.max(0, Math.min(12, Number(event.target.value) || 0)))} /></label>
);

const ASSET_TOKEN_PREFIX = 'miro-storage:';

async function compressImage(file: File, maxWidth: number, maxHeight: number): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('INVALID_IMAGE');
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  let width = Math.max(1, Math.round(bitmap.width * scale));
  let height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('CANVAS_UNAVAILABLE');
  let dataUrl = '';
  for (let attempt = 0; attempt < 8; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    dataUrl = canvas.toDataURL('image/jpeg', Math.max(.38, .84 - attempt * .08));
    if (dataUrl.length <= 62000) break;
    width = Math.max(1, Math.round(width * .86));
    height = Math.max(1, Math.round(height * .86));
  }
  bitmap.close();
  if (!dataUrl || dataUrl.length > 62000) throw new Error('IMAGE_TOO_LARGE');
  return dataUrl;
}

const CharacterSheet: React.FC = () => {
  const [state, setState] = React.useState<CharacterSheetState | null>(() => previewMode ? createInitialCharacterState(previewMode, 'preview', 'ru', 'light') : null);
  const [activeTab, setActiveTab] = React.useState<'sheet' | 'settings'>('sheet');
  const [photoFailed, setPhotoFailed] = React.useState(false);
  const [assetSources, setAssetSources] = React.useState<Partial<Record<CharacterAssetKind, string>>>({});
  const [uploadingAsset, setUploadingAsset] = React.useState<CharacterAssetKind | null>(null);
  const [assetError, setAssetError] = React.useState(false);
  const [roll, setRoll] = React.useState<{dice: DieValue[]; modifier: number; label: string} | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved'>('idle');
  const [isUnavailable, setIsUnavailable] = React.useState(false);
  const channel = React.useMemo(() => new BroadcastChannel(CHARACTER_SHEET_CHANNEL), []);
  const saveTimer = React.useRef<number>();
  const receivedInitialState = React.useRef(false);
  const reportedInitialViewport = React.useRef(false);
  const pendingLocalState = React.useRef<CharacterSheetState | null>(null);

  React.useEffect(() => {
    if (previewMode) return () => channel.close();
    const receive = (event: MessageEvent<CharacterSheetResponse>) => {
      if (event.data.instanceId !== instanceId) return;
      if (event.data.type === 'error') {
        setUploadingAsset(null);
        setAssetError(true);
        setSaveStatus('idle');
        return;
      }
      if (!event.data.state) return;
      setAssetSources(event.data.assets ?? {});
      setUploadingAsset(null);
      setAssetError(false);
      if (pendingLocalState.current) {
        const normalizedPendingState = parseCharacterSheetState(pendingLocalState.current);
        if (normalizedPendingState && JSON.stringify(event.data.state) === JSON.stringify(normalizedPendingState)) {
          pendingLocalState.current = null;
          setState(event.data.state);
          setSaveStatus('saved');
        }
        return;
      }
      setState(event.data.state);
      receivedInitialState.current = true;
      setIsUnavailable(false);
      setSaveStatus((current) => current === 'saving' ? 'saved' : current);
    };
    channel.addEventListener('message', receive);
    const request = () => channel.postMessage({type: 'request-state', instanceId} as CharacterSheetRequest);
    request();
    const retry = window.setInterval(() => { if (!receivedInitialState.current) request(); }, 1500);
    const unavailable = window.setTimeout(() => { if (!receivedInitialState.current) setIsUnavailable(true); }, 4500);
    return () => {
      window.clearInterval(retry);
      window.clearTimeout(unavailable);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      channel.removeEventListener('message', receive);
      channel.close();
    };
  }, [channel]);

  React.useEffect(() => {
    const theme = state?.theme ?? 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    if (state) document.documentElement.lang = state.locale;
  }, [state?.theme, state?.locale]);

  React.useLayoutEffect(() => {
    if (!state || previewMode || !autoSizeEnabled || reportedInitialViewport.current) return;
    reportedInitialViewport.current = true;
    const frame = window.requestAnimationFrame(() => {
      channel.postMessage({type: 'report-initial-viewport', instanceId, viewportWidth: window.innerWidth} as CharacterSheetRequest);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [channel, state]);

  const update = (recipe: (current: CharacterSheetState) => CharacterSheetState) => {
    setState((current) => {
      if (!current) return current;
      const next = recipe(current);
      pendingLocalState.current = next;
      setSaveStatus('saving');
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (previewMode) {
        pendingLocalState.current = null;
        setSaveStatus('saved');
        return next;
      }
      saveTimer.current = window.setTimeout(() => {
        channel.postMessage({type: 'save-state', instanceId, state: next} as CharacterSheetRequest);
      }, 3000);
      return next;
    });
  };

  if (!state) {
    const copy = COPY.ru;
    return <main className="character-sheet character-sheet--loading"><span className="character-sheet__sigil">F</span><strong>{copy.loading}</strong><p>{isUnavailable ? copy.unavailable : ''}</p></main>;
  }

  const copy = COPY[state.locale];
  const activeGradientPreset = GRADIENT_PRESETS.find((preset) => preset.start.toLowerCase() === state.backgroundStart.toLowerCase()
    && preset.end.toLowerCase() === state.backgroundEnd.toLowerCase()
    && preset.angle === state.gradientAngle);
  const usesDarkGradient = isDarkColor(state.backgroundStart) && isDarkColor(state.backgroundEnd);
  const sheetAccent = mixHex(state.backgroundEnd, usesDarkGradient ? '#ffffff' : '#000000', usesDarkGradient ? .38 : .48);
  const aspectLabels = [copy.highConcept, copy.trouble, copy.aspect, copy.aspect, copy.aspect];
  const consequenceLabels = {2: copy.mild, 4: copy.moderate, 6: copy.severe} as const;
  const replaceAt = (items: string[], index: number, value: string) => items.map((item, itemIndex) => itemIndex === index ? value : item);
  const renderStressTrack = (items: boolean[], key: 'physicalStress' | 'mentalStress') => items.map((checked, index) => (
    <label className={`stress-box${index >= 3 ? ' stress-box--extra' : ''}`} key={index}>
      <input type="checkbox" aria-label={`${key === 'physicalStress' ? copy.physical : copy.mental} ${index + 1}`} checked={checked} onChange={(event) => update((current) => ({...current, [key]: current[key].map((item, itemIndex) => itemIndex === index ? event.target.checked : item)}))} />
      <span aria-hidden="true">{checked ? '✓' : ''}</span>
    </label>
  ));
  const sheetStyle = {
    '--sheet-gradient-start': state.backgroundStart,
    '--sheet-gradient-end': state.backgroundEnd,
    '--sheet-gradient-angle': `${state.gradientAngle}deg`,
    '--sheet-accent': sheetAccent,
    '--sheet-accent-shadow': hexToRgba(sheetAccent, .28),
    '--sheet-accent-contrast': usesDarkGradient ? '#151720' : '#ffffff',
  } as React.CSSProperties;
  const resolveAssetSource = (value: string, kind: CharacterAssetKind) => value === `${ASSET_TOKEN_PREFIX}${kind}`
    ? assetSources[kind] ?? ''
    : (/^https?:\/\//i.test(value) ? value : '');
  const safePhotoUrl = resolveAssetSource(state.photoUrl, 'photo');
  const safeBackgroundUrl = resolveAssetSource(state.backgroundImageUrl, 'background');
  if (safeBackgroundUrl) {
    sheetStyle.backgroundImage = `linear-gradient(rgba(255,255,255,.26), rgba(255,255,255,.26)), url(${JSON.stringify(safeBackgroundUrl)})`;
    sheetStyle.backgroundPosition = 'center';
    sheetStyle.backgroundSize = 'cover';
  }
  const saveAssetFile = async (kind: CharacterAssetKind, file: File | undefined) => {
    if (!file) return;
    setUploadingAsset(kind);
    setAssetError(false);
    try {
      const dataUrl = await compressImage(file, kind === 'photo' ? 520 : 1280, kind === 'photo' ? 520 : 720);
      const field = kind === 'photo' ? 'photoUrl' : 'backgroundImageUrl';
      const nextState = {...state, [field]: `${ASSET_TOKEN_PREFIX}${kind}`};
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      setAssetSources((current) => ({...current, [kind]: dataUrl}));
      if (kind === 'photo') setPhotoFailed(false);
      setState(nextState);
      pendingLocalState.current = nextState;
      setSaveStatus('saving');
      if (previewMode) {
        pendingLocalState.current = null;
        setUploadingAsset(null);
        setSaveStatus('saved');
        return;
      }
      channel.postMessage({type: 'save-asset', instanceId, kind, dataUrl, state: nextState} as CharacterSheetRequest);
    } catch (error) {
      console.error(error);
      setUploadingAsset(null);
      setAssetError(true);
    }
  };
  const removeAsset = (kind: CharacterAssetKind) => {
    const field = kind === 'photo' ? 'photoUrl' : 'backgroundImageUrl';
    const usedStoredAsset = state[field] === `${ASSET_TOKEN_PREFIX}${kind}`;
    const nextState = {...state, [field]: ''};
    setAssetSources((current) => ({...current, [kind]: undefined}));
    if (kind === 'photo') setPhotoFailed(false);
    if (!usedStoredAsset) {
      update(() => nextState);
      return;
    }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setState(nextState);
    pendingLocalState.current = nextState;
    setSaveStatus('saving');
    if (previewMode) {
      pendingLocalState.current = null;
      setSaveStatus('saved');
      return;
    }
    channel.postMessage({type: 'remove-asset', instanceId, kind, state: nextState} as CharacterSheetRequest);
  };
  const rollTrait = (trait: CharacterSheetState['traits'][number]) => {
    setRoll({dice: rollFourDice(), modifier: trait.value, label: trait.name.trim() || (state.mode === 'core' ? copy.skills : copy.approaches)});
  };
  const rollTotal = roll ? getTotal(roll.dice) + roll.modifier : null;

  return (
    <main className={`character-sheet character-sheet--${state.mode}${usesDarkGradient ? ' character-sheet--dark-gradient' : ''}${safePhotoUrl && !photoFailed ? ' character-sheet--has-photo' : ''}`} style={sheetStyle}>
      <header className="character-sheet__header">
        <div><span className="character-sheet__eyebrow">{state.mode === 'core' ? copy.core : copy.accelerated}</span><input className="character-sheet__name" aria-label={copy.characterName} value={state.name} onChange={(event) => update((current) => ({...current, name: event.target.value}))} /></div>
        {safePhotoUrl && !photoFailed && <img className="character-sheet__portrait" src={safePhotoUrl} alt="" onError={() => setPhotoFailed(true)} />}
        <div className="character-sheet__controls">
          <span className={`save-indicator save-indicator--${saveStatus}`}>{saveStatus === 'saving' ? copy.saving : saveStatus === 'saved' ? copy.saved : ''}</span>
          <div className="sheet-tabs" aria-label={copy.settings}><button className={activeTab === 'sheet' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('sheet')}>{copy.sheet}</button><button className={activeTab === 'settings' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('settings')}>{copy.settings}</button></div>
          <div className="language-switch"><button className={state.locale === 'ru' ? 'is-active' : ''} onClick={() => update((current) => ({...current, locale: 'ru'}))} type="button">RU</button><button className={state.locale === 'en' ? 'is-active' : ''} onClick={() => update((current) => ({...current, locale: 'en'}))} type="button">EN</button></div>
          <button className="theme-toggle" type="button" aria-label={copy.theme} title={copy.theme} onClick={() => update((current) => ({...current, theme: current.theme === 'light' ? 'dark' : 'light'}))}><span aria-hidden="true">{state.theme === 'light' ? '☾' : '☀'}</span></button>
        </div>
      </header>

      {activeTab === 'sheet' ? <>
      <section className="character-sheet__intro">
        <label className="character-field character-field--description"><span>{copy.description}</span><textarea rows={4} placeholder={copy.descriptionPlaceholder} value={state.description} onChange={(event) => update((current) => ({...current, description: event.target.value}))} /></label>
        <div className="character-sheet__counters"><NumericField label={copy.refresh} value={state.refresh} onChange={(value) => update((current) => ({...current, refresh: value}))} /><NumericField label={copy.fatePoints} value={state.fatePoints} onChange={(value) => update((current) => ({...current, fatePoints: value}))} /></div>
      </section>

      <div className="character-sheet__columns">
        <div className="character-sheet__column">
          <section className="sheet-section sheet-section--aspects">
            <h2>{copy.aspects}</h2>
            <div className="sheet-stack">{state.aspects.map((aspect, index) => <label className="character-field" key={index}><span>{aspectLabels[index] ?? `${copy.aspect} ${index - 1}`}</span><span className="removable-field"><input value={aspect} onChange={(event) => update((current) => ({...current, aspects: replaceAt(current.aspects, index, event.target.value)}))} />{index >= 5 && <button type="button" aria-label={copy.remove} title={copy.remove} onClick={() => update((current) => ({...current, aspects: current.aspects.filter((_, itemIndex) => itemIndex !== index)}))}>×</button>}</span></label>)}</div>
            {state.aspects.length < 8 && <button className="sheet-add" type="button" onClick={() => update((current) => ({...current, aspects: [...current.aspects, '']}))}>+ {copy.addAspect}</button>}
          </section>

          <section className="sheet-section">
            <h2>{state.mode === 'core' ? copy.skills : copy.approaches}</h2>
            <div className={`trait-grid trait-grid--${state.mode}`}>{state.traits.map((trait) => <div className="trait" key={trait.id}><input className="trait__value" type="number" min="-2" max="8" value={trait.value} aria-label={`${trait.name} value`} onChange={(event) => update((current) => ({...current, traits: current.traits.map((item) => item.id === trait.id ? {...item, value: Math.max(-2, Math.min(8, Number(event.target.value) || 0))} : item)}))} /><input className="trait__name" value={trait.name} placeholder={copy.skillPlaceholder} onChange={(event) => update((current) => ({...current, traits: current.traits.map((item) => item.id === trait.id ? {...item, name: event.target.value} : item)}))} /><button className="trait__roll" type="button" title={copy.roll} aria-label={`${copy.roll}: ${trait.name || copy.skillPlaceholder}`} onClick={() => rollTrait(trait)}>✦</button></div>)}</div>
            <div className="character-roller character-roller--under-traits" aria-live="polite">
              <div className="character-roller__meta"><span>{copy.rollResult}</span><strong>{roll?.label ?? copy.rollPrompt}</strong></div>
              <div className="character-roller__dice" aria-label={copy.rollResult}>{(roll?.dice ?? [0, 0, 0, 0]).map((die, index) => <span className={`character-roll-die character-roll-die--${die === 1 ? 'plus' : die === -1 ? 'minus' : 'zero'}`} key={index}>{DIE_LABELS[die]}</span>)}</div>
              <strong className="character-roller__total">{rollTotal === null ? '—' : formatTotal(rollTotal)}</strong>
            </div>
          </section>
        </div>

        <div className="character-sheet__column">
          <div className="character-sheet__vitals">
            <section className="sheet-section">
              <h2>{copy.stress}</h2>
              <div className="stress-row"><span>{copy.physical}</span>{renderStressTrack(state.physicalStress, 'physicalStress')}</div>
              <div className="stress-row"><span>{copy.mental}</span>{renderStressTrack(state.mentalStress, 'mentalStress')}</div>
            </section>

            <section className="sheet-section sheet-section--consequences">
              <h2>{copy.consequences}</h2>
              <div className="sheet-stack">{state.consequences.map((consequence) => <label className="character-field" key={consequence.id}><span>{consequenceLabels[consequence.severity]} ({consequence.severity})</span><input value={consequence.value} onChange={(event) => update((current) => ({...current, consequences: current.consequences.map((item) => item.id === consequence.id ? {...item, value: event.target.value} : item)}))} /></label>)}</div>
            </section>
          </div>

          <section className="sheet-section sheet-section--stunts">
            <h2>{copy.stunts}</h2>
            <div className="sheet-stack">{state.stunts.map((stunt, index) => <span className="removable-field removable-field--textarea" key={index}><textarea rows={2} placeholder={copy.stuntPlaceholder} value={stunt} onChange={(event) => update((current) => ({...current, stunts: replaceAt(current.stunts, index, event.target.value)}))} />{state.stunts.length > 1 && <button type="button" aria-label={copy.remove} title={copy.remove} onClick={() => update((current) => ({...current, stunts: current.stunts.filter((_, itemIndex) => itemIndex !== index)}))}>×</button>}</span>)}</div>
            {state.stunts.length < 8 && <button className="sheet-add" type="button" onClick={() => update((current) => ({...current, stunts: [...current.stunts, '']}))}>+ {copy.addStunt}</button>}
          </section>
        </div>
      </div>
      </> : <section className="character-settings">
        <div className="character-settings__panel">
          <div className="character-settings__heading"><span>{copy.appearance}</span><strong>{copy.settings}</strong></div>
          <fieldset className="gradient-presets">
            <legend>{copy.gradientPresets}</legend>
            <div className="gradient-presets__grid">
              {GRADIENT_PRESETS.map((preset, index) => <button
                className={activeGradientPreset?.id === preset.id ? 'is-active' : ''}
                type="button"
                key={preset.id}
                title={`${copy.gradientOption} ${index + 1}`}
                aria-label={`${copy.gradientOption} ${index + 1}`}
                aria-pressed={activeGradientPreset?.id === preset.id}
                onClick={() => update((current) => ({...current, backgroundStart: preset.start, backgroundEnd: preset.end, gradientAngle: preset.angle}))}
              >
                <span className="gradient-presets__swatch" style={{background: `linear-gradient(${preset.angle}deg, ${preset.start}, ${preset.end})`}} />
              </button>)}
            </div>
            {!activeGradientPreset && <small>{copy.gradientCustom}</small>}
          </fieldset>
          <div className="gradient-settings">
            <label><span>{copy.gradientStart}</span><input type="color" value={state.backgroundStart} onChange={(event) => update((current) => ({...current, backgroundStart: event.target.value}))} /></label>
            <label><span>{copy.gradientEnd}</span><input type="color" value={state.backgroundEnd} onChange={(event) => update((current) => ({...current, backgroundEnd: event.target.value}))} /></label>
            <label className="gradient-settings__angle"><span>{copy.gradientAngle}</span><input type="range" min="0" max="360" value={state.gradientAngle} onChange={(event) => update((current) => ({...current, gradientAngle: Number(event.target.value)}))} /><output>{state.gradientAngle}°</output></label>
          </div>
          <button className="sheet-add" type="button" onClick={() => update((current) => ({...current, backgroundStart: current.mode === 'core' ? '#fff4df' : '#effbf7', backgroundEnd: current.mode === 'core' ? '#e2bfae' : '#b9ddd7', gradientAngle: 145}))}>{copy.resetGradient}</button>
          <div className="settings-divider" />
          <div className="character-settings__heading character-settings__heading--compact"><strong>{copy.backgroundImage}</strong></div>
          <label className="asset-upload"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { void saveAssetFile('background', event.target.files?.[0]); event.target.value = ''; }} /><span>{uploadingAsset === 'background' ? copy.uploading : copy.uploadImage}</span></label>
          <label className="photo-url-field"><input type="url" placeholder="https://…" value={state.backgroundImageUrl.startsWith(ASSET_TOKEN_PREFIX) ? '' : state.backgroundImageUrl} onChange={(event) => { setAssetSources((current) => ({...current, background: undefined})); update((current) => ({...current, backgroundImageUrl: event.target.value})); }} /><small>{copy.backgroundUrl}</small></label>
          {state.backgroundImageUrl && <button className="sheet-add" type="button" onClick={() => removeAsset('background')}>{copy.removeBackground}</button>}
        </div>
        <div className="character-settings__panel">
          <div className="character-settings__heading"><span>{copy.portrait}</span><strong>{copy.photoUrl}</strong></div>
          <label className="asset-upload"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { void saveAssetFile('photo', event.target.files?.[0]); event.target.value = ''; }} /><span>{uploadingAsset === 'photo' ? copy.uploading : copy.uploadImage}</span></label>
          <label className="photo-url-field"><input type="url" placeholder="https://…" value={state.photoUrl.startsWith(ASSET_TOKEN_PREFIX) ? '' : state.photoUrl} onChange={(event) => { setPhotoFailed(false); setAssetSources((current) => ({...current, photo: undefined})); update((current) => ({...current, photoUrl: event.target.value})); }} /><small>{copy.photoHint}</small></label>
          {state.photoUrl && <button className="sheet-add" type="button" onClick={() => removeAsset('photo')}>{copy.removePhoto}</button>}
          {assetError && <p className="asset-error" role="alert">{copy.uploadError}</p>}
        </div>
      </section>}
    </main>
  );
};

const container = document.getElementById('root');
if (!container) throw new Error('Root element was not found');
createRoot(container).render(<CharacterSheet />);
