const APP_ORIGIN = 'https://miro-fate-dice.vercel.app';

export default function handler(request, response) {
  const instance = typeof request.query.instance === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(request.query.instance)
    ? request.query.instance
    : '';
  const mode = request.query.mode === 'accelerated' ? 'accelerated' : 'core';
  const autosize = request.query.autosize === '1' ? '&autosize=1' : '';
  const oembedUrl = `${APP_ORIGIN}/api/character-oembed?instance=${encodeURIComponent(instance)}&mode=${mode}${autosize}`;
  const sheetUrl = `${APP_ORIGIN}/character.html?instance=${encodeURIComponent(instance)}${autosize}`;
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  response.status(200).send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fate Character Sheet</title><meta name="description" content="Editable Fate character sheet"><meta property="og:title" content="Fate Character Sheet"><meta property="og:description" content="Editable ${mode === 'core' ? 'Fate Core' : 'Fate Accelerated'} character sheet"><link rel="alternate" type="application/json+oembed" href="${oembedUrl}" title="Fate Character Sheet"><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;overflow:hidden;background:#f5f1e8}iframe{display:block;position:fixed;inset:0}</style></head><body><iframe src="${sheetUrl}" title="Fate Character Sheet" scrolling="no" allow="clipboard-write"></iframe></body></html>`);
}
