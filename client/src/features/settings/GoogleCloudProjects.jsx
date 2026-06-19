import React, { useState, useEffect } from 'react';

export default function GoogleCloudProjects() {
  const [primary, setPrimary] = useState(null);
  const [fallbacks, setFallbacks] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      
      setPrimary({
        clientId: data.settings?.google_client_id || '',
        clientSecret: data.settings?.google_client_secret || '',
        redirectUri: data.settings?.google_redirect_uri || 'http://localhost:3000/api/youtube/callback',
      });

      if (data.settings?.google_fallback_projects) {
        try {
          setFallbacks(JSON.parse(data.settings.google_fallback_projects));
        } catch {
          setFallbacks([]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = (e, isPrimary) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const web = json.web || json.installed;
        if (!web || !web.client_id || !web.client_secret) {
          throw new Error('File JSON tidak memiliki struktur client_id dan client_secret yang valid.');
        }

        const projectData = {
          clientId: web.client_id,
          clientSecret: web.client_secret,
          redirectUri: web.redirect_uris?.[0] || 'http://localhost:3000/api/youtube/callback',
          name: web.project_id || 'Fallback Project'
        };

        if (isPrimary) {
          setPrimary(projectData);
        } else {
          // Add to fallbacks, ensuring no duplicates
          setFallbacks(prev => {
            const exists = prev.find(p => p.clientId === projectData.clientId);
            if (exists) return prev;
            return [...prev, projectData];
          });
        }
        
        setMessage({ type: 'success', text: 'File JSON berhasil dibaca! Jangan lupa klik Simpan.' });
      } catch (err) {
        setMessage({ type: 'error', text: err.message });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const removeFallback = (clientId) => {
    setFallbacks(prev => prev.filter(p => p.clientId !== clientId));
  };

  const saveSettings = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_client_id: primary.clientId,
          google_client_secret: primary.clientSecret,
          google_redirect_uri: primary.redirectUri,
          google_fallback_projects: JSON.stringify(fallbacks)
        })
      });
      setMessage({ type: 'success', text: 'Konfigurasi Project berhasil disimpan!' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal menyimpan konfigurasi.' });
    }
    setLoading(false);
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 mb-6">
      <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
        <span>âš™ï¸</span> Google Cloud Projects (YouTube API)
      </h2>
      <p className="text-gray-400 text-sm mb-6">
        Unggah file <code>client_secret.json</code> dari Google Cloud Console. Anda dapat menambahkan banyak project (Cadangan) agar ketika kuota 10.000 limit habis, Vaimoz akan otomatis menggunakan JSON cadangan tanpa menghentikan siaran!
      </p>

      {message.text && (
        <div className={`p-4 rounded-xl mb-6 ${message.type === 'error' ? 'bg-red-500/20 text-red-200 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'}`}>
          {message.text}
        </div>
      )}

      {/* Primary Project */}
      <div className="bg-white/5 rounded-xl p-5 border border-white/5 mb-6">
        <h3 className="text-white font-semibold mb-4 flex justify-between items-center">
          Project Utama
          <label className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full cursor-pointer hover:bg-emerald-500/30 transition-colors">
            Upload JSON Baru
            <input type="file" accept=".json" className="hidden" onChange={(e) => handleFileUpload(e, true)} />
          </label>
        </h3>
        {primary?.clientId ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Client ID</label>
              <input type="text" readOnly value={primary.clientId} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-300 font-mono" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Client Secret</label>
              <input type="password" readOnly value={primary.clientSecret} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-300 font-mono" />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">Belum ada Project Utama. Harap upload JSON.</p>
        )}
      </div>

      {/* Fallback Projects */}
      <div className="bg-white/5 rounded-xl p-5 border border-white/5 mb-6">
        <h3 className="text-white font-semibold mb-4 flex justify-between items-center">
          Project Cadangan (Multi-Project Fallback)
          <label className="text-xs bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full cursor-pointer hover:bg-indigo-500/30 transition-colors">
            Tambah Cadangan JSON
            <input type="file" accept=".json" className="hidden" onChange={(e) => handleFileUpload(e, false)} />
          </label>
        </h3>

        {fallbacks.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Belum ada Project cadangan. Kuota Anda terbatas 10.000/hari.</p>
        ) : (
          <div className="space-y-4">
            {fallbacks.map((fb, idx) => (
              <div key={idx} className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
                <div>
                  <div className="text-sm text-white font-medium">{fb.name || `Fallback ${idx + 1}`}</div>
                  <div className="text-xs text-gray-500 font-mono mt-1">{fb.clientId}</div>
                </div>
                <button
                  onClick={() => removeFallback(fb.clientId)}
                  className="text-red-400 hover:text-red-300 p-2"
                  title="Hapus"
                >
                  âœ–
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={loading}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-6 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? 'Menyimpan...' : 'Simpan Konfigurasi Project'}
        </button>
      </div>
    </div>
  );
}
