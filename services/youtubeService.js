import { google } from 'googleapis';
import { config } from '../utils/config.js';

export function getOAuthClient(tokens = null) {
  if (!config.googleClientId || !config.googleClientSecret) {
    const error = new Error('GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum diisi di .env.');
    error.status = 400;
    throw error;
  }
  const client = new google.auth.OAuth2(config.googleClientId, config.googleClientSecret, config.googleRedirectUri);
  if (tokens) client.setCredentials(tokens);
  return client;
}

export function getYouTubeScopes() {
  return [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube.upload',
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
