import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0'
  },

  // TTS 配置
  tts: {
    voice: process.env.TTS_VOICE || 'Yue',
    outputFormat: process.env.TTS_OUTPUT_FORMAT || 'mp3',
    tempDir: process.env.TTS_TEMP_DIR || '/tmp/miniAiApi',
    
    // 音频克隆配置
    clone: {
      enabled: process.env.TTS_CLONE_ENABLED === 'true',
      model: process.env.TTS_CLONE_MODEL || 'mlx-community/Spark-TTS-0.5B-16bf',
      refAudio: process.env.TTS_CLONE_REF_AUDIO || '',
      refText: process.env.TTS_CLONE_REF_TEXT || '',
      langCode: process.env.TTS_CLONE_LANG_CODE || 'z',
      speed: parseFloat(process.env.TTS_CLONE_SPEED) || 1.0
    }
  },

  // STT 配置
  stt: {
    model: process.env.STT_MODEL || 'mlx-community/whisper-large-v3-mlx',
    language: process.env.STT_LANGUAGE || 'zh',
    outputDir: process.env.STT_OUTPUT_DIR || '/tmp/whisper_output'
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },

  // API 配置
  api: {
    keyRequired: process.env.API_KEY_REQUIRED === 'true',
    key: process.env.API_KEY || 'your-api-key-here'
  },

  // LMstudio 配置
  lmstudio: {
    baseURL: process.env.LMSTUDIO_BASE_URL || 'http://127.0.0.1:1234',
    apiKey: process.env.LMSTUDIO_API_KEY || '',
    timeout: parseInt(process.env.LMSTUDIO_TIMEOUT) || 60000
  },

  // Draw Things 配置
  drawThings: {
    baseURL: process.env.DRAW_THINGS_BASE_URL || 'http://127.0.0.1:7860',
    enabled: process.env.DRAW_THINGS_ENABLED === 'true',
    timeout: parseInt(process.env.DRAW_THINGS_TIMEOUT) || 120000
  },

  // 代理配置
  proxy: {
    enabled: process.env.LOCAL_PROXY_ENABLED === 'true',
    url: process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY
  }
};

export default config;
