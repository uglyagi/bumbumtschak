import { CONTENT_ORIGIN } from './site-config.js';

export const usesRemoteContent = Boolean(CONTENT_ORIGIN);
export const apiURL = path => usesRemoteContent ? new URL(path, CONTENT_ORIGIN).href : path;
export const adminURL = usesRemoteContent ? new URL('/admin', CONTENT_ORIGIN).href : '/admin';

// Uploaded files belong to the content service. Built-in assets stay relative to the game.
export const contentAssetURL = value => typeof value === 'string' && value.startsWith('/api/media/') ? apiURL(value) : value;
