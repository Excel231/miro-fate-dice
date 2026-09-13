const APP_ORIGIN = 'https://miro-fate-dice.vercel.app';

export default function handler(request, response) {
  const instance = typeof request.query.instance === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(request.query.instance)
    ? request.query.instance
    : '';
  const oembedUrl = `${APP_ORIGIN}/api/oembed?instance=${encodeURIComponent(instance)}`;
  const cardUrl = `${APP_ORIGIN}/embed.html?instance=${encodeURIComponent(instance)}`;
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  response.status(200).send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fate Dice</title><meta name="description" content="Interactive shared Fate dice roller"><meta property="og:title" content="Fate Dice"><meta property="og:description" content="Roll four Fate dice and share the last five results"><link rel="alternate" type="application/json+oembed" href="${oembedUrl}" title="Fate Dice"><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;overflow:hidden;background:#f7f5fb}iframe{display:block;position:fixed;inset:0}</style></head><body><iframe src="${cardUrl}" title="Fate Dice" scrolling="no" allow="clipboard-write"></iframe></body></html>`);
}
