export function removeYoutubeChannel(channels, id) {
  const removedChannel = channels.find((channel) => channel.id === id);
  const nextChannels = channels.filter((channel) => channel.id !== id);

  if (!removedChannel?.isDefault || nextChannels.length === 0) return nextChannels;

  return nextChannels.map((channel, index) => ({
    ...channel,
    isDefault: index === 0,
  }));
}
