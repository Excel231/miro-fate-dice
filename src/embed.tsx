import * as React from 'react';
import {createRoot} from 'react-dom/client';

import './assets/style.css';
import {FATE_DICE_CHANNEL, type EmbedRequest, type EmbedResponse, type FateDiceEmbedState} from './embed-card';
import {DIE_LABELS, formatTotal, getTotal, INITIAL_DICE, rollFourDice} from './dice';

const COPY = {
  ru: {history: 'История', roll: 'Бросить', rolling: 'Бросаем…', loading: 'Подключение…', unavailable: 'Откройте Fate Tools в Apps.'},
  en: {history: 'History', roll: 'Roll', rolling: 'Rolling…', loading: 'Connecting…', unavailable: 'Open Fate Tools from Apps.'},
} as const;

const instanceId = new URLSearchParams(window.location.search).get('instance') ?? '';

const InlineDiceCard: React.FC = () => {
  const [state, setState] = React.useState<FateDiceEmbedState | null>(null);
  const [animatedDice, setAnimatedDice] = React.useState(INITIAL_DICE);
  const [isRolling, setIsRolling] = React.useState(false);
  const [isUnavailable, setIsUnavailable] = React.useState(false);
  const channel = React.useMemo(() => new BroadcastChannel(FATE_DICE_CHANNEL), []);

  React.useEffect(() => {
    const receive = (event: MessageEvent<EmbedResponse>) => {
      if (event.data.instanceId !== instanceId) return;
      if (event.data.type === 'state' && event.data.state) {
        setState(event.data.state);
        setAnimatedDice(event.data.state.dice);
        setIsRolling(false);
        setIsUnavailable(false);
      }
    };
    channel.addEventListener('message', receive);
    const request = () => channel.postMessage({type: 'request-state', instanceId} as EmbedRequest);
    request();
    const retry = window.setInterval(request, 1500);
    const unavailable = window.setTimeout(() => setIsUnavailable(true), 4500);
    return () => {
      window.clearInterval(retry);
      window.clearTimeout(unavailable);
      channel.removeEventListener('message', receive);
      channel.close();
    };
  }, [channel]);

  React.useEffect(() => {
    const theme = state?.theme ?? 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    if (state) document.documentElement.lang = state.locale;
  }, [state]);

  const post = (request: EmbedRequest) => channel.postMessage(request);
  const handleRoll = () => {
    if (isRolling || !state) return;
    setIsRolling(true);
    let frames = 0;
    const animation = window.setInterval(() => {
      setAnimatedDice(rollFourDice());
      frames += 1;
      if (frames === 12) window.clearInterval(animation);
    }, 80);
    post({type: 'roll', instanceId});
    window.setTimeout(() => window.clearInterval(animation), 1200);
  };

  const locale = state?.locale ?? 'en';
  const copy = COPY[locale];
  if (!state) return <main className="inline-card inline-card--loading"><span className="inline-card__logo">±</span><strong>Fate Dice</strong><p>{isUnavailable ? copy.unavailable : copy.loading}</p></main>;

  return (
    <main className="inline-card">
      <header className="inline-card__top">
        <h1>Fate Dice</h1>
        <div className="inline-card__controls">
          <div className="language-switch"><button className={locale === 'ru' ? 'is-active' : ''} onClick={() => post({type: 'set-locale', instanceId, locale: 'ru'})} type="button">RU</button><button className={locale === 'en' ? 'is-active' : ''} onClick={() => post({type: 'set-locale', instanceId, locale: 'en'})} type="button">EN</button></div>
          <button className="theme-toggle" type="button" onClick={() => post({type: 'set-theme', instanceId, theme: state.theme === 'light' ? 'dark' : 'light'})}><span aria-hidden="true">{state.theme === 'light' ? '☾' : '☀'}</span></button>
        </div>
      </header>

      <section className="inline-card__result"><strong>{formatTotal(getTotal(state.dice))}</strong><div className="dice-row">{animatedDice.map((die, index) => <span className={`fate-die fate-die--${die === 1 ? 'plus' : die === -1 ? 'minus' : 'zero'}${isRolling ? ' fate-die--rolling' : ''}`} key={index}>{DIE_LABELS[die]}</span>)}</div></section>

      <button className="roll-button roll-button--hero" type="button" onClick={handleRoll} disabled={isRolling}><span aria-hidden="true">✦</span>{isRolling ? copy.rolling : copy.roll}</button>

      <section className="history inline-card__history"><div className="history__heading"><h2>{copy.history}</h2></div><ol className="history__list">{state.history.map((roll, index) => <li className={index === 0 ? 'is-current' : ''} key={`${roll.sequence}-${roll.rolledAt}`}><span className="history__number">#{roll.sequence}</span><span className="history__dice">{roll.dice.map((die) => DIE_LABELS[die]).join('  ')}</span><strong>{formatTotal(getTotal(roll.dice))}</strong><time>{new Intl.DateTimeFormat(locale, {hour: '2-digit', minute: '2-digit'}).format(new Date(roll.rolledAt))}</time></li>)}</ol></section>
    </main>
  );
};

const container = document.getElementById('root');
if (!container) throw new Error('Root element was not found');
createRoot(container).render(<InlineDiceCard />);
