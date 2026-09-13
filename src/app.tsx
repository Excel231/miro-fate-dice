import * as React from 'react';
import {createRoot} from 'react-dom/client';

import './assets/style.css';
import type {Locale} from './board-card';
import {createCharacterSheetEmbed, type CharacterMode} from './character-sheet';
import {DIE_LABELS, formatTotal, getTotal, INITIAL_DICE, rollFourDice, type DieValue} from './dice';
import {createFateDiceEmbed} from './embed-card';
import {applyPreferences, getInitialLocale, getInitialTheme, type Theme} from './preferences';
import {createSceneSheetEmbed} from './scene-sheet';
import {createWatch2GetherEmbed, parseWatchRoom, restoreWatchRoom, serializeWatchRoom, type WatchRoom} from './watch-embed';

const COPY = {
  ru: {
    title: 'Fate Dice',
    add: 'Добавить броски на доску',
    adding: 'Добавляю…',
    added: 'Кубики добавлены. Их результат видят все на доске.',
    addError: 'Не удалось добавить карточку. Проверьте права приложения.',
    diceLabel: 'Результаты четырёх кубиков',
    die: 'Кубик',
    result: 'Итог',
    roll: 'Бросить',
    rollAgain: 'Бросить ещё раз',
    rolling: 'Кубики катятся…',
    theme: 'Переключить тему',
    roomPlaceholder: 'Ссылка на комнату',
    joinRoom: 'Войти',
    createRoom: 'Создать комнату',
    changeRoom: 'Сменить',
    addWatch: 'Добавить окно на доску',
    watchAdded: 'Общее окно Watch2Gether добавлено на доску.',
    invalidRoom: 'Вставьте ссылку Watch2Gether.',
    roomHint: 'Копируйте ссылку через «Пригласить»: w2g.tv/?r=…',
    sheets: 'Листы',
    sheetsTitle: 'Листы Fate',
    sheetsHint: 'Выберите лист. Все поля можно редактировать прямо на доске.',
    characterTitle: 'Лист персонажа',
    characterHint: 'Выберите систему. Все поля листа можно редактировать прямо на доске.',
    coreDescription: 'Навыки, физический и ментальный стресс',
    acceleratedDescription: 'Шесть подходов, физический и ментальный стресс',
    addSheet: 'Добавить лист на доску',
    sheetAdded: 'Лист персонажа добавлен на доску.',
    sceneTitle: 'Лист сцены',
    sceneDescription: 'Аспекты, зоны и настраиваемые прогрессы сцены',
    sceneAdded: 'Лист сцены добавлен на доску.',
  },
  en: {
    title: 'Fate Dice',
    add: 'Add dice to board',
    adding: 'Adding…',
    added: 'Dice added. Everyone on the board can see the result.',
    addError: 'Could not add the card. Check the app’s board permissions.',
    diceLabel: 'Four dice results',
    die: 'Die',
    result: 'Result',
    roll: 'Roll',
    rollAgain: 'Roll again',
    rolling: 'Rolling…',
    theme: 'Toggle theme',
    roomPlaceholder: 'Room link',
    joinRoom: 'Join',
    createRoom: 'Create room',
    changeRoom: 'Change',
    addWatch: 'Add window to board',
    watchAdded: 'Shared Watch2Gether window added to the board.',
    invalidRoom: 'Paste a Watch2Gether room link.',
    roomHint: 'Copy the link via Invite: w2g.tv/?r=…',
    sheets: 'Sheets',
    sheetsTitle: 'Fate sheets',
    sheetsHint: 'Choose a sheet. Every field can be edited directly on the board.',
    characterTitle: 'Character sheet',
    characterHint: 'Choose a system. Every field can be edited directly on the board.',
    coreDescription: 'Skills, physical and mental stress',
    acceleratedDescription: 'Six approaches, physical and mental stress',
    addSheet: 'Add sheet to board',
    sheetAdded: 'Character sheet added to the board.',
    sceneTitle: 'Scene sheet',
    sceneDescription: 'Aspects, zones and configurable scene progress tracks',
    sceneAdded: 'Scene sheet added to the board.',
  },
} as const;

