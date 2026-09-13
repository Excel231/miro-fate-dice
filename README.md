## Fate Tools для Miro

Miro-приложение с интерактивными Fate-кубиками, редактируемыми листами персонажей и
встроенным Watch2Gether. Листы персонажей можно добавить на доску в вариантах Fate Core
(навыки, две шкалы стресса) и Fate Accelerated (шесть подходов, единая шкала стресса).
Изменения полей и состояние карточек синхронизируются для участников доски. Интерфейс
поддерживает русский и английский языки, светлую и тёмную темы.

**Production:** https://miro-fate-dice.vercel.app/

**&nbsp;ℹ&nbsp;Note**:

- We recommend a Chromium-based web browser for local development with HTTP. \
  Safari enforces HTTPS; therefore, it doesn't allow localhost through HTTP.
- For more information, visit our [developer documentation](https://developers.miro.com).

### How to start locally

- Run `npm i` to install dependencies.
- Run `npm start` to start developing. \
  Your URL should be similar to this example:
 ```
 http://localhost:3000
 ```
- Paste the URL under **App URL** in your
  [app settings](https://developers.miro.com/docs/build-your-first-hello-world-app#step-3-configure-your-app-in-miro).
- Open a board; you should see your app in the app toolbar or in the **Apps**
  panel.

### How to build the app

- Run `npm run build`. \
  This generates a static output inside [`dist/`](./dist), which you can host on a static hosting
  service.

### Folder structure

<!-- The following tree structure is just an example -->

```
.
├── src
│  ├── assets
│  │  └── style.css
│  ├── app.tsx      // The code for the app lives here
│  └── index.ts    // The code for the app entry point lives here
├── app.html       // The app itself. It's loaded on the board inside the 'appContainer'
└── index.html     // The app entry point. This is what you specify in the 'App URL' box in the Miro app settings
```

### About the app

The **Dice** tab adds an inline card with its own **Roll** button. Its result and
last five rolls update for everyone on the board. The **Character** tab adds editable
Fate Core or Fate Accelerated character sheets. The **Watch2Gether** tab accepts an
existing room link and opens the official embed in the Miro side panel. The same room
can also be added to the board as a shared inline window. New rooms are created on the
official Watch2Gether site.

Built using [`create-miro-app`](https://www.npmjs.com/package/create-miro-app).

This app uses [Vite](https://vitejs.dev/). \
If you want to modify the `vite.config.js` configuration, see the [Vite documentation](https://vitejs.dev/guide/).
