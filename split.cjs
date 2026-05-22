const fs = require('fs');
let content = fs.readFileSync('client/src/features/campaign/AssetRunnerPanel.jsx', 'utf8');

content = content.replace('export function AssetRunnerPanel', 'export function AssetSelectorPanel');

const parts = content.split('{/* ── Encoder YouTube ───────────────────────────────── */}');

if (parts.length === 2) {
  // Remove the `updateEncoder` and `updateResolution` from the top of AssetSelectorPanel
  // We'll just let them be, but we need to remove them so they don't cause unused variable warnings.
  // Actually, they are inside the function AssetSelectorPanel. Let's just do a simple replacement.
  
  const part1 = parts[0] + '    </div>\n  );\n}\n\n';
  
  const encoderPart = `export function EncoderPanel({ state, setters }) {
  const updateEncoder = (nextMode) => {
    setters.setYoutubeEncoderMode(nextMode);
    if (nextMode === 'Stream Copy (CPU ringan)') {
      setters.setYoutubeResolution('Ikuti sumber');
      setters.setYoutubeBitrate('Ikuti sumber');
      setters.setYoutubeFps('Ikuti sumber');
      return;
    }
    const defaultResolution = state.youtubeResolution === 'Ikuti sumber' ? '1080p Full HD' : state.youtubeResolution;
    const preset = getEncoderPresetByResolution(defaultResolution);
    setters.setYoutubeResolution(defaultResolution);
    setters.setYoutubeBitrate(preset.bitrate);
    setters.setYoutubeFps(preset.fps);
  };

  const updateResolution = (nextResolution) => {
    const preset = getEncoderPresetByResolution(nextResolution);
    setters.setYoutubeResolution(nextResolution);
    setters.setYoutubeBitrate(preset.bitrate);
    setters.setYoutubeFps(preset.fps);
  };

  return (
    <div className="space-y-4">
      {/* ── Encoder YouTube ───────────────────────────────── */}` + parts[1];

  fs.writeFileSync('client/src/features/campaign/AssetRunnerPanel.jsx', part1 + encoderPart);
  console.log('Successfully split AssetRunnerPanel into AssetSelectorPanel and EncoderPanel.');
} else {
  console.log('Could not find split point.');
}
