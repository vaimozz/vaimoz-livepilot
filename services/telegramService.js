/**
 * Telegram Notification Service
 *
 * Kirim notifikasi ke Telegram bot untuk event-event penting:
 * stream start/stop/error, broadcast live, viewer milestone, smart stop.
 *
 * Credentials dibaca dari tabel `settings` (DB), fallback ke .env.
 */

import { db, logEvent } from '../db/database.js';

const TELEGRAM_API = 'https://api.telegram.org/bot';

function getTelegramConfig() {
  const tokenRow = db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get();
  const chatRow  = db.prepare("SELECT value FROM settings WHERE key = 'telegram_chat_id'").get();
  return {
    botToken: tokenRow?.value || process.env.TELEGRAM_BOT_TOKEN || '',
    chatId:   chatRow?.value  || process.env.TELEGRAM_CHAT_ID   || '',
  };
}

function isPrefEnabled(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value === 'true' : true; // default enabled
}

export async function sendTelegram(text, options = {}) {
  const { botToken, chatId } = { ...getTelegramConfig(), ...options };
  if (!botToken || !chatId) {
    logEvent('WARN', 'Telegram', 'Bot token atau Chat ID belum dikonfigurasi.');
    return { ok: false, reason: 'not_configured' };
  }
  try {
    const res = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: false }),
    });
    const data = await res.json();
    if (!data.ok) {
      logEvent('ERROR', 'Telegram', `Gagal kirim: ${data.description}`);
      return { ok: false, reason: data.description };
    }
    logEvent('INFO', 'Telegram', `Pesan terkirim ke chat ${chatId}`);
    return { ok: true, messageId: data.result?.message_id };
  } catch (error) {
    logEvent('ERROR', 'Telegram', `Error: ${error.message}`);
    return { ok: false, reason: error.message };
  }
}

export async function testTelegramConnection(botToken, chatId) {
  const text = `✅ <b>Vaimoz LivePilot</b>\n\nKoneksi Telegram berhasil!\nWaktu: ${new Date().toLocaleString('id-ID')}`;
  return sendTelegram(text, { botToken, chatId });
}

export async function notifyStreamStarted({ campaignName, platform, chosenTitle, chosenVideo, watchUrl, pid }) {
  if (!isPrefEnabled('notify_stream_start')) return;
  const lines = [
    `🔴 <b>LIVE DIMULAI</b>`,
    ``,
    `📌 <b>Kampanye:</b> ${campaignName}`,
    `🎬 <b>Platform:</b> ${platform}`,
    chosenTitle ? `📝 <b>Judul:</b> ${chosenTitle}` : null,
    chosenVideo ? `🎥 <b>Video:</b> ${chosenVideo}` : null,
    watchUrl    ? `🔗 <b>Tonton:</b> ${watchUrl}` : null,
    pid         ? `⚙️ <b>PID:</b> ${pid}` : null,
    ``,
    `⏱ ${new Date().toLocaleString('id-ID')}`,
  ].filter(Boolean);
  return sendTelegram(lines.join('\n'));
}

export async function notifyStreamStopped({ campaignName, streamId, duration, concurrentViewers }) {
  if (!isPrefEnabled('notify_stream_stop')) return;
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
  if (!isPrefEnabled('notify_stream_error')) return;
  return sendTelegram([
    `❌ <b>ERROR STREAM</b>`,
    ``,
    `📌 <b>Kampanye:</b> ${campaignName}`,
    `⚠️ <b>Error:</b> ${error}`,
    ``,
    `🕐 ${new Date().toLocaleString('id-ID')}`,
  ].join('\n'));
}

export async function notifyStreamReconnecting({ campaignName, attempt, maxRetries, delaySeconds }) {
  if (!isPrefEnabled('notify_stream_error')) return; // Re-use error preference
  return sendTelegram([
    `🔄 <b>RECONNECTING STREAM</b>`,
    ``,
    `📌 <b>Kampanye:</b> ${campaignName}`,
    `⚠️ <b>Status:</b> Koneksi terputus. Mencoba menyambung ulang...`,
    `🔄 <b>Percobaan:</b> ${attempt} dari ${maxRetries}`,
    `⏳ <b>Jeda:</b> ${delaySeconds} detik`,
    ``,
    `🕐 ${new Date().toLocaleString('id-ID')}`,
  ].join('\n'));
}

export async function notifyBroadcastLive({ campaignName, broadcastId, watchUrl, title }) {
  if (!isPrefEnabled('notify_broadcast_live')) return;
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

export async function notifyViewerMilestone({ campaignName, viewers, watchUrl }) {
  if (!isPrefEnabled('notify_viewer_milestone')) return;
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
  if (!isPrefEnabled('notify_smart_stop')) return;
  return sendTelegram([
    `⏸ <b>SMART STOP DITUNDA</b>`,
    ``,
    `📌 <b>Kampanye:</b> ${campaignName}`,
    `👥 <b>Penonton:</b> ${viewers} (threshold: ${threshold})`,
    `⏱ <b>Ditunda:</b> ${delayMinutes} menit`,
    ``,
    `🕐 ${new Date().toLocaleString('id-ID')}`,
  ].join('\n'));
}
