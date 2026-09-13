import * as React from 'react';
import {createRoot} from 'react-dom/client';

import './assets/style.css';
import {
  createInitialSceneState,
  parseSceneSheetState,
  SCENE_SHEET_CHANNEL,
  type SceneSheetRequest,
  type SceneSheetResponse,
  type SceneSheetState,
} from './scene-sheet';

const COPY = {
  ru: {
    scene: 'Fate · Сцена', sceneName: 'Название сцены', sheet: 'Лист', settings: 'Настройки', theme: 'Переключить тему',
    description: 'Описание', descriptionPlaceholder: 'Что происходит в этой сцене?', location: 'Место и время',
    aspects: 'Аспекты сцены', aspect: 'Аспект', zones: 'Зоны', zone: 'Название зоны', zoneAspect: 'Аспект зоны',
    progress: 'Прогрессы сцены', progressName: 'Название прогресса', checks: 'Количество ячеек', notes: 'Заметки', notesPlaceholder: 'Подсказки, повороты, детали…', addAspect: 'Добавить аспект', addZone: 'Добавить зону', addProgress: 'Добавить прогресс', remove: 'Удалить',
    appearance: 'Оформление', gradientPresets: 'Готовые градиенты', gradientOption: 'Вариант', gradientStart: 'Первый цвет', gradientEnd: 'Второй цвет', gradientAngle: 'Угол градиента', resetGradient: 'Вернуть стандартный градиент',
    backgroundImage: 'Фоновое изображение', backgroundUrl: 'Ссылка на фон', backgroundHint: 'Используйте прямую HTTPS-ссылку на изображение.', removeBackground: 'Убрать фон',
    saving: 'Сохраняем…', saved: 'Сохранено', loading: 'Подключение к доске…', unavailable: 'Откройте Fate Tools на этой доске, чтобы редактировать сцену.',
  },
  en: {
    scene: 'Fate · Scene', sceneName: 'Scene name', sheet: 'Sheet', settings: 'Settings', theme: 'Toggle theme',
    description: 'Description', descriptionPlaceholder: 'What is happening in this scene?', location: 'Place and time',
    aspects: 'Scene aspects', aspect: 'Aspect', zones: 'Zones', zone: 'Zone name', zoneAspect: 'Zone aspect',
    progress: 'Scene progress tracks', progressName: 'Progress name', checks: 'Number of boxes', notes: 'Notes', notesPlaceholder: 'Cues, twists, details…', addAspect: 'Add aspect', addZone: 'Add zone', addProgress: 'Add progress track', remove: 'Remove',
    appearance: 'Appearance', gradientPresets: 'Gradient presets', gradientOption: 'Option', gradientStart: 'First color', gradientEnd: 'Second color', gradientAngle: 'Gradient angle', resetGradient: 'Reset default gradient',
    backgroundImage: 'Background image', backgroundUrl: 'Background URL', backgroundHint: 'Use a direct HTTPS image URL.', removeBackground: 'Remove background',
    saving: 'Saving…', saved: 'Saved', loading: 'Connecting to board…', unavailable: 'Open Fate Tools on this board to edit the scene.',
  },
} as const;

