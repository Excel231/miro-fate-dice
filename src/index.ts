export async function init() {
  // The same document is the public landing page outside of Miro.
  if (window.self === window.top) return;

  miro.board.ui.on('icon:click', async () => {
    await miro.board.ui.openPanel({url: 'app.html'});
  });
}

void init();
