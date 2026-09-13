const APP_ORIGIN = 'https://miro-fate-dice.vercel.app';

const getRoom = (query) => {
  const type = typeof query.access_key === 'string' ? 'access_key' : 'room_id';
  const value = type === 'access_key' ? query.access_key : query.room_id;
  return typeof value === 'string' && /^[a-z0-9_-]+$/i.test(value) ? {type, value} : {type: 'room_id', value: ''};
};

export default function handler(request, response) {
  const room = getRoom(request.query);
  const roomQuery = `${room.type}=${encodeURIComponent(room.value)}`;
  const oembedUrl = `${APP_ORIGIN}/api/watch-oembed?${roomQuery}`;
  const watchUrl = `${APP_ORIGIN}/watch.html?${roomQuery}`;
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  response.status(200).send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Watch2Gether</title><meta name="description" content="Shared Watch2Gether room"><meta property="og:title" content="Watch2Gether"><meta property="og:description" content="Shared Watch2Gether room"><link rel="alternate" type="application/json+oembed" href="${oembedUrl}" title="Watch2Gether"><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;overflow:hidden;background:#111}iframe{display:block;position:fixed;inset:0}</style></head><body><iframe src="${watchUrl}" title="Watch2Gether shared room" scrolling="no" allow="autoplay; fullscreen; microphone; camera" allowfullscreen></iframe></body></html>`);
}
