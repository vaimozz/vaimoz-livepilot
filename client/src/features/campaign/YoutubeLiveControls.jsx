import { useState } from 'react';
import { Radio, Users, MessageCircle, TrendingUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { cx } from '@/lib/cn.js';

export function YoutubeLiveControls({
  campaignId,
  youtubeChannelId,
  isStarting,
  isLive,
  streamInfo,
  onStartYoutubeLive,
  onStopLive,
  onSaveDraft,
}) {
  const [chatMessage, setChatMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const handleSendMessage = async (sendMessageFn) => {
    if (!chatMessage.trim()) return;
    setIsSendingMessage(true);
    try {
      await sendMessageFn(chatMessage);
      setChatMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <Card className="rounded-3xl border-slate-800 bg-gradient-to-br from-red-500/10 to-slate-900/70">
      <CardContent className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <Radio className={cx('h-6 w-6', isLive ? 'animate-pulse text-red-400' : 'text-red-500')} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">YouTube Live</h3>
                <p className="text-sm text-slate-400">
                  {isLive ? '🔴 LIVE' : 'Start live streaming to YouTube'}
                </p>
              </div>
            </div>
          </div>
          {isLive && streamInfo?.youtubeWatchUrl && (
            <a
              href={streamInfo.youtubeWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500"
            >
              <ExternalLink className="h-4 w-4" />
              Watch Live
            </a>
          )}
        </div>

        {!isLive ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
              <h4 className="mb-3 text-sm font-bold text-white">Before Starting:</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">✓</span>
                  <span>YouTube channel connected</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">✓</span>
                  <span>Videos & thumbnails selected</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">✓</span>
                  <span>Live titles configured</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">✓</span>
                  <span>Chatbot messages ready (optional)</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={onSaveDraft}
                variant="outline"
                className="flex-1 rounded-xl border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
              >
                Save Draft
              </Button>
              <Button
                onClick={onStartYoutubeLive}
                disabled={isStarting || !youtubeChannelId}
                className="flex-1 rounded-xl bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
              >
                {isStarting ? (
                  <>
                    <Radio className="mr-2 h-5 w-5 animate-pulse" />
                    Creating Broadcast...
                  </>
                ) : (
                  <>
                    <Radio className="mr-2 h-5 w-5" />
                    Start YouTube Live
                  </>
                )}
              </Button>
            </div>

            {!youtubeChannelId && (
              <p className="text-center text-sm text-amber-400">
                ⚠ Select a YouTube channel first
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stream Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                <p className="mb-1 text-xs text-slate-500">Video</p>
                <p className="truncate text-sm font-bold text-white">
                  {streamInfo?.chosenVideo?.name || 'Unknown'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                <p className="mb-1 text-xs text-slate-500">Title</p>
                <p className="truncate text-sm font-bold text-white">
                  {streamInfo?.chosenTitle || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <Button
                onClick={onStopLive}
                className="flex-1 rounded-xl bg-slate-700 text-white hover:bg-slate-600"
              >
                ⏹ Stop Stream
              </Button>
            </div>

            {/* Manual Chat Message */}
            {streamInfo?.youtubeLiveChatId && (
              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-cyan-400" />
                  <h4 className="text-sm font-bold text-white">Send Chat Message</h4>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSendingMessage) {
                        handleSendMessage(streamInfo.sendMessage);
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none focus:border-cyan-500"
                    disabled={isSendingMessage}
                  />
                  <Button
                    onClick={() => handleSendMessage(streamInfo.sendMessage)}
                    disabled={isSendingMessage || !chatMessage.trim()}
                    className="rounded-xl bg-cyan-600 px-4 text-white hover:bg-cyan-500"
                  >
                    {isSendingMessage ? '...' : 'Send'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
