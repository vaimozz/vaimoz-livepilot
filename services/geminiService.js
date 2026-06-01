import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db, logEvent } from '../db/database.js';
import { config } from '../utils/config.js';

/**
 * Generate a high-CTR thumbnail using Google Gemini (Imagen 3)
 * @param {string} title 
 * @param {string} description 
 * @param {string} tags 
 * @returns {Promise<{path: string, name: string, prompt: string}>}
 */
export async function generateGeminiThumbnail(title, description, tags) {
  // 1. Get API Key
  let apiKey = '';
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get();
    if (row && row.value) apiKey = row.value;
  } catch (e) {
    // ignore
  }

  if (!apiKey) {
    throw new Error('Gemini API Key belum diatur di Pengaturan.');
  }

  logEvent('INFO', 'Gemini AI', `Memulai pembuatan thumbnail untuk: ${title}`);

  try {
    // 2. Generate a descriptive image prompt using Gemini 1.5 Flash
    const promptReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{
            text: `Create a highly descriptive image generation prompt for a YouTube thumbnail with high CTR. 
The image should be eye-catching, vibrant, and relevant to the following video details.
Do NOT include any text in the image prompt, as AI struggles with text. Just describe the visual scene, lighting, colors, and subject.
Make it 1-2 sentences.

Title: ${title}
Description: ${description || 'No description'}
Tags: ${tags || 'No tags'}`
          }]
        }]
      })
    });

    if (!promptReq.ok) {
      throw new Error(`Gagal membuat prompt: ${promptReq.statusText}`);
    }

    const promptData = await promptReq.json();
    const imagePrompt = promptData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || `A vibrant, high-quality, eye-catching Youtube thumbnail for ${title}`;
    
    logEvent('INFO', 'Gemini AI', `Image prompt: ${imagePrompt}`);

    // 3. Call Imagen 3 API to generate the image
    const imagenReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [
          { prompt: imagePrompt }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9"
        }
      })
    });

    if (!imagenReq.ok) {
      const errText = await imagenReq.text();
      throw new Error(`Imagen API error: ${imagenReq.statusText} - ${errText}`);
    }

    const imagenData = await imagenReq.json();
    const base64Image = imagenData.predictions?.[0]?.bytesBase64Encoded;

    if (!base64Image) {
      throw new Error('API tidak mengembalikan data gambar. Pastikan project Google Cloud Anda memiliki akses ke model Imagen.');
    }

    // 4. Save base64 image to local filesystem
    const filename = `gemini_thumb_${crypto.randomBytes(4).toString('hex')}_${Date.now()}.jpg`;
    const uploadDir = config.uploadDir || path.join(process.cwd(), 'public', 'uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, Buffer.from(base64Image, 'base64'));

    logEvent('INFO', 'Gemini AI', `Thumbnail berhasil di-generate: ${filename}`);

    return {
      path: filepath,
      name: filename,
      prompt: imagePrompt
    };
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
  let apiKey = '';
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get();
    if (row && row.value) apiKey = row.value;
  } catch (e) {
    // ignore
  }

  if (!apiKey) {
    throw new Error('Gemini API Key belum diatur di Pengaturan.');
  }

  logEvent('INFO', 'Gemini AI', `Memulai pembuatan metadata untuk topik: ${topic}`);

  try {
    const promptReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{
            text: `Act as a YouTube SEO expert. Create a high CTR Youtube Title, Description, and Tags for a video about: "${topic}".
Respond ONLY with a valid JSON object (no markdown formatting, no backticks, just the JSON) with the following structure:
{
  "title": "A catchy title under 70 characters",
  "description": "A compelling description with keywords, a call to action, and relevant information.",
  "tags": "comma, separated, tags, relevant, to, the, video"
}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
        }
      })
    });

    if (!promptReq.ok) {
      const errText = await promptReq.text();
      throw new Error(`Gemini API error: ${promptReq.statusText} - ${errText}`);
    }

    const promptData = await promptReq.json();
    let textResult = promptData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    
    // Clean up markdown code blocks if Gemini returns them despite instructions
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

