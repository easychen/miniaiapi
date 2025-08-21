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
    tempDir: process.env.TTS_TEMP_DIR || '/tmp/miniapi'
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
  }
};

export default config;
