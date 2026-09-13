const params = new URLSearchParams(window.location.search);
const type = params.has('access_key') ? 'access_key' : 'room_id';
const value = params.get(type) ?? '';
const frame = document.getElementById('watch-frame');

if (!(frame instanceof HTMLIFrameElement)) throw new Error('Watch2Gether frame was not found');
if (!/^[a-z0-9_-]+$/i.test(value)) throw new Error('Invalid Watch2Gether room');

frame.src = `https://w2g.tv/embed?${type}=${encodeURIComponent(value)}`;

export {};
