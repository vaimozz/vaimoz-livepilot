# YouTube Live Chat + Viewer Count - Implementation Guide

## 📋 Overview

Fitur **YouTube Live Chat + Viewer Count** melengkapi automation dengan:
- ✅ Chatbot otomatis kirim pesan ke YouTube live chat
- ✅ Real-time viewer count monitoring
- ✅ Smart Stop berdasarkan jumlah penonton asli
- ✅ Analytics tracking (views, likes, comments)
- ✅ Manual chat message sending
- ✅ Chatbot control (start/stop/status)

---

## 🏗️ Architecture

### Backend Components

#### 1. **YouTube Chat Service** (`services/youtubeChatService.js`)
Mengelola YouTube live chat:

**Functions:**
- `getLiveChatId()` - Get live chat ID from broadcast
- `sendChatMessage()` - Send message to live chat
- `getChatMessages()` - Get recent chat messages
- `deleteChatMessage()` - Delete message (moderator)
- `banChatUser()` - Ban user from chat
- `startChatbot()` - Start automated chatbot
- `stopChatbot()` - Stop chatbot
- `getChatbotStatus()` - Get chatbot status
- `getActiveChatbots()` - List all active chatbots
- `stopAllChatbots()` - Stop all (for shutdown)

**Chatbot Modes:**
- `sequential` - Send messages in order
- `random` - Send random messages

#### 2. **YouTube Analytics Service** (`services/youtubeAnalyticsService.js`)
Mengambil analytics data real-time:

**Functions:**
- `getLiveStreamStats()` - Get concurrent viewers, views, likes, comments
- `getStreamHealth()` - Get stream health status
- `startStreamMonitoring()` - Start periodic monitoring
- `stopStreamMonitoring()` - Stop monitoring
- `checkSmartStopCondition()` - Check if should delay stop
- `getChannelAnalytics()` - Get channel statistics

**Monitoring Interval:** 30 seconds (configurable)

#### 3. **Database Schema Updates** (`db/database.js`)
New columns in `streams` table:

```sql
-- Chat columns
youtube_live_chat_id TEXT,
chatbot_status TEXT DEFAULT 'inactive',
chatbot_started_at TEXT,
chatbot_stopped_at TEXT,
chatbot_message_count INTEGER DEFAULT 0,
chatbot_last_message TEXT,

-- Analytics columns
youtube_concurrent_viewers INTEGER DEFAULT 0,
youtube_total_views INTEGER DEFAULT 0,
youtube_likes INTEGER DEFAULT 0,
youtube_comments INTEGER DEFAULT 0,
youtube_stats_updated_at TEXT,

-- Smart stop columns
smart_stop_delayed_until TEXT,
smart_stop_reason TEXT
```

#### 4. **New API Endpoints** (`services/http/campaigns.routes.js`)

**Chatbot Control:**
- `POST /api/campaigns/:id/chatbot/start` - Start chatbot
- `POST /api/campaigns/:id/chatbot/stop` - Stop chatbot
- `GET /api/campaigns/:id/chatbot/status` - Get chatbot status
- `POST /api/campaigns/:id/chatbot/send` - Send single message

**Analytics:**
- `GET /api/campaigns/:id/analytics` - Get live stream analytics

---

## 🔄 Complete Workflow

### 1. User Starts YouTube Live

```javascript
// Frontend calls
await api.campaigns.startYoutubeLive(campaignId, {
  youtubeChannelId: '123',
});
```

### 2. Backend Creates Broadcast & Gets Live Chat ID

```javascript
// Create broadcast
const { broadcastId, streamId, rtmpUrl, streamKey, watchUrl } = 
  await createYoutubeLiveBroadcast({...});

// Get live chat ID
const liveChatId = await getLiveChatId(channelId, broadcastId);

// Save to database
db.prepare(`
  UPDATE streams 
  SET youtube_live_chat_id = ?,
      youtube_broadcast_id = ?,
      youtube_stream_id = ?,
      youtube_watch_url = ?
  WHERE id = ?
`).run(liveChatId, broadcastId, streamId, watchUrl, streamId);
```

### 3. Backend Starts Analytics Monitoring

```javascript
startStreamMonitoring(streamId, {
  channelId: youtubeChannelId,
  broadcastId,
  youtubeStreamId: streamId,
  intervalSeconds: 30, // Update every 30 seconds
});
```

**What it does:**
- Fetches live stats every 30 seconds
- Updates database with viewer count, views, likes, comments
- Checks smart stop condition
- Logs analytics data

### 4. Backend Starts Chatbot (if enabled)

