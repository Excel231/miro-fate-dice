const APP_ORIGIN = 'https://miro-fate-dice.vercel.app';

export default function handler(request, response) {
  const instance = typeof request.query.instance === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(request.query.instance)
    ? request.query.instance
    : '';
  const src = `${APP_ORIGIN}/embed.html?instance=${encodeURIComponent(instance)}`;
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Cache-Control', 'public, max-age=300');
  response.status(200).json({
    version: '1.0',
    type: 'rich',
    provider_name: 'Fate Dice',
    provider_url: APP_ORIGIN,
    title: 'Fate Dice',
    width: 520,
    height: 620,
    html: `<iframe src="${src}" width="520" height="620" frameborder="0" scrolling="no" allow="clipboard-write"></iframe>`,
  });
}