type GradientPreset = {id: string; start: string; end: string; angle: number};
const GRADIENT_PRESETS: GradientPreset[] = [
  {id: 'warm', start: '#fff4df', end: '#e2bfae', angle: 145},
  {id: 'mint', start: '#effbf7', end: '#b9ddd7', angle: 145},
  {id: 'lavender', start: '#f3efff', end: '#c9bde8', angle: 135},
  {id: 'sky', start: '#edf7ff', end: '#b5d8ed', angle: 145},
  {id: 'gold', start: '#fff8dc', end: '#e7ca86', angle: 155},
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
const previewMode = ['localhost', '127.0.0.1'].includes(window.location.hostname) && new URLSearchParams(window.location.search).get('preview') === 'scene';

const SceneSheet: React.FC = () => {
  const [state, setState] = React.useState<SceneSheetState | null>(() => previewMode ? createInitialSceneState('preview', 'ru', 'light') : null);
  const [activeTab, setActiveTab] = React.useState<'sheet' | 'settings'>('sheet');
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved'>('idle');
  const [isUnavailable, setIsUnavailable] = React.useState(false);
  const channel = React.useMemo(() => new BroadcastChannel(SCENE_SHEET_CHANNEL), []);
  const saveTimer = React.useRef<number>();
  const receivedInitialState = React.useRef(false);
  const pendingLocalState = React.useRef<SceneSheetState | null>(null);

  React.useEffect(() => {
    if (previewMode) return () => channel.close();
    const receive = (event: MessageEvent<SceneSheetResponse>) => {
      if (event.data.instanceId !== instanceId) return;
      if (event.data.type === 'error') { setSaveStatus('idle'); return; }
      if (!event.data.state) return;
      if (pendingLocalState.current) {
        const normalized = parseSceneSheetState(pendingLocalState.current);
        if (normalized && JSON.stringify(event.data.state) === JSON.stringify(normalized)) {
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
    const request = () => channel.postMessage({type: 'request-state', instanceId} as SceneSheetRequest);
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
    if (!state) return;
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.style.colorScheme = state.theme;
    document.documentElement.lang = state.locale;
  }, [state?.theme, state?.locale]);

  const update = (recipe: (current: SceneSheetState) => SceneSheetState) => {
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
      saveTimer.current = window.setTimeout(() => channel.postMessage({type: 'save-state', instanceId, state: next} as SceneSheetRequest), 1200);
      return next;
    });
  };

  if (!state) {
    return <main className="character-sheet character-sheet--loading"><span className="character-sheet__sigil scene-sheet__sigil">S</span><strong>{COPY.ru.loading}</strong><p>{isUnavailable ? COPY.ru.unavailable : ''}</p></main>;
  }

  const copy = COPY[state.locale];
  const activeGradientPreset = GRADIENT_PRESETS.find((preset) => preset.start.toLowerCase() === state.backgroundStart.toLowerCase() && preset.end.toLowerCase() === state.backgroundEnd.toLowerCase() && preset.angle === state.gradientAngle);
  const usesDarkGradient = isDarkColor(state.backgroundStart) && isDarkColor(state.backgroundEnd);
  const sheetAccent = mixHex(state.backgroundEnd, usesDarkGradient ? '#ffffff' : '#000000', usesDarkGradient ? .4 : .48);
  const sheetStyle = {
    '--sheet-gradient-start': state.backgroundStart,
    '--sheet-gradient-end': state.backgroundEnd,
    '--sheet-gradient-angle': `${state.gradientAngle}deg`,
    '--sheet-accent': sheetAccent,
    '--sheet-accent-shadow': hexToRgba(sheetAccent, .28),
    '--sheet-accent-contrast': usesDarkGradient ? '#151720' : '#ffffff',
  } as React.CSSProperties;
  if (/^https:\/\//i.test(state.backgroundImageUrl)) {
    sheetStyle.backgroundImage = `linear-gradient(rgba(10,12,18,.34), rgba(10,12,18,.34)), url(${JSON.stringify(state.backgroundImageUrl)})`;
    sheetStyle.backgroundPosition = 'center';
    sheetStyle.backgroundSize = 'cover';
  }
  const replaceAt = (items: string[], index: number, value: string) => items.map((item, itemIndex) => itemIndex === index ? value : item);
  const resizeChecks = (checks: boolean[], size: number) => Array.from({length: Math.max(1, Math.min(24, size))}, (_, index) => checks[index] ?? false);

  return <main className={`character-sheet scene-sheet${usesDarkGradient ? ' character-sheet--dark-gradient' : ''}`} style={sheetStyle}>
    <header className="character-sheet__header">
      <div><span className="character-sheet__eyebrow">{copy.scene}</span><input className="character-sheet__name" aria-label={copy.sceneName} value={state.name} onChange={(event) => update((current) => ({...current, name: event.target.value}))} /></div>
      <div className="character-sheet__controls">
        <span className={`save-indicator save-indicator--${saveStatus}`}>{saveStatus === 'saving' ? copy.saving : saveStatus === 'saved' ? copy.saved : ''}</span>
        <div className="sheet-tabs"><button className={activeTab === 'sheet' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('sheet')}>{copy.sheet}</button><button className={activeTab === 'settings' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('settings')}>{copy.settings}</button></div>
        <div className="language-switch"><button className={state.locale === 'ru' ? 'is-active' : ''} type="button" onClick={() => update((current) => ({...current, locale: 'ru'}))}>RU</button><button className={state.locale === 'en' ? 'is-active' : ''} type="button" onClick={() => update((current) => ({...current, locale: 'en'}))}>EN</button></div>
        <button className="theme-toggle" type="button" aria-label={copy.theme} title={copy.theme} onClick={() => update((current) => ({...current, theme: current.theme === 'light' ? 'dark' : 'light'}))}><span aria-hidden="true">{state.theme === 'light' ? '☾' : '☀'}</span></button>
      </div>
    </header>

    {activeTab === 'sheet' ? <>
      <section className="scene-sheet__intro">
        <label className="character-field character-field--description"><span>{copy.description}</span><textarea rows={8} placeholder={copy.descriptionPlaceholder} value={state.description} onChange={(event) => update((current) => ({...current, description: event.target.value}))} /></label>
        <div className="scene-sheet__brief">
          <label className="character-field"><span>{copy.location}</span><input value={state.location} onChange={(event) => update((current) => ({...current, location: event.target.value}))} /></label>
        </div>
      </section>
      <div className="character-sheet__columns scene-sheet__columns">
        <div className="character-sheet__column">
          <section className="sheet-section"><h2>{copy.aspects}</h2><div className="sheet-stack">{state.aspects.map((aspect, index) => <label className="character-field" key={index}><span>{copy.aspect} {index + 1}</span><span className="removable-field"><input value={aspect} onChange={(event) => update((current) => ({...current, aspects: replaceAt(current.aspects, index, event.target.value)}))} />{index >= 4 && <button type="button" aria-label={copy.remove} onClick={() => update((current) => ({...current, aspects: current.aspects.filter((_, itemIndex) => itemIndex !== index)}))}>×</button>}</span></label>)}</div><button className="sheet-add" type="button" onClick={() => update((current) => ({...current, aspects: [...current.aspects, '']}))}>+ {copy.addAspect}</button></section>
        </div>
        <div className="character-sheet__column">
          <section className="sheet-section"><h2>{copy.progress}</h2><div className="scene-progress-list">{state.progresses.map((progress) => <div className="scene-progress-card" key={progress.id}><div className="scene-progress-card__header"><input aria-label={copy.progressName} placeholder={copy.progressName} value={progress.name} onChange={(event) => update((current) => ({...current, progresses: current.progresses.map((item) => item.id === progress.id ? {...item, name: event.target.value} : item)}))} /><label title={copy.checks}><span>{copy.checks}</span><input type="number" min="1" max="24" value={progress.checks.length} onChange={(event) => update((current) => ({...current, progresses: current.progresses.map((item) => item.id === progress.id ? {...item, checks: resizeChecks(item.checks, Number(event.target.value) || 1)} : item)}))} /></label><button type="button" aria-label={copy.remove} onClick={() => update((current) => ({...current, progresses: current.progresses.filter((item) => item.id !== progress.id)}))}>×</button></div><div className="scene-progress">{progress.checks.map((checked, index) => <label className="stress-box" key={index}><input type="checkbox" checked={checked} aria-label={`${progress.name || copy.progressName} ${index + 1}`} onChange={(event) => update((current) => ({...current, progresses: current.progresses.map((item) => item.id === progress.id ? {...item, checks: item.checks.map((check, itemIndex) => itemIndex === index ? event.target.checked : check)} : item)}))} /><span aria-hidden="true">{checked ? '✓' : index + 1}</span></label>)}</div></div>)}</div><button className="sheet-add" type="button" onClick={() => update((current) => ({...current, progresses: [...current.progresses, {id: crypto.randomUUID(), name: copy.progressName, checks: Array.from({length: 6}, () => false)}]}))}>+ {copy.addProgress}</button></section>
        </div>
      </div>
      <section className="sheet-section scene-sheet__full-width"><h2>{copy.zones}</h2><div className="scene-zone-list">{state.zones.map((zone) => <div className="scene-zone" key={zone.id}><div className="scene-zone__header"><input aria-label={copy.zone} value={zone.name} onChange={(event) => update((current) => ({...current, zones: current.zones.map((item) => item.id === zone.id ? {...item, name: event.target.value} : item)}))} /><button type="button" aria-label={copy.remove} onClick={() => update((current) => ({...current, zones: current.zones.filter((item) => item.id !== zone.id)}))}>×</button></div><div className="scene-zone__aspects">{zone.aspects.map((aspect, index) => <span className="removable-field" key={index}><input aria-label={`${copy.zoneAspect} ${index + 1}`} placeholder={copy.zoneAspect} value={aspect} onChange={(event) => update((current) => ({...current, zones: current.zones.map((item) => item.id === zone.id ? {...item, aspects: replaceAt(item.aspects, index, event.target.value)} : item)}))} />{zone.aspects.length > 1 && <button type="button" aria-label={copy.remove} onClick={() => update((current) => ({...current, zones: current.zones.map((item) => item.id === zone.id ? {...item, aspects: item.aspects.filter((_, itemIndex) => itemIndex !== index)} : item)}))}>×</button>}</span>)}<button className="sheet-add" type="button" onClick={() => update((current) => ({...current, zones: current.zones.map((item) => item.id === zone.id ? {...item, aspects: [...item.aspects, '']} : item)}))}>+ {copy.addAspect}</button></div></div>)}</div><button className="sheet-add" type="button" onClick={() => update((current) => ({...current, zones: [...current.zones, {id: crypto.randomUUID(), name: copy.zone, aspects: ['']}]}))}>+ {copy.addZone}</button></section>
      <section className="sheet-section scene-sheet__notes scene-sheet__full-width"><h2>{copy.notes}</h2><label className="character-field"><textarea rows={12} placeholder={copy.notesPlaceholder} value={state.notes} onChange={(event) => update((current) => ({...current, notes: event.target.value}))} /></label></section>
    </> : <section className="character-settings scene-settings">
      <div className="character-settings__panel">
        <div className="character-settings__heading"><span>{copy.appearance}</span><strong>{copy.settings}</strong></div>
        <fieldset className="gradient-presets"><legend>{copy.gradientPresets}</legend><div className="gradient-presets__grid">{GRADIENT_PRESETS.map((preset, index) => <button className={activeGradientPreset?.id === preset.id ? 'is-active' : ''} type="button" key={preset.id} aria-label={`${copy.gradientOption} ${index + 1}`} onClick={() => update((current) => ({...current, backgroundStart: preset.start, backgroundEnd: preset.end, gradientAngle: preset.angle}))}><span className="gradient-presets__swatch" style={{background: `linear-gradient(${preset.angle}deg, ${preset.start}, ${preset.end})`}} /><small>{index + 1}</small></button>)}</div></fieldset>
        <div className="gradient-settings"><label><span>{copy.gradientStart}</span><input type="color" value={state.backgroundStart} onChange={(event) => update((current) => ({...current, backgroundStart: event.target.value}))} /></label><label><span>{copy.gradientEnd}</span><input type="color" value={state.backgroundEnd} onChange={(event) => update((current) => ({...current, backgroundEnd: event.target.value}))} /></label><label className="gradient-settings__angle"><span>{copy.gradientAngle}</span><input type="range" min="0" max="360" value={state.gradientAngle} onChange={(event) => update((current) => ({...current, gradientAngle: Number(event.target.value)}))} /><output>{state.gradientAngle}°</output></label></div>
        <button className="sheet-add" type="button" onClick={() => update((current) => ({...current, backgroundStart: '#10131d', backgroundEnd: '#29334b', gradientAngle: 145}))}>{copy.resetGradient}</button>
      </div>
      <div className="character-settings__panel"><div className="character-settings__heading"><span>{copy.backgroundImage}</span><strong>{copy.backgroundUrl}</strong></div><label className="photo-url-field"><input value={state.backgroundImageUrl} onChange={(event) => update((current) => ({...current, backgroundImageUrl: event.target.value.trim()}))} placeholder="https://…" /><small>{copy.backgroundHint}</small></label>{state.backgroundImageUrl && <button className="sheet-add" type="button" onClick={() => update((current) => ({...current, backgroundImageUrl: ''}))}>{copy.removeBackground}</button>}</div>
    </section>}
  </main>;
};

const container = document.getElementById('root');
if (!container) throw new Error('Root element was not found');
createRoot(container).render(<SceneSheet />);