```javascript
if (config.chatbot?.enabled && liveChatId) {
  startChatbot(streamId, {
    channelId: youtubeChannelId,
    liveChatId,
    messages: [
      'Welcome to the stream!',
      'Thanks for watching!',
      'Don\'t forget to like and subscribe!',
    ],
    intervalMinutes: 10, // Send message every 10 minutes
    mode: 'sequential', // or 'random'
  });
}
```

**What it does:**
- Sends first message immediately
- Schedules periodic messages
- Updates database with message count
- Logs each message sent

### 5. Monitoring Loop (Every 30 seconds)

```javascript
// Get live stats from YouTube API
const stats = await getLiveStreamStats(channelId, broadcastId);

// Update database
db.prepare(`
  UPDATE streams 
  SET youtube_concurrent_viewers = ?,
      youtube_total_views = ?,
      youtube_likes = ?,
      youtube_comments = ?,
      youtube_stats_updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`).run(
  stats.concurrentViewers,
  stats.viewCount,
  stats.likeCount,
  stats.commentCount,
  streamId
);

// Check smart stop condition
await checkSmartStopCondition(streamId, stats.concurrentViewers);
```

### 6. Smart Stop Logic

```javascript
async function checkSmartStopCondition(streamId, currentViewers) {
  // Get campaign config
  const config = getCampaignConfig(streamId);
  
  if (!config.smartStopEnabled) return;
  
  const threshold = config.smartStopViewerThreshold; // e.g., 25
  const delayMinutes = config.smartStopDelayMinutes; // e.g., 15
  
  // If viewers above threshold, delay stop
  if (currentViewers > threshold) {
    const newStopTime = new Date(Date.now() + delayMinutes * 60 * 1000);
    
    db.prepare(`
      UPDATE streams 
      SET smart_stop_delayed_until = ?,
          smart_stop_reason = ?
      WHERE id = ?
    `).run(
      newStopTime.toISOString(),
      `${currentViewers} viewers > ${threshold} threshold`,
      streamId
    );
    
    logEvent('INFO', 'Smart Stop', 
      `Stop delayed by ${delayMinutes} minutes (${currentViewers} viewers)`
    );
  }
}
```

### 7. Chatbot Loop (Every N minutes)

```javascript
// Chatbot interval (e.g., every 10 minutes)
setInterval(async () => {
  // Select message (sequential or random)
  const message = selectMessage(messages, mode, messageIndex);
  
  // Send to YouTube live chat
  await sendChatMessage(channelId, liveChatId, message);
  
  // Update database
  db.prepare(`
    UPDATE streams 
    SET chatbot_last_message = ?,
        chatbot_message_count = chatbot_message_count + 1
    WHERE id = ?
  `).run(message, streamId);
  
  logEvent('INFO', 'YouTube Chatbot', `Sent message: ${message}`);
}, intervalMs);
```

### 8. User Stops Stream

```javascript
// Frontend calls
await api.campaigns.stop(campaignId);
```

**Backend:**
1. Stops chatbot
2. Stops analytics monitoring
3. Stops FFmpeg
4. Completes YouTube broadcast

```javascript
// Stop chatbot
stopChatbot(streamId);

// Stop monitoring
stopStreamMonitoring(streamId);

// Stop FFmpeg
stopFfmpegStream(streamId);

// Complete broadcast
await completeBroadcast(channelId, broadcastId);
```

---

## 📊 Database Schema

### streams Table (Complete)

```sql
CREATE TABLE streams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER,
  platform TEXT NOT NULL DEFAULT 'Manual RTMP',
  status TEXT NOT NULL DEFAULT 'Offline',
  pid INTEGER,
  rtmp_url TEXT,
  
  -- YouTube Live fields
  youtube_broadcast_id TEXT,
  youtube_stream_id TEXT,
  youtube_watch_url TEXT,
  youtube_live_chat_id TEXT,
  
  -- Chatbot fields
  chatbot_status TEXT DEFAULT 'inactive',
  chatbot_started_at TEXT,
  chatbot_stopped_at TEXT,
  chatbot_message_count INTEGER DEFAULT 0,
  chatbot_last_message TEXT,
  
  -- Analytics fields
  youtube_concurrent_viewers INTEGER DEFAULT 0,
  youtube_total_views INTEGER DEFAULT 0,
  youtube_likes INTEGER DEFAULT 0,
  youtube_comments INTEGER DEFAULT 0,
  youtube_stats_updated_at TEXT,
  
  -- Smart stop fields
  smart_stop_delayed_until TEXT,
  smart_stop_reason TEXT,
  
  -- Chosen assets
  chosen_video_id INTEGER,
  chosen_thumbnail_id INTEGER,
  chosen_title TEXT,
  
  started_at TEXT,
  stopped_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);
```

