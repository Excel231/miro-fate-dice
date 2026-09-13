const APP_ORIGIN = 'https://miro-fate-dice.vercel.app';

export default function handler(request, response) {
  const type = typeof request.query.access_key === 'string' ? 'access_key' : 'room_id';
  const candidate = type === 'access_key' ? request.query.access_key : request.query.room_id;
  const value = typeof candidate === 'string' && /^[a-z0-9_-]+$/i.test(candidate) ? candidate : '';
  const src = `${APP_ORIGIN}/watch.html?${type}=${encodeURIComponent(value)}`;
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Cache-Control', 'public, max-age=300');
  response.status(200).json({
    version: '1.0', type: 'rich', provider_name: 'Fate Tools', provider_url: APP_ORIGIN,
    title: 'Watch2Gether', width: 960, height: 540,
    html: `<iframe src="${src}" width="960" height="540" frameborder="0" scrolling="no" allow="autoplay; fullscreen; microphone; camera" allowfullscreen></iframe>`,
  });
}
