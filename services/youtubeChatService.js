/**
 * YouTube Live Chat Service
 * 
 * Service untuk mengelola YouTube live chat:
 * - Get live chat ID from broadcast
 * - Send messages to live chat
 * - Get chat messages
 * - Automated chatbot with scheduled messages
 */

import { db, logEvent } from '../db/database.js';
import { youtubeWithTokens } from './youtubeService.js';

/**
 * Get tokens from youtube_channels table
 */
function getChannelTokens(channelId) {
  const row = db.prepare('SELECT * FROM youtube_channels WHERE id = ?').get(Number(channelId));
  if (!row) throw new Error('YouTube channel tidak ditemukan.');
  if (!row.access_token && !row.refresh_token) {
    throw new Error('Channel belum punya OAuth token.');
  }
  return {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: row.expires_at,
  };
}

/**
 * Get live chat ID from broadcast
 * Returns: liveChatId or null
 */
export async function getLiveChatId(channelId, broadcastId) {
  const tokens = getChannelTokens(channelId);
  const youtube = youtubeWithTokens(tokens);

  try {
    const response = await youtube.liveBroadcasts.list({
      part: ['snippet', 'contentDetails'],
      id: [broadcastId],
    });

    const broadcast = response.data.items?.[0];
    const liveChatId = broadcast?.snippet?.liveChatId;

    if (!liveChatId) {
      logEvent('WARN', 'YouTube Chat', `No live chat ID found for broadcast ${broadcastId}`);
      return null;
    }

    logEvent('INFO', 'YouTube Chat', `Live chat ID: ${liveChatId}`);
    return liveChatId;
  } catch (error) {
    logEvent('ERROR', 'YouTube Chat', `Failed to get live chat ID: ${error.message}`);
    return null;
  }
}

/**
 * Send message to YouTube live chat
 */
export async function sendChatMessage(channelId, liveChatId, message) {
  const tokens = getChannelTokens(channelId);
  const youtube = youtubeWithTokens(tokens);

  try {
    const response = await youtube.liveChatMessages.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          liveChatId,
          type: 'textMessageEvent',
          textMessageDetails: {
            messageText: message,
          },
        },
      },
    });

    logEvent('INFO', 'YouTube Chat', `Message sent: ${message.substring(0, 50)}...`);
    return response.data;
  } catch (error) {
    logEvent('ERROR', 'YouTube Chat', `Failed to send message: ${error.message}`);
    throw error;
  }
}

/**
 * Get recent chat messages
 */
export async function getChatMessages(channelId, liveChatId, maxResults = 200) {
  const tokens = getChannelTokens(channelId);
  const youtube = youtubeWithTokens(tokens);

  try {
    const response = await youtube.liveChatMessages.list({
      liveChatId,
      part: ['snippet', 'authorDetails'],
      maxResults,
    });

    return response.data.items || [];
  } catch (error) {
    logEvent('ERROR', 'YouTube Chat', `Failed to get messages: ${error.message}`);
    return [];
  }
}

/**
 * Delete chat message (moderator only)
 */
export async function deleteChatMessage(channelId, messageId) {
  const tokens = getChannelTokens(channelId);
  const youtube = youtubeWithTokens(tokens);

  try {
    await youtube.liveChatMessages.delete({
      id: messageId,
    });

    logEvent('INFO', 'YouTube Chat', `Message deleted: ${messageId}`);
    return true;
  } catch (error) {
    logEvent('ERROR', 'YouTube Chat', `Failed to delete message: ${error.message}`);
    return false;
  }
}

/**
 * Ban user from chat
 */