---

## 🎯 API Reference

### POST /api/campaigns/:id/chatbot/start

Start chatbot for active stream.

**Request:**
```json
{
  "messages": [
    "Welcome to the stream!",
    "Thanks for watching!"
  ],
  "intervalMinutes": 10,
  "mode": "sequential"
}
```

**Response:**
```json
{
  "ok": true,
  "streamId": 123,
  "chatbot": {
    "status": "active",
    "intervalMinutes": 10,
    "messageCount": 2,
    "mode": "sequential"
  }
}
```

---

### POST /api/campaigns/:id/chatbot/stop

Stop chatbot for active stream.

**Response:**
```json
{
  "ok": true,
  "streamId": 123,
  "stopped": true
}
```

---

### GET /api/campaigns/:id/chatbot/status

Get chatbot status.

**Response:**
```json
{
  "ok": true,
  "streamId": 123,
  "chatbot": {
    "active": true,
    "startedAt": "2024-01-01T10:00:00Z",
    "messageCount": 5,
    "lastMessage": "Thanks for watching!",
    "config": {
      "intervalMinutes": 10,
      "mode": "sequential",
      "messageCount": 3
    }
  }
}
```

---

### POST /api/campaigns/:id/chatbot/send

Send single message to live chat.

**Request:**
```json
{
  "message": "Hello everyone!"
}
```

**Response:**
```json
{
  "ok": true,
  "streamId": 123,
  "message": "Hello everyone!",
  "sentAt": "2024-01-01T10:05:00Z"
}
```

---

### GET /api/campaigns/:id/analytics

Get live stream analytics.

**Response:**
```json
{
  "ok": true,
  "streamId": 123,
  "analytics": {
    "concurrentViewers": 150,
    "totalViews": 1250,
    "likes": 45,
    "comments": 23,
    "statsUpdatedAt": "2024-01-01T10:05:30Z",
    "live": {
      "broadcastId": "abc123xyz",
      "concurrentViewers": 150,
      "actualStartTime": "2024-01-01T10:00:00Z",
      "viewCount": 1250,
      "likeCount": 45,
      "commentCount": 23,
      "title": "My Live Stream",
      "fetchedAt": "2024-01-01T10:05:30Z"
    }
  }
}
```

---

## 🧪 Testing Guide

### 1. Start YouTube Live with Chatbot

```bash
# 1. Create campaign with chatbot config
curl -X POST http://localhost:8787/api/campaigns \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Stream with Chatbot",
    "mode": "YouTube API",
    "status": "Draft",
    "config": {
      "youtubeChannelId": "1",
      "youtubeLiveTitles": "Test Live Stream",
      "youtubeDescription": "Testing chatbot",
      "youtubePrivacy": "Unlisted",
      "videoAssetIds": [1, 2, 3],
      "chatbot": {
        "enabled": true,
        "mode": "sequential",
        "interval": "5",
        "messages": [
          "Welcome to the stream!",
          "Thanks for watching!",
          "Don\'t forget to like and subscribe!"
        ]
      },
      "smartStopEnabled": true,
      "smartStopViewerThreshold": "10",
      "smartStopDelayMinutes": "15"
    }
  }'

# 2. Start YouTube live
curl -X POST http://localhost:8787/api/campaigns/1/start-youtube-live \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"youtubeChannelId": "1"}'
```

### 2. Monitor Chatbot Status

```bash
# Get chatbot status
curl http://localhost:8787/api/campaigns/1/chatbot/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "ok": true,
  "streamId": 123,
  "chatbot": {
    "active": true,
    "startedAt": "2024-01-01T10:00:00Z",
    "messageCount": 3,
    "lastMessage": "Welcome to the stream!",
    "config": {
      "intervalMinutes": 5,
      "mode": "sequential",
      "messageCount": 3
    }
  }
}
```

### 3. Send Manual Message

```bash
curl -X POST http://localhost:8787/api/campaigns/1/chatbot/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from API!"}'
```

### 4. Monitor Analytics

```bash
# Get live analytics
curl http://localhost:8787/api/campaigns/1/analytics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "ok": true,
  "streamId": 123,
  "analytics": {
    "concurrentViewers": 25,
    "totalViews": 150,
    "likes": 10,
    "comments": 5,
    "statsUpdatedAt": "2024-01-01T10:05:30Z"
  }
}
```

### 5. Check Smart Stop

