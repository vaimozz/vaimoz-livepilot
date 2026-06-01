import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db, logEvent } from '../db/database.js';
import { config } from '../utils/config.js';

/**
 * Helper untuk mencoba beberapa model Gemini jika salah satunya tidak ditemukan (404)
 */
/**
 * Helper untuk mengambil API Key dan Base URL
 */
function getGeminiConfig() {
  let apiKey = '';
  let baseUrl = 'https://generativelanguage.googleapis.com';
  try {
    const rowKey = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get();
    if (rowKey && rowKey.value) apiKey = rowKey.value;

    const rowUrl = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_url'").get();
    if (rowUrl && rowUrl.value) {
      // Remove trailing slash if any
      baseUrl = rowUrl.value.replace(/\/$/, '');
    }
  } catch (e) {}

  return { apiKey, baseUrl };
}

/**
 * Helper untuk mencoba memanggil Gemini, dan jika 404, ia akan mengecek daftar model 
 * yang tersedia di API Key tersebut (ListModels) secara dinamis.
 */
async function generateTextWithFallback(apiKey, baseUrl, promptText) {
  const tryModel = async (modelName) => {
    const req = await fetch(`${baseUrl}/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.7 }
      })
    });
    if (req.ok) return await req.json();
    const errText = await req.text();
    const err = new Error(`Gemini API error (${modelName}): ${req.statusText} - ${errText}`);
    err.status = req.status;
    throw err;
  };

  // 1. Coba model standar terbaru
  try {
    return await tryModel('gemini-1.5-flash');
  } catch (err) {
    if (err.status !== 404) throw err;
  }

  try {
    return await tryModel('gemini-1.5-pro');
  } catch (err) {
    if (err.status !== 404) throw err;
  }

  // 2. Jika standar 404, fetch list models yang diizinkan untuk API Key ini
  const listReq = await fetch(`${baseUrl}/v1beta/models?key=${apiKey}`);
  if (!listReq.ok) {
    const errText = await listReq.text();
    throw new Error(`Google API menolak akses. Status: ${listReq.status}. Pesan: ${errText}`);
  }
  const listData = await listReq.json();
  const availableModels = listData.models || [];
  
  // Cari model yang mensupport generateContent dan berawalan gemini
  const validModels = availableModels
    .filter(m => m.supportedGenerationMethods?.includes('generateContent') && m.name.includes('gemini'))
    .map(m => m.name.replace('models/', '')); // name format is "models/gemini-xxx"

  if (validModels.length === 0) {
    throw new Error('API Key Anda valid, tetapi tidak memiliki akses ke model teks Gemini (Generative Language API) di region ini. Buat API Key baru di Google AI Studio.');
  }

  // 3. Coba model pertama yang tersedia
  try {
    return await tryModel(validModels[0]);
  } catch (err) {
    throw err;
  }
}



/**
 * Generate SEO optimized title, description and tags using Pollinations AI (Free)
 * @param {string} topic 
 * @returns {Promise<{title: string, description: string, tags: string}>}
 */
export async function generateGeminiMetadata(topic) {
  // We keep the function name as generateGeminiMetadata to avoid breaking other files,
  // but it now uses Pollinations AI which is 100% free and keyless!

  logEvent('INFO', 'AI Generator', `Memulai pembuatan metadata (Super SEO) untuk topik: ${topic}`);

  try {
    const promptText = `Act as an elite YouTube SEO expert.
Create highly engaging metadata for a YouTube Live about: "${topic}".

STRICT CONSTRAINTS:
1. "titles": Provide 3 different, highly clickable title variations. Under 100 characters each.
2. "description": An engaging SEO description with targeted keywords. STRICTLY UNDER 1000 characters to ensure fast response.
3. "tags": A comma-separated list of SEO tags. STRICTLY UNDER 300 characters. No '#' symbols.

Respond ONLY with a raw JSON object. Exact structure:
{
  "titles": ["Title 1", "Title 2", "Title 3"],
  "description": "Your detailed SEO description...",
  "tags": "tag1, tag2, tag3"
}`;

    // Gunakan POST request ke Pollinations menggunakan model default (gpt-4o-mini)
    const req = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: promptText }],
        jsonMode: true
      })
    });
    
    if (!req.ok) {
      const errText = await req.text();
      throw new Error(`Pollinations API Error: ${req.statusText} - ${errText}`);
    }

    let textResult = await req.text();
    textResult = textResult.trim();
    
    // Clean up markdown code blocks if the AI accidentally adds them
    if (textResult.startsWith('\`\`\`json')) {
      textResult = textResult.replace(/^\`\`\`json\n?/, '').replace(/\n?\`\`\`$/, '');
    } else if (textResult.startsWith('\`\`\`')) {
      textResult = textResult.replace(/^\`\`\`\n?/, '').replace(/\n?\`\`\`$/, '');
    }
    
    const parsed = JSON.parse(textResult);
    
    // 1. Proses Titles: Gabungkan menjadi baris baru (untuk fitur rotasi Vaimoz)
    let finalTitle = topic;
    if (Array.isArray(parsed.titles) && parsed.titles.length > 0) {
      // Pastikan setiap baris tidak lebih dari 100 karakter
      const validTitles = parsed.titles.map(t => t.length > 100 ? t.substring(0, 97) + '...' : t);
      finalTitle = validTitles.join('\n');
    } else if (parsed.title) {
      finalTitle = parsed.title.length > 100 ? parsed.title.substring(0, 97) + '...' : parsed.title;
    }

    // 2. Proses Deskripsi: Maksimal 5000 karakter
    let finalDescription = parsed.description || '';
    if (finalDescription.length > 5000) {
      finalDescription = finalDescription.substring(0, 4995) + '...';
    }

    // 3. Proses Tags: Maksimal 500 karakter
    let finalTags = parsed.tags || '';
    if (finalTags.length > 500) {
      finalTags = finalTags.substring(0, 500);
      // Potong di koma terakhir agar tag tidak terpotong setengah huruf
      const lastComma = finalTags.lastIndexOf(',');
      if (lastComma > 0) {
        finalTags = finalTags.substring(0, lastComma);
      }
    }
    
    logEvent('INFO', 'AI Generator', `Metadata Super SEO berhasil di-generate untuk topik: ${topic}`);
    
    return {
      title: finalTitle,
      description: finalDescription,
      tags: finalTags
    };
  } catch (error) {
    logEvent('ERROR', 'AI Generator', `Gagal men-generate metadata: ${error.message}`);
    throw error;
  }
}

