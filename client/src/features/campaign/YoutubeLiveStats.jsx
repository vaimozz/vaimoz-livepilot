import { useEffect, useState } from 'react';
import { Users, Eye, ThumbsUp, MessageSquare, Bot, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { cx } from '@/lib/cn.js';
import { api } from '@/lib/api.js';

export function YoutubeLiveStats({ campaignId, isLive }) {
  const [analytics, setAnalytics] = useState(null);
  const [chatbotStatus, setChatbotStatus] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isLoadingChatbot, setIsLoadingChatbot] = useState(false);

  const loadAnalytics = async () => {
    if (!isLive || !campaignId) return;
    setIsLoadingAnalytics(true);
    try {
      const result = await api.analytics.get(campaignId);
      setAnalytics(result.analytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const loadChatbotStatus = async () => {
    if (!isLive || !campaignId) return;
    setIsLoadingChatbot(true);
    try {
      const result = await api.chatbot.status(campaignId);
      setChatbotStatus(result.chatbot);
    } catch (error) {
      console.error('Failed to load chatbot status:', error);
    } finally {
      setIsLoadingChatbot(false);
    }
  };

  const toggleChatbot = async () => {
    if (!campaignId) return;
    try {
      if (chatbotStatus?.active) {
        await api.chatbot.stop(campaignId);
      } else {
        await api.chatbot.start(campaignId, {});
      }
      await loadChatbotStatus();
    } catch (error) {
      console.error('Failed to toggle chatbot:', error);
    }
  };

  useEffect(() => {
    if (isLive) {
      loadAnalytics();
      loadChatbotStatus();

      // Refresh every 30 seconds
      const interval = setInterval(() => {
        loadAnalytics();
        loadChatbotStatus();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isLive, campaignId]);

  if (!isLive) {
    return (
      <Card className="rounded-3xl border-slate-800 bg-slate-900/70">
        <CardContent className="p-6">
          <div className="flex min-h-[200px] items-center justify-center text-center">
            <div>
              <Users className="mx-auto mb-3 h-12 w-12 text-slate-600" />
              <p className="font-bold text-slate-400">No Active Stream</p>
              <p className="mt-1 text-sm text-slate-500">
                Start a YouTube live stream to see analytics
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Analytics Card */}
      <Card className="rounded-3xl border-slate-800 bg-slate-900/70">
        <CardContent className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Live Analytics</h3>
            <button
              onClick={loadAnalytics}
              disabled={isLoadingAnalytics}
              className="text-sm text-cyan-400 hover:text-cyan-300"
            >
              {isLoadingAnalytics ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {analytics ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-red-400" />
                  <p className="text-xs text-slate-500">Viewers</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {analytics.concurrentViewers?.toLocaleString() || '0'}
                </p>
                <p className="mt-1 text-xs text-slate-500">watching now</p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-400" />
                  <p className="text-xs text-slate-500">Total Views</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {analytics.totalViews?.toLocaleString() || '0'}
                </p>
                <p className="mt-1 text-xs text-slate-500">all time</p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-green-400" />
                  <p className="text-xs text-slate-500">Likes</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {analytics.likes?.toLocaleString() || '0'}
                </p>
                <p className="mt-1 text-xs text-slate-500">total</p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-400" />
                  <p className="text-xs text-slate-500">Comments</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {analytics.comments?.toLocaleString() || '0'}
                </p>
                <p className="mt-1 text-xs text-slate-500">total</p>
              </div>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-slate-500">Loading analytics...</p>
            </div>
          )}

          {analytics?.statsUpdatedAt && (
            <p className="mt-4 text-center text-xs text-slate-500">
              Last updated: {new Date(analytics.statsUpdatedAt).toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Chatbot Card */}
      <Card className="rounded-3xl border-slate-800 bg-slate-900/70">
        <CardContent className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cx(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  chatbotStatus?.active ? 'bg-green-500/20' : 'bg-slate-700'
                )}
              >
                <Bot
                  className={cx(
                    'h-5 w-5',
                    chatbotStatus?.active ? 'text-green-400' : 'text-slate-400'
                  )}
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Chatbot</h3>
                <p className="text-xs text-slate-400">
                  {chatbotStatus?.active ? '✓ Active' : 'Inactive'}
                </p>
              </div>
            </div>
            <Button
              onClick={toggleChatbot}
              disabled={isLoadingChatbot}
              className={cx(
                'rounded-xl px-4 text-white',
                chatbotStatus?.active
                  ? 'bg-red-600 hover:bg-red-500'
                  : 'bg-green-600 hover:bg-green-500'
              )}
            >
              {chatbotStatus?.active ? '⏸ Stop' : '▶ Start'}
            </Button>
          </div>

          {chatbotStatus ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <p className="mb-1 text-xs text-slate-500">Messages Sent</p>
                  <p className="text-xl font-bold text-white">
                    {chatbotStatus.messageCount || 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <p className="mb-1 text-xs text-slate-500">Interval</p>
                  <p className="text-xl font-bold text-white">
                    {chatbotStatus.config?.intervalMinutes || 10} min
                  </p>
                </div>
              </div>

              {chatbotStatus.lastMessage && (
                <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <p className="mb-2 text-xs text-slate-500">Last Message</p>
                  <p className="text-sm text-slate-300">{chatbotStatus.lastMessage}</p>
                </div>
              )}

              {chatbotStatus.startedAt && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  <span>
                    Started: {new Date(chatbotStatus.startedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center">
              <p className="text-sm text-slate-500">Loading chatbot status...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