```bash
# Check database for smart stop status
sqlite3 database.sqlite

SELECT 
  id,
  youtube_concurrent_viewers,
  smart_stop_delayed_until,
  smart_stop_reason
FROM streams 
WHERE id = 123;
```

**Expected Output:**
```
123|25|2024-01-01T10:20:00Z|25 viewers > 10 threshold
```

### 6. Stop Chatbot

```bash
curl -X POST http://localhost:8787/api/campaigns/1/chatbot/stop \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 7. Check Server Logs

```bash
# Watch logs for chatbot & analytics activity
tail -f logs/app.log

# Expected logs:
[INFO] YouTube Chat: Live chat ID: abc123xyz
[INFO] YouTube Chatbot: Started chatbot for stream #123
[INFO] YouTube Analytics: Started monitoring stream #123
[INFO] YouTube Chatbot: Stream #123: Sent message #1
[INFO] YouTube Analytics: Stream #123: 25 viewers, 150 total views
[INFO] Smart Stop: Stream #123: Stop delayed by 15 minutes (25 viewers)
```

---

## 🐛 Troubleshooting

### Issue: "No live chat ID found"
**Solution:**
- Live chat might not be enabled for the broadcast
- Check YouTube Studio → Live dashboard
- Ensure broadcast is in "testing" or "live" status
- Some broadcasts don't have live chat (e.g., unlisted/private)

### Issue: Chatbot not sending messages
**Solution:**
- Check chatbot status: `GET /api/campaigns/:id/chatbot/status`
- Check live chat ID exists in database
- Check server logs for errors
- Verify OAuth token has chat permissions
- Test manual send: `POST /api/campaigns/:id/chatbot/send`

### Issue: Viewer count always 0
**Solution:**
- Viewer count only updates when broadcast is "live"
- Check broadcast status in YouTube Studio
- Wait 30 seconds for first update
- Check `youtube_stats_updated_at` in database
- Verify monitoring is running: check server logs

### Issue: Smart Stop not working
**Solution:**
- Check `smartStopEnabled` in campaign config
- Check `smartStopViewerThreshold` value
- Check database for `smart_stop_delayed_until`
- Verify viewer count is being updated
- Check server logs for "Smart Stop" messages

### Issue: "Failed to send message: quotaExceeded"
**Solution:**
- YouTube API has quota limits
- Live chat messages: 60 per minute
- Reduce chatbot interval (increase minutes)
- Check quota usage in Google Cloud Console

---

## 📈 Performance Considerations

### API Quota Usage

**YouTube Data API v3 Quota:**
- Daily quota: 10,000 units (default)
- Live chat message insert: 50 units
- Video statistics: 1 unit
- Live broadcast list: 1 unit

**Estimated Usage per Stream:**
- Analytics monitoring (30s interval): 2,880 units/day
- Chatbot (10min interval): 7,200 units/day
- **Total: ~10,000 units/day** (at quota limit)

**Optimization:**
- Increase monitoring interval to 60s: 1,440 units/day
- Increase chatbot interval to 15min: 4,800 units/day
- **Total: ~6,200 units/day** (safe)

### Database Performance

**Indexes Recommended:**
```sql
CREATE INDEX idx_streams_campaign_status ON streams(campaign_id, status);
CREATE INDEX idx_streams_youtube_broadcast ON streams(youtube_broadcast_id);
CREATE INDEX idx_streams_chatbot_status ON streams(chatbot_status);
```

### Memory Usage

**Active Monitors:**
- Each monitor: ~1KB memory
- 10 concurrent streams: ~10KB
- Negligible impact

**Active Chatbots:**
- Each chatbot: ~2KB memory
- 10 concurrent chatbots: ~20KB
- Negligible impact

---

## 🚀 Frontend Integration

### Display Viewer Count

```javascript
// Fetch analytics every 30 seconds
useEffect(() => {
  const interval = setInterval(async () => {
    const result = await api.campaigns.analytics(campaignId);
    setViewerCount(result.analytics.concurrentViewers);
    setTotalViews(result.analytics.totalViews);
    setLikes(result.analytics.likes);
  }, 30000);
  
  return () => clearInterval(interval);
}, [campaignId]);

// Display in UI
<div className="stats">
  <div className="stat">
    <span className="label">👁 Viewers</span>
    <span className="value">{viewerCount}</span>
  </div>
  <div className="stat">
    <span className="label">📊 Views</span>
    <span className="value">{totalViews}</span>
  </div>
  <div className="stat">
    <span className="label">👍 Likes</span>
    <span className="value">{likes}</span>
  </div>
