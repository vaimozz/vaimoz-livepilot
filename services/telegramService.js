/**
 * Telegram Notification Service
 *
 * Kirim notifikasi ke Telegram bot untuk event-event penting:
 * - Stream dimulai / dihentikan
 * - Broadcast YouTube live
 * - Error kritis
 * - Viewer count milestone
 * - Smart Stop triggered
 * - Chatbot status
 */

import { db, logEvent } from '../db/database.js';

const TELEGRAM_API = 'https://api.telegram.org/bot';

/**
 * Ambil konfigurasi Telegram dari database (settings table)
 * Fallback ke env jika belum ada di DB
 */
function getTelegramConfig() {
  const tokenRow = db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get();
  const chatRow  = db.prepare("SELECT value FROM settings WHERE key = 'telegram_chat_id'").get();

  const botToken = tokenRow?.value || process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId   = chatRow?.value  || process.env.TELEGRAM_CHAT_ID   || '';

  return { botToken, chatId };
}

/**
 * Kirim pesan ke Telegram
 * @param {string} text - Pesan (mendukung HTML)
 * @param {object} options - Override botToken / chatId
 */
export async function sendTelegram(text, options = {}) {
  const { botToken, chatId } = { ...getTelegramConfig(), ...options };

  if (!botToken || !chatId) {
    logEvent('WARN', 'Telegram', 'Bot token atau Chat ID belum dikonfigurasi.');
    return { ok: false, reason: 'not_configured' };
  }

  try {
    const url = `${TELEGRAM_API}${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      logEvent('ERROR', 'Telegram', `Gagal kirim pesan: ${data.description}`);
      return { ok: false, reason: data.description };
    }

    logEvent('INFO', 'Telegram', `Pesan terkirim ke chat ${chatId}`);
    return { ok: true, messageId: data.result?.message_id };
  } catch (error) {
    logEvent('ERROR', 'Telegram', `Error kirim pesan: ${error.message}`);
    return { ok: false, reason: error.message };
  }
}

/**
 * Test koneksi Telegram
 */
export async function testTelegramConnection(botToken, chatId) {
  const text = `✅ <b>Vaimoz LivePilot</b>\n\nKoneksi Telegram berhasil!\nWaktu: ${new Date().toLocaleString('id-ID')}`;
  return sendTelegram(text, { botToken, chatId });
}

// ── Notifikasi spesifik ───────────────────────────────────────────────────────

export async function notifyStreamStarted({ campaignName, platform, chosenTitle, chosenVideo, watchUrl, pid }) {
  const lines = [
    `🔴 <b>LIVE DIMULAI</b>`,
    ``,
    `📌 <b>Kampanye:</b> ${campaignName}`,
    `🎬 <b>Platform:</b> ${platform}`,
    chosenTitle  ? `📝 <b>Judul:</b> ${chosenTitle}` : null,
    chosenVideo  ? `🎥 <b>Video:</b> ${chosenVideo}` : null,
    watchUrl     ? `🔗 <b>Tonton:</b> ${watchUrl}` : null,
    pid          ? `⚙️ <b>PID:</b> ${pid}` : null,
    ``,
    `⏱ ${new Date().toLocaleString('id-ID')}`,
  ].filter(Boolean);

  return sendTelegram(lines.join('\n'));
}

export async function notifyStreamStopped({ campaignName, streamId, duration, concurrentViewers }) {
  const lines = [
    `⏹ <b>STREAM DIHENTIKAN</b>`,
    ``,
    `📌 <b>Kampanye:</b> ${campaignName}`,
    `🆔 <b>Stream ID:</b> ${streamId}`,
    duration          ? `⏱ <b>Durasi:</b> ${duration}` : null,
    concurrentViewers ? `👥 <b>Penonton terakhir:</b> ${concurrentViewers}` : null,
    ``,
    `🕐 ${new Date().toLocaleString('id-ID')}`,
  ].filter(Boolean);

  return sendTelegram(lines.join('\n'));
}

export async function notifyStreamError({ campaignName, error }) {
  const lines = [
    `❌ <b>ERROR STREAM</b>`,
    ``,
    `📌 <b>Kampanye:</b> ${campaignName}`,
    `⚠️ <b>Error:</b> ${error}`,
    ``,
    `🕐 ${new Date().toLocaleString('id-ID')}`,
  ];

  return sendTelegram(lines.join('\n'));
}

export async function notifyViewerMilestone({ campaignName, viewers, watchUrl }) {
  const lines = [
    `🎉 <b>MILESTONE PENONTON</b>`,
    ``,
    `📌 <b>Kampanye:</b> ${campaignName}`,
    `👥 <b>Penonton sekarang:</b> ${viewers.toLocaleString()}`,
    watchUrl ? `🔗 <b>Tonton:</b> ${watchUrl}` : null,
    ``,
    `🕐 ${new Date().toLocaleString('id-ID')}`,
  ].filter(Boolean);

  return sendTelegram(lines.join('\n'));
}

export async function notifySmartStopDelayed({ campaignName, viewers, threshold, delayMinutes }) {
  const lines = [
    `⏸ <b>SMART STOP DITUNDA</b>`,
    ``,
    `📌 <b>Kampanye:</b> ${campaignName}`,
    `👥 <b>Penonton:</b> ${viewers} (threshold: ${threshold})`,
    `⏱ <b>Ditunda:</b> ${delayMinutes} menit`,
    ``,
    `🕐 ${new Date().toLocaleString('id-ID')}`,
  ];

  return sendTelegram(lines.join('\n'));
}

export async function notifyBroadcastLive({ campaignName, broadcastId, watchUrl, title }) {
  const lines = [
    `📡 <b>YOUTUBE BROADCAST LIVE</b>`,
    ``,
    `📌 <b>Kampanye:</b> ${campaignName}`,
    title       ? `📝 <b>Judul:</b> ${title}` : null,
    broadcastId ? `🆔 <b>Broadcast ID:</b> ${broadcastId}` : null,
    watchUrl    ? `🔗 <b>Tonton:</b> ${watchUrl}` : null,
    ``,
    `🕐 ${new Date().toLocaleString('id-ID')}`,
  ].filter(Boolean);

  return sendTelegram(lines.join('\n'));
}
