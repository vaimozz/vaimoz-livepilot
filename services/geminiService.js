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
 * Generate a high-CTR thumbnail using Google Gemini (Imagen 3)
 * @param {string} title 
 * @param {string} description 
 * @param {string} tags 
 * @returns {Promise<{path: string, name: string, prompt: string}>}
 */
export async function generateGeminiThumbnail(title, description, tags) {
  const { apiKey, baseUrl } = getGeminiConfig();

  if (!apiKey) {
    throw new Error('Gemini API Key belum diatur di Pengaturan.');
  }

  logEvent('INFO', 'Gemini AI', `Memulai pembuatan thumbnail untuk: ${title}`);

  try {
    // 1. Generate prompt using fallback text generation
    const promptText = `Create a highly descriptive image generation prompt for a YouTube thumbnail with high CTR. 
The image should be eye-catching, vibrant, and relevant to the following video details.
Do NOT include any text in the image prompt, as AI struggles with text. Just describe the visual scene, lighting, colors, and subject.
Make it 1-2 sentences.

Title: ${title}
Description: ${description || 'No description'}
Tags: ${tags || 'No tags'}`;

    const promptData = await generateTextWithFallback(apiKey, baseUrl, promptText);
    const imagePrompt = promptData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || `A vibrant, high-quality, eye-catching Youtube thumbnail for ${title}`;
    
    logEvent('INFO', 'Gemini AI', `Image prompt: ${imagePrompt}`);

    let base64Image = null;

    try {
      // 2. Call Imagen 3 API to generate the image
      const imagenReq = await fetch(`${baseUrl}/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: imagePrompt }],
          parameters: { sampleCount: 1, aspectRatio: "16:9" }
        })
      });

      if (!imagenReq.ok) {
        const errText = await imagenReq.text();
        throw new Error(`Imagen API error: ${imagenReq.statusText} - ${errText}`);
      }

      const imagenData = await imagenReq.json();
      base64Image = imagenData.predictions?.[0]?.bytesBase64Encoded;

      if (!base64Image) {
        throw new Error('API tidak mengembalikan data gambar.');
      }
    } catch (imagenErr) {
      logEvent('WARN', 'Gemini AI', `Imagen 3 gagal (${imagenErr.message}). Fallback ke Pollinations AI...`);
      
      // Fallback ke Pollinations AI (100% Free, no API Key, no region block)
      const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1280&height=720&nologo=true`;
      const pollReq = await fetch(pollUrl);
      
      if (!pollReq.ok) {
        throw new Error(`Pollinations API error: ${pollReq.statusText}`);
      }
      
      const buffer = await pollReq.arrayBuffer();
      base64Image = Buffer.from(buffer).toString('base64');
    }

    // 3. Save base64 image to local filesystem
    const filename = `gemini_thumb_${crypto.randomBytes(4).toString('hex')}_${Date.now()}.jpg`;
    const uploadDir = config.uploadDir || path.join(process.cwd(), 'public', 'uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, Buffer.from(base64Image, 'base64'));

    logEvent('INFO', 'Gemini AI', `Thumbnail berhasil di-generate: ${filename}`);

    return { path: filepath, name: filename, prompt: imagePrompt };
  } catch (error) {
    logEvent('ERROR', 'Gemini AI', `Gagal men-generate thumbnail: ${error.message}`);
    throw error;
  }
}

/**
 * Generate SEO optimized title, description and tags using Gemini
 * @param {string} topic 
 * @returns {Promise<{title: string, description: string, tags: string}>}
 */
export async function generateGeminiMetadata(topic) {
  const { apiKey, baseUrl } = getGeminiConfig();

  if (!apiKey) {
    throw new Error('Gemini API Key belum diatur di Pengaturan.');
  }

  logEvent('INFO', 'Gemini AI', `Memulai pembuatan metadata untuk topik: ${topic}`);

  try {
    const promptText = `Act as a YouTube SEO expert. Create a high CTR Youtube Title, Description, and Tags for a video about: "${topic}".
Respond ONLY with a valid JSON object (no markdown formatting, no backticks, just the JSON) with the following structure:
{
  "title": "A catchy title under 70 characters",
  "description": "A compelling description with keywords, a call to action, and relevant information.",
  "tags": "comma, separated, tags, relevant, to, the, video"
}`;

    const promptData = await generateTextWithFallback(apiKey, baseUrl, promptText);
    let textResult = promptData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    
    // Clean up markdown code blocks
    if (textResult.startsWith('\`\`\`json')) {
      textResult = textResult.replace(/^\`\`\`json\n?/, '').replace(/\n?\`\`\`$/, '');
    } else if (textResult.startsWith('\`\`\`')) {
      textResult = textResult.replace(/^\`\`\`\n?/, '').replace(/\n?\`\`\`$/, '');
    }
    
    const parsed = JSON.parse(textResult);
    
    logEvent('INFO', 'Gemini AI', `Metadata berhasil di-generate untuk topik: ${topic}`);
    
    return {
      title: parsed.title || topic,
      description: parsed.description || '',
      tags: parsed.tags || ''
    };
  } catch (error) {
    logEvent('ERROR', 'Gemini AI', `Gagal men-generate metadata: ${error.message}`);
    throw error;
  }
}