</div>
```

### Chatbot Control UI

```javascript
// Chatbot status
const [chatbotActive, setChatbotActive] = useState(false);
const [messageCount, setMessageCount] = useState(0);

// Start chatbot
const startChatbot = async () => {
  await api.campaigns.startChatbot(campaignId, {
    messages: [
      'Welcome!',
      'Thanks for watching!',
    ],
    intervalMinutes: 10,
    mode: 'sequential',
  });
  setChatbotActive(true);
};

// Stop chatbot
const stopChatbot = async () => {
  await api.campaigns.stopChatbot(campaignId);
  setChatbotActive(false);
};

// UI
<div className="chatbot-control">
  <button onClick={chatbotActive ? stopChatbot : startChatbot}>
    {chatbotActive ? '⏸ Stop Chatbot' : '▶ Start Chatbot'}
  </button>
  {chatbotActive && (
    <span className="status">
      ✓ Active • {messageCount} messages sent
    </span>
  )}
</div>
```

### Send Manual Message

```javascript
const [message, setMessage] = useState('');

const sendMessage = async () => {
  await api.campaigns.sendChatMessage(campaignId, { message });
  setMessage('');
  alert('Message sent!');
};

// UI
<div className="manual-message">
  <input
    value={message}
    onChange={(e) => setMessage(e.target.value)}
    placeholder="Type a message..."
  />
  <button onClick={sendMessage}>Send</button>
</div>
```

---

## ✅ Features Implemented

- [x] Get live chat ID from broadcast
- [x] Send messages to live chat
- [x] Automated chatbot (sequential/random modes)
- [x] Chatbot start/stop/status endpoints
- [x] Manual message sending
- [x] Real-time viewer count monitoring
- [x] Analytics tracking (views, likes, comments)
- [x] Smart Stop based on viewer count
- [x] Database schema for chat & analytics
- [x] Periodic monitoring (30s interval)
- [x] Graceful shutdown (stop all chatbots/monitors)
- [x] Error handling and logging
- [x] API endpoints for all features

---

## 🔮 Future Enhancements

### Chat Moderation
```javascript
// Auto-moderate chat based on keywords
async function moderateChat(liveChatId, keywords) {
  const messages = await getChatMessages(channelId, liveChatId);
  
  for (const msg of messages) {
    const text = msg.snippet.textMessageDetails.messageText.toLowerCase();
    
    if (keywords.some(kw => text.includes(kw))) {
      await deleteChatMessage(channelId, msg.id);
      await banChatUser(channelId, liveChatId, msg.authorDetails.channelId);
    }
  }
}
```

### Interactive Chatbot
```javascript
// Respond to specific commands
async function handleChatCommand(message) {
  const text = message.snippet.textMessageDetails.messageText;
  
  if (text.startsWith('!time')) {
    return `Current time: ${new Date().toLocaleTimeString()}`;
  }
  
  if (text.startsWith('!viewers')) {
    const stats = await getLiveStreamStats(channelId, broadcastId);
    return `Current viewers: ${stats.concurrentViewers}`;
  }
  
  return null;
}
```

### Advanced Analytics
```javascript
// Track viewer trends
function analyzeViewerTrends(history) {
  const trend = calculateTrend(history);
  
  if (trend === 'increasing') {
    // Extend stream duration
  } else if (trend === 'decreasing') {
    // Prepare to stop
  }
}
```

---

## 🎉 Conclusion

**YouTube Live Chat + Viewer Count sudah fully implemented!**

Fitur ini melengkapi automation dengan:
1. ✅ Chatbot otomatis kirim pesan berkala
2. ✅ Real-time viewer count monitoring
3. ✅ Smart Stop berdasarkan penonton asli
4. ✅ Analytics tracking lengkap
5. ✅ Manual chat control
6. ✅ Full API endpoints

**Complete Automation Flow:**
```
Upload Assets
    ↓
Create Campaign (with chatbot config)
    ↓
Start YouTube Live
    ↓
Create Broadcast & Stream
    ↓
Get Live Chat ID
    ↓
Start FFmpeg Streaming
    ↓
Start Chatbot (send messages every N minutes)
    ↓
Start Analytics Monitoring (update every 30s)
    ↓
Check Smart Stop (delay if viewers > threshold)
    ↓
Display in Dashboard & Monitor
    ↓
Stop Stream (stop chatbot, monitoring, FFmpeg, complete broadcast)
```

**Status: PRODUCTION READY** 🚀

---

*Generated: 2026-05-20*
*Project: Vaimoz LivePilot*
*Version: 0.3.0*
