import type {AppCard, ItemsUpdateEvent} from '@mirohq/websdk-types';
import * as React from 'react';
import {createRoot} from 'react-dom/client';

import './assets/style.css';
import {getFateDiceState, rollAndSyncCard, setCardLocale, type FateDiceState, type Locale} from './board-card';
import {DIE_LABELS, formatTotal, getTotal, INITIAL_DICE, rollFourDice} from './dice';
import {applyPreferences, getInitialLocale, getInitialTheme, type Theme} from './preferences';

type ModalData = {appCardId: string};

const COPY = {
  ru: {
    diceLabel: 'Результаты четырёх кубиков',
    history: 'Последние 5 бросков',
    rollNumber: 'Бросок',
    roll: 'Бросить',
    rolling: 'Кубики катятся…',
    loading: 'Загрузка…',
    loadError: 'Не удалось загрузить эту карточку.',
    saveError: 'Не удалось сохранить изменения на доске.',
    readOnly: 'Эта копия карточки доступна только для чтения.',
    theme: 'Переключить тему',
  },
  en: {
    diceLabel: 'Four dice results',
    history: 'Last 5 rolls',
    rollNumber: 'Roll',
    roll: 'Roll',
    rolling: 'Rolling…',
    loading: 'Loading…',
    loadError: 'Could not load this card.',
    saveError: 'Could not save changes to the board.',
    readOnly: 'This copy of the card is read-only.',
    theme: 'Toggle theme',
  },
} as const;

const DiceModal: React.FC = () => {
  const [card, setCard] = React.useState<AppCard | null>(null);
  const [state, setState] = React.useState<FateDiceState | null>(null);
  const [locale, setLocale] = React.useState<Locale>(getInitialLocale);
  const [theme, setTheme] = React.useState<Theme>(getInitialTheme);
  const [animatedDice, setAnimatedDice] = React.useState(INITIAL_DICE);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRolling, setIsRolling] = React.useState(false);
  const [error, setError] = React.useState('');
  const copy = COPY[locale];

  React.useEffect(() => applyPreferences(locale, theme), [locale, theme]);

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await miro.board.ui.getModalData<ModalData>();
        if (!data?.appCardId) throw new Error('MISSING_CARD_ID');
        const item = await miro.board.getById(data.appCardId);
        if (item.type !== 'app_card' || !('owned' in item)) throw new Error('NOT_APP_CARD');
        const appCard = item as AppCard;
        const nextState = await getFateDiceState(appCard);
        if (!nextState) throw new Error('NOT_FATE_DICE_CARD');
        if (!active) return;
        setCard(appCard);
        setState(nextState);
        setLocale(nextState.locale);
        setAnimatedDice(nextState.dice);
      } catch (loadError) {
        console.error(loadError);
        if (active) setError(COPY[getInitialLocale()].loadError);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    if (!card) return;
    const refresh = async ({items}: ItemsUpdateEvent) => {
      if (!items.some((item) => item.id === card.id) || isRolling) return;
      const item = await miro.board.getById(card.id);
      if (item.type !== 'app_card' || !('owned' in item)) return;
      const appCard = item as AppCard;
      const nextState = await getFateDiceState(appCard);
      if (!nextState) return;
      setCard(appCard);
      setState(nextState);
      setLocale(nextState.locale);
      setAnimatedDice(nextState.dice);
    };
    miro.board.ui.on('experimental:items:update', refresh);
    return () => {
      void miro.board.ui.off('experimental:items:update', refresh);
    };
  }, [card, isRolling]);

  const handleLocale = async (nextLocale: Locale) => {
    setLocale(nextLocale);
    if (!card || !card.owned) return;
    try {
      const freshItem = await miro.board.getById(card.id);
      if (freshItem.type !== 'app_card' || !('owned' in freshItem)) return;
      const freshCard = freshItem as AppCard;
      const nextState = await setCardLocale(freshCard, nextLocale);
      setCard(freshCard);
      setState(nextState);
    } catch (localeError) {
      console.error(localeError);
      setError(COPY[nextLocale].saveError);
    }
  };

  const handleRoll = async () => {
    if (!card || isRolling) return;
    setIsRolling(true);
    setError('');
    let framesLeft = 7;
    const animation = window.setInterval(() => {
      setAnimatedDice(rollFourDice());
      framesLeft -= 1;
      if (framesLeft === 0) window.clearInterval(animation);
    }, 70);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 520));
      const freshItem = await miro.board.getById(card.id);
      if (freshItem.type !== 'app_card' || !('owned' in freshItem)) throw new Error('NOT_APP_CARD');
      const freshCard = freshItem as AppCard;
      const nextState = await rollAndSyncCard(freshCard);
      setCard(freshCard);
      setState(nextState);
      setAnimatedDice(nextState.dice);
    } catch (rollError) {
      console.error(rollError);
      setError(rollError instanceof Error && rollError.message === 'CARD_READ_ONLY' ? copy.readOnly : copy.saveError);
    } finally {
      window.clearInterval(animation);
      setIsRolling(false);
    }
  };

  if (isLoading) return <main className="dice-modal dice-modal--centered">{copy.loading}</main>;
  if (!card || !state) return <main className="dice-modal dice-modal--centered error-text">{error}</main>;
  const total = getTotal(state.dice);

  return (
    <main className="dice-modal">
      <div className="app-toolbar">
        <div className="language-switch" aria-label="Language">
          <button className={locale === 'ru' ? 'is-active' : ''} onClick={() => void handleLocale('ru')} type="button">RU</button>
          <button className={locale === 'en' ? 'is-active' : ''} onClick={() => void handleLocale('en')} type="button">EN</button>
        </div>
        <button className="theme-toggle" type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={copy.theme} title={copy.theme}>
          <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
        </button>
      </div>

      <header className="modal-header">
        <h1>{formatTotal(total)}</h1>
      </header>

      <section className="dice-row dice-row--modal" aria-label={copy.diceLabel}>
        {animatedDice.map((die, index) => (
          <div className={`fate-die fate-die--${die === 1 ? 'plus' : die === -1 ? 'minus' : 'zero'}${isRolling ? ' fate-die--rolling' : ''}`} key={index}>{DIE_LABELS[die]}</div>
        ))}
      </section>

      <section className="history" aria-labelledby="history-title">
        <div className="history__heading"><h2 id="history-title">{copy.history}</h2></div>
        <ol className="history__list">
          {state.history.map((roll, index) => (
            <li className={index === 0 ? 'is-current' : ''} key={`${roll.sequence}-${roll.rolledAt}`}>
              <span className="history__number">#{roll.sequence}</span>
              <span className="history__dice">{roll.dice.map((die) => DIE_LABELS[die]).join('  ')}</span>
              <strong>{formatTotal(getTotal(roll.dice))}</strong>
              <time dateTime={roll.rolledAt}>{new Intl.DateTimeFormat(locale, {hour: '2-digit', minute: '2-digit'}).format(new Date(roll.rolledAt))}</time>
            </li>
          ))}
        </ol>
      </section>

      {error && <p className="app-message app-message--error" role="alert">{error}</p>}
      <button className="roll-button roll-button--hero" type="button" onClick={handleRoll} disabled={isRolling || !card.owned}>
        <span aria-hidden="true">✦</span>{isRolling ? copy.rolling : copy.roll}
      </button>
    </main>
  );
};

const container = document.getElementById('root');
if (!container) throw new Error('Root element was not found');
createRoot(container).render(<DiceModal />);
