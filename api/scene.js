const APP_ORIGIN = 'https://miro-fate-dice.vercel.app';

export default function handler(request, response) {
  const instance = typeof request.query.instance === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(request.query.instance)
    ? request.query.instance
    : '';
  const autosize = request.query.autosize === '1' ? '&autosize=1' : '';
  const oembedUrl = `${APP_ORIGIN}/api/scene-oembed?instance=${encodeURIComponent(instance)}${autosize}`;
  const sheetUrl = `${APP_ORIGIN}/scene.html?instance=${encodeURIComponent(instance)}${autosize}`;
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  response.status(200).send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fate Scene Sheet</title><meta name="description" content="Editable Fate scene sheet"><meta property="og:title" content="Fate Scene Sheet"><meta property="og:description" content="Editable Fate scene sheet"><link rel="alternate" type="application/json+oembed" href="${oembedUrl}" title="Fate Scene Sheet"><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;overflow:hidden;background:#10131d}iframe{display:block;position:fixed;inset:0}</style></head><body><iframe src="${sheetUrl}" title="Fate Scene Sheet" scrolling="no"></iframe></body></html>`);
}