const WATCH_ROOM_KEY = 'fate-tools-watch-room';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'dice' | 'sheets' | 'watch'>('dice');
  const [sheetType, setSheetType] = React.useState<CharacterMode | 'scene'>('core');
  const [locale, setLocale] = React.useState<Locale>(getInitialLocale);
  const [theme, setTheme] = React.useState<Theme>(getInitialTheme);
  const [dice, setDice] = React.useState<DieValue[]>(INITIAL_DICE);
  const [hasRolled, setHasRolled] = React.useState(false);
  const [isRolling, setIsRolling] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [watchRoom, setWatchRoom] = React.useState<WatchRoom | null>(() => restoreWatchRoom(localStorage.getItem(WATCH_ROOM_KEY)));
  const [watchInput, setWatchInput] = React.useState('');
  const [watchError, setWatchError] = React.useState('');
  const copy = COPY[locale];
  const total = getTotal(dice);

  React.useEffect(() => applyPreferences(locale, theme), [locale, theme]);

  const handleRoll = () => {
    if (isRolling) return;
    setIsRolling(true);
    setHasRolled(true);
    let framesLeft = 6;
    const animation = window.setInterval(() => {
      setDice(rollFourDice());
      framesLeft -= 1;
      if (framesLeft === 0) {
        window.clearInterval(animation);
        setIsRolling(false);
      }
    }, 70);
  };

  const handleAddToBoard = async () => {
    if (isAdding) return;
    setIsAdding(true);
    setMessage('');
    try {
      const card = await createFateDiceEmbed(locale, theme);
      await miro.board.viewport.zoomTo(card);
      await miro.board.select({id: card.id});
      setMessage(copy.added);
    } catch (error) {
      console.error(error);
      setMessage(copy.addError);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddSheet = async () => {
    if (isAdding) return;
    setIsAdding(true);
    setMessage('');
    try {
      const sheet = sheetType === 'scene'
        ? await createSceneSheetEmbed(locale, theme)
        : await createCharacterSheetEmbed(sheetType, locale, theme);
      await miro.board.viewport.zoomTo(sheet);
      await miro.board.select({id: sheet.id});
      setMessage(sheetType === 'scene' ? copy.sceneAdded : copy.sheetAdded);
    } catch (error) {
      console.error(error);
      setMessage(copy.addError);
    } finally {
      setIsAdding(false);
    }
  };

  const handleWatchRoom = (event: React.FormEvent) => {
    event.preventDefault();
    const room = parseWatchRoom(watchInput);
    if (!room) {
      setWatchError(copy.invalidRoom);
      return;
    }
    localStorage.setItem(WATCH_ROOM_KEY, serializeWatchRoom(room));
    setWatchRoom(room);
    setWatchInput('');
    setWatchError('');
  };

  const addWatchToBoard = async (room: WatchRoom) => {
    if (isAdding) return;
    setIsAdding(true);
    setMessage('');
    try {
      const embed = await createWatch2GetherEmbed(room);
      await miro.board.viewport.zoomTo(embed);
      await miro.board.select({id: embed.id});
      setMessage(copy.watchAdded);
    } catch (error) {
      console.error(error);
      setMessage(copy.addError);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddWatchInputToBoard = async () => {
    const room = parseWatchRoom(watchInput);
    if (!room) {
      setWatchError(copy.invalidRoom);
      return;
    }
    localStorage.setItem(WATCH_ROOM_KEY, serializeWatchRoom(room));
    setWatchRoom(room);
    setWatchInput('');
    setWatchError('');
    await addWatchToBoard(room);
  };

  const handleChangeRoom = () => {
    localStorage.removeItem(WATCH_ROOM_KEY);
    setWatchRoom(null);
    setWatchInput('');
    setWatchError('');
    setMessage('');
  };

  return (
    <main className={`dice-app${activeTab === 'watch' ? ' dice-app--watch' : ''}`}>
      <nav className="panel-tabs" aria-label="Fate Tools">
        <button className={activeTab === 'dice' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('dice')}>Dice</button>
        <button className={activeTab === 'sheets' ? 'is-active' : ''} type="button" onClick={() => { setActiveTab('sheets'); setMessage(''); }}>{copy.sheets}</button>
        <button className={activeTab === 'watch' ? 'is-active' : ''} type="button" onClick={() => { setActiveTab('watch'); setMessage(''); }}>Watch2Gether</button>
      </nav>

      <section className={`watch-panel${activeTab !== 'watch' ? ' tool-view--hidden' : ''}`} aria-label="Watch2Gether" aria-hidden={activeTab !== 'watch'}>
          {watchRoom ? <>
            <div className="watch-panel__bar"><strong>Watch2Gether</strong><button type="button" onClick={handleChangeRoom}>{copy.changeRoom}</button></div>
            <iframe src={`https://w2g.tv/embed?${serializeWatchRoom(watchRoom)}`} title="Watch2Gether" allow="autoplay; fullscreen; microphone; camera" />
            <div className="watch-panel__actions">
              <button className="add-button" type="button" onClick={() => void addWatchToBoard(watchRoom)} disabled={isAdding}><span aria-hidden="true">+</span>{isAdding ? copy.adding : copy.addWatch}</button>
              {message && <p className="app-message" role="status">{message}</p>}
            </div>
          </> : <form className="watch-panel__setup" onSubmit={handleWatchRoom}>
            <strong>Watch2Gether</strong>
            <p className="watch-panel__hint"><span aria-hidden="true">⚠</span>{copy.roomHint}</p>
            <input value={watchInput} onChange={(event) => setWatchInput(event.target.value)} placeholder={copy.roomPlaceholder} aria-label={copy.roomPlaceholder} />
            {watchError && <span className="watch-panel__error" role="alert">{watchError}</span>}
            <button className="roll-button" type="submit">{copy.joinRoom}</button>
            <button className="add-button" type="button" onClick={() => void handleAddWatchInputToBoard()} disabled={isAdding}><span aria-hidden="true">+</span>{isAdding ? copy.adding : copy.addWatch}</button>
            <a href="https://w2g.tv/" target="_blank" rel="noreferrer">{copy.createRoom}</a>
          </form>}
      </section>

      <section className={`character-panel${activeTab !== 'sheets' ? ' tool-view--hidden' : ''}`} aria-hidden={activeTab !== 'sheets'}>
        <div className="app-toolbar">
          <div className="language-switch" aria-label="Language"><button className={locale === 'ru' ? 'is-active' : ''} onClick={() => setLocale('ru')} type="button">RU</button><button className={locale === 'en' ? 'is-active' : ''} onClick={() => setLocale('en')} type="button">EN</button></div>
          <button className="theme-toggle" type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={copy.theme} title={copy.theme}><span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span></button>
        </div>
        <header className="app-header"><h1>{copy.sheetsTitle}</h1><p>{copy.sheetsHint}</p></header>
        <div className="character-mode-picker">
          <button className={sheetType === 'core' ? 'is-active' : ''} type="button" onClick={() => setSheetType('core')}><span className="character-mode-picker__mark">C</span><span><strong>Fate Core</strong><small>{copy.coreDescription}</small></span><span className="character-mode-picker__check" aria-hidden="true">✓</span></button>
          <button className={sheetType === 'accelerated' ? 'is-active' : ''} type="button" onClick={() => setSheetType('accelerated')}><span className="character-mode-picker__mark">A</span><span><strong>Fate Accelerated</strong><small>{copy.acceleratedDescription}</small></span><span className="character-mode-picker__check" aria-hidden="true">✓</span></button>
          <button className={sheetType === 'scene' ? 'is-active' : ''} type="button" onClick={() => setSheetType('scene')}><span className="character-mode-picker__mark character-mode-picker__mark--scene">S</span><span><strong>{copy.sceneTitle}</strong><small>{copy.sceneDescription}</small></span><span className="character-mode-picker__check" aria-hidden="true">✓</span></button>
        </div>
        <button className="add-button" type="button" onClick={handleAddSheet} disabled={isAdding}><span aria-hidden="true">+</span>{isAdding ? copy.adding : copy.addSheet}</button>
        {message && <p className="app-message" role="status">{message}</p>}
      </section>

      <section className={`dice-tool${activeTab !== 'dice' ? ' tool-view--hidden' : ''}`} aria-hidden={activeTab !== 'dice'}>
      <div className="app-toolbar app-toolbar--compact">
        <div className="language-switch" aria-label="Language">
          <button className={locale === 'ru' ? 'is-active' : ''} onClick={() => setLocale('ru')} type="button">RU</button>
          <button className={locale === 'en' ? 'is-active' : ''} onClick={() => setLocale('en')} type="button">EN</button>
        </div>
        <button className="theme-toggle" type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={copy.theme} title={copy.theme}>
          <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
        </button>
      </div>

      <header className="app-header">
        <h1>{copy.title}</h1>
      </header>

      <button className="add-button" type="button" onClick={handleAddToBoard} disabled={isAdding}>
        <span aria-hidden="true">+</span>{isAdding ? copy.adding : copy.add}
      </button>
      {message && <p className="app-message" role="status">{message}</p>}
      <section className="dice-row" aria-label={copy.diceLabel}>
        {dice.map((die, index) => (
          <div className={`fate-die fate-die--${die === 1 ? 'plus' : die === -1 ? 'minus' : 'zero'}${isRolling ? ' fate-die--rolling' : ''}`} key={index} aria-label={`${copy.die} ${index + 1}: ${DIE_LABELS[die]}`}>
            {DIE_LABELS[die]}
          </div>
        ))}
      </section>
      <section className="result" aria-live="polite" aria-atomic="true">
        <span className="result__label">{copy.result}</span>
        <strong className="result__value">{hasRolled ? formatTotal(total) : '—'}</strong>
      </section>
      <button className="roll-button" type="button" onClick={handleRoll} disabled={isRolling}>
        <span aria-hidden="true">✦</span>{isRolling ? copy.rolling : hasRolled ? copy.rollAgain : copy.roll}
      </button>
      </section>
    </main>
  );
};

const container = document.getElementById('root');
if (!container) throw new Error('Root element was not found');
createRoot(container).render(<App />);
