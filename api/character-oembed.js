const APP_ORIGIN = 'https://miro-fate-dice.vercel.app';

export default function handler(request, response) {
  const instance = typeof request.query.instance === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(request.query.instance)
    ? request.query.instance
    : '';
  const mode = request.query.mode === 'accelerated' ? 'accelerated' : 'core';
  const size = {width: 1280, height: 1010};
  const src = `${APP_ORIGIN}/character.html?instance=${encodeURIComponent(instance)}`;
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Cache-Control', 'public, max-age=300');
  response.status(200).json({
    version: '1.0', type: 'rich', provider_name: 'Fate Tools', provider_url: APP_ORIGIN,
    title: mode === 'core' ? 'Fate Core Character Sheet' : 'Fate Accelerated Character Sheet',
    width: size.width, height: size.height,
    html: `<iframe src="${src}" width="${size.width}" height="${size.height}" frameborder="0" scrolling="no" allow="clipboard-write"></iframe>`,
  });
}