export async function banChatUser(channelId, liveChatId, channelIdToBan) {
  const tokens = getChannelTokens(channelId);
  const youtube = youtubeWithTokens(tokens);

  try {
    await youtube.liveChatBans.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          liveChatId,
          type: 'permanent',
          bannedUserDetails: {
            channelId: channelIdToBan,
          },
        },
      },
    });

    logEvent('INFO', 'YouTube Chat', `User banned: ${channelIdToBan}`);
    return true;
  } catch (error) {
    logEvent('ERROR', 'YouTube Chat', `Failed to ban user: ${error.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chatbot Automation
// ═══════════════════════════════════════════════════════════════════════════════

const activeChatbots = new Map(); // streamId -> { intervalId, config }

/**
 * Start automated chatbot for a stream
 */
export function startChatbot(streamId, config) {
  // Stop existing chatbot if any
  stopChatbot(streamId);

  const {
    channelId,
    liveChatId,
    messages = [],
    intervalMinutes = 10,
    mode = 'sequential', // 'sequential' or 'random'
  } = config;

  if (!liveChatId) {
    logEvent('WARN', 'YouTube Chatbot', `Cannot start chatbot: no live chat ID for stream ${streamId}`);
    return false;
  }

  let messageArray = [];
  if (Array.isArray(messages)) {
    messageArray = messages;
  } else if (typeof messages === 'string') {
    messageArray = messages.split('\n').map(m => m.trim()).filter(Boolean);
  }

  if (messageArray.length === 0) {
    logEvent('WARN', 'YouTube Chatbot', `Cannot start chatbot: no messages configured for stream ${streamId}`);
    return false;
  }

  let messageIndex = 0;

  const sendNextMessage = async () => {
    try {
      // Select message based on mode
      let message;
      if (mode === 'random') {
        message = messageArray[Math.floor(Math.random() * messageArray.length)];
      } else {
        message = messageArray[messageIndex % messageArray.length];
        messageIndex++;
      }

      // Send message
      await sendChatMessage(channelId, liveChatId, message);

      // Update database
      db.prepare(`
        UPDATE streams 
        SET chatbot_last_message = ?, 
            chatbot_message_count = chatbot_message_count + 1,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(message, streamId);

      logEvent('INFO', 'YouTube Chatbot', `Stream #${streamId}: Sent message #${messageIndex}`);
    } catch (error) {
      logEvent('ERROR', 'YouTube Chatbot', `Stream #${streamId}: Failed to send message: ${error.message}`);
    }
  };

  let intervalId;

  if (mode === 'Pesan terjadwal (Jam tertentu)') {
    // Parse format "19:30 | Halo semua"
    const parsedMessages = messageArray.map(m => {
      const parts = m.split('|');
      if (parts.length >= 2) {
        return { time: parts[0].trim(), text: parts.slice(1).join('|').trim(), lastSentDate: null };
      }
      return null;
    }).filter(Boolean);

    logEvent('INFO', 'YouTube Chatbot', `Chatbot started (Scheduled Time mode) for stream #${streamId} with ${parsedMessages.length} scheduled times.`);

    intervalId = setInterval(() => {
      const now = new Date();
      
      const timeFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit', minute: '2-digit', hour12: false
      });
      const currentTimeStr = timeFormatter.format(now);
      
      const dateFormatter = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Jakarta' 
      });
      const todayStr = dateFormatter.format(now);

      for (const msg of parsedMessages) {
        if (msg.time === currentTimeStr && msg.lastSentDate !== todayStr) {
          msg.lastSentDate = todayStr;
          
          sendChatMessage(channelId, liveChatId, msg.text).then(() => {
            db.prepare(`
              UPDATE streams 
              SET chatbot_last_message = ?, 
                  chatbot_message_count = chatbot_message_count + 1,
                  updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?
            `).run(msg.text, streamId);
            logEvent('INFO', 'YouTube Chatbot', `Stream #${streamId}: Sent scheduled message at ${currentTimeStr}`);
          }).catch(err => {
            logEvent('ERROR', 'YouTube Chatbot', `Stream #${streamId}: Failed to send scheduled message: ${err.message}`);
          });
        }
      }
    }, 60 * 1000); // Check every minute

  } else {
    // Send first message immediately
    sendNextMessage();

    // Schedule periodic messages
    const intervalMs = intervalMinutes * 60 * 1000;
    intervalId = setInterval(sendNextMessage, intervalMs);
    logEvent('INFO', 'YouTube Chatbot', `Chatbot started for stream #${streamId}, interval: ${intervalMinutes} minutes`);
  }

  activeChatbots.set(streamId, {
    intervalId,
    config,
    startedAt: new Date().toISOString(),
  });

  // Update database
  db.prepare(`
    UPDATE streams 
    SET chatbot_status = 'active',
        chatbot_started_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(streamId);

  return true;
}

/**
 * Stop chatbot for a stream
 */
export function stopChatbot(streamId) {
  const chatbot = activeChatbots.get(streamId);
  if (!chatbot) return false;

  clearInterval(chatbot.intervalId);
  activeChatbots.delete(streamId);

  // Update database
  db.prepare(`
    UPDATE streams 
    SET chatbot_status = 'stopped',
        chatbot_stopped_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(streamId);

  logEvent('INFO', 'YouTube Chatbot', `Chatbot stopped for stream #${streamId}`);
  return true;
}

/**
 * Get chatbot status
 */
export function getChatbotStatus(streamId) {
  const chatbot = activeChatbots.get(streamId);
  if (!chatbot) {
    return {
      active: false,
      streamId,
    };
  }

  return {
    active: true,
    streamId,
    startedAt: chatbot.startedAt,
    config: {
      intervalMinutes: chatbot.config.intervalMinutes,
      mode: chatbot.config.mode,
      messageCount: chatbot.config.messages.length,
    },
  };
}

/**
 * Get all active chatbots
 */
export function getActiveChatbots() {
  const result = [];
  for (const [streamId, chatbot] of activeChatbots.entries()) {
    result.push({
      streamId,
      startedAt: chatbot.startedAt,
      config: chatbot.config,
    });
  }
  return result;
}

/**
 * Stop all chatbots (for server shutdown)
 */
export function stopAllChatbots() {
  const streamIds = Array.from(activeChatbots.keys());
  streamIds.forEach(stopChatbot);
  logEvent('INFO', 'YouTube Chatbot', `Stopped ${streamIds.length} active chatbots`);
}
