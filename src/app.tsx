import * as React from 'react';
import {createRoot} from 'react-dom/client';

import './assets/style.css';

type DieValue = -1 | 0 | 1;

const INITIAL_DICE: DieValue[] = [0, 0, 0, 0];
const DIE_LABELS: Record<DieValue, string> = {[-1]: '−', 0: '0', 1: '+'};

function rollDie(): DieValue {
  const values: DieValue[] = [-1, 0, 1];
  const randomValue = new Uint32Array(1);
  crypto.getRandomValues(randomValue);
  return values[randomValue[0] % values.length];
}

function rollFourDice(): DieValue[] {
  return Array.from({length: 4}, rollDie);
}

const App: React.FC = () => {
  const [dice, setDice] = React.useState<DieValue[]>(INITIAL_DICE);
  const [hasRolled, setHasRolled] = React.useState(false);
  const [isRolling, setIsRolling] = React.useState(false);

  const total = dice.reduce<number>((sum, die) => sum + die, 0);

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

  const formattedTotal = total > 0 ? `+${total}` : String(total);

  return (
    <main className="dice-app">
      <header className="app-header">
        <div className="eyebrow">Fate Core</div>
        <h1>Бросок кубов</h1>
        <p>Бросьте четыре Fudge-кубика и получите результат от −4 до +4.</p>
      </header>

      <section className="dice-row" aria-label="Результаты четырёх кубиков">
        {dice.map((die, index) => (
          <div
            className={`fate-die fate-die--${die === 1 ? 'plus' : die === -1 ? 'minus' : 'zero'}${isRolling ? ' fate-die--rolling' : ''}`}
            key={index}
            aria-label={`Кубик ${index + 1}: ${DIE_LABELS[die]}`}
          >
            {DIE_LABELS[die]}
          </div>
        ))}
      </section>

      <section className="result" aria-live="polite" aria-atomic="true">
        <span className="result__label">Итог</span>
        <strong className="result__value">{hasRolled ? formattedTotal : '—'}</strong>
      </section>

      <button className="roll-button" type="button" onClick={handleRoll} disabled={isRolling}>
        <span aria-hidden="true">✦</span>
        {isRolling ? 'Кубики катятся…' : hasRolled ? 'Бросить ещё раз' : 'Бросить кубики'}
      </button>
    </main>
  );
};

const container = document.getElementById('root');
if (!container) throw new Error('Root element was not found');

createRoot(container).render(<App />);
