import { google } from 'googleapis';
import { config } from '../utils/config.js';
import { db } from '../db/database.js';

function getSetting(key, fallback = '') {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row?.value || fallback;
  } catch (e) {
    return fallback;
  }
}

export function getOAuthClient(tokens = null) {
  const clientId = getSetting('google_client_id', config.googleClientId);
  const clientSecret = getSetting('google_client_secret', config.googleClientSecret);
  const redirectUri = getSetting('google_redirect_uri', config.googleRedirectUri);

  if (!clientId || !clientSecret) {
    const error = new Error('Google Client ID dan Client Secret belum dikonfigurasi. Silakan isi secara manual di halaman Pengaturan.');
    error.status = 400;
    throw error;
  }
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  if (tokens) client.setCredentials(tokens);
  return client;
}

export function getYouTubeScopes() {
  return [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
  ];
}

export function makeAuthUrl(state = 'vaimoz') {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: getYouTubeScopes(),
    state,
  });
}

export async function exchangeCode(code) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  const youtube = google.youtube({ version: 'v3', auth: client });
  const response = await youtube.channels.list({ part: ['snippet'], mine: true });
  const channel = response.data.items?.[0];
  return { tokens, channel };
}

export function youtubeWithTokens(tokens) {
  const client = getOAuthClient(tokens);
  return google.youtube({ version: 'v3', auth: client });
}

export async function listPlaylists(tokens) {
  const youtube = youtubeWithTokens(tokens);
  const response = await youtube.playlists.list({ part: ['snippet', 'status'], mine: true, maxResults: 50 });
  return response.data.items || [];
}

export async function createPlaylist(tokens, { title, description = '', privacyStatus = 'private' }) {
  const youtube = youtubeWithTokens(tokens);
  const response = await youtube.playlists.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: { title, description },
      status: { privacyStatus },
    },
  });
  return response.data;
}

export async function createBroadcastAndStream(tokens, payload) {
  const youtube = youtubeWithTokens(tokens);
  const startTime = payload.scheduledStartTime || new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const privacyStatus = payload.privacyStatus || 'private';

  const broadcast = await youtube.liveBroadcasts.insert({
    part: ['snippet', 'status', 'contentDetails'],
    requestBody: {
      snippet: {
        title: payload.title || 'Vaimoz LivePilot Broadcast',
        description: payload.description || '',
        scheduledStartTime: startTime,
        categoryId: payload.categoryId || '10',
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false,
      },
      contentDetails: {
        enableAutoStart: true,
        enableAutoStop: true,
        recordFromStart: true,
      },
    },
  });

  const stream = await youtube.liveStreams.insert({
    part: ['snippet', 'cdn'],
    requestBody: {
      snippet: { title: `${payload.title || 'Vaimoz'} Stream` },
      cdn: {
        frameRate: payload.frameRate || '30fps',
        ingestionType: 'rtmp',
        resolution: payload.resolution || '1080p',
      },
    },
  });

  await youtube.liveBroadcasts.bind({
    part: ['id', 'snippet'],
    id: broadcast.data.id,
    streamId: stream.data.id,
  });

  return { broadcast: broadcast.data, stream: stream.data };
}

export async function getChannelAnalytics(tokens, channelId) {
  const client = getOAuthClient(tokens);
  
  // 1. YouTube Data API v3 (Subscribers & Total Views)
  const youtube = google.youtube({ version: 'v3', auth: client });
  const dataRes = await youtube.channels.list({ part: ['statistics'], mine: true });
  const stats = dataRes.data.items?.[0]?.statistics || {};
  
  const result = {
    subscribers: Number(stats.subscriberCount || 0),
    totalViews: Number(stats.viewCount || 0),
    estimatedRevenue: 0,
    estimatedMinutesWatched: 0,
  };

  // 2. YouTube Analytics API v2 (Pendapatan & Jam Tayang 28 hari terakhir)
  try {
    const analytics = google.youtubeAnalytics({ version: 'v2', auth: client });
    
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const reportRes = await analytics.reports.query({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'estimatedRevenue,estimatedMinutesWatched',
    });
    
    const rows = reportRes.data.rows || [];
    if (rows.length > 0 && rows[0].length >= 2) {
      result.estimatedRevenue = Number(rows[0][0] || 0);
      result.estimatedMinutesWatched = Number(rows[0][1] || 0);
    }
  } catch (error) {
    console.warn(`[YouTube Analytics] Gagal mengambil data untuk ${channelId}. Mungkin channel belum dimonetisasi atau butuh re-otorisasi:`, error.message);
  }

  return result;
}
