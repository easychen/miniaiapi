import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { HttpsProxyAgent } from 'https-proxy-agent';

// 导入配置和服务
import config from '../config/default.js';
import audioRoutes from './routes/audioRoutes.js';
import imageRoutes from './routes/imageRoutes.js';
import { authenticateApiKey, requestLogger, errorHandler } from './middleware/auth.js';
import TTSService from './services/ttsService.js';
import STTService from './services/sttService.js';

// ES 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 获取代理配置
const httpsAgent = config.proxy.enabled && config.proxy.url ? new HttpsProxyAgent(config.proxy.url) : null;

// 判断是否为本地地址
function isLocalAddress(url) {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname === '0.0.0.0' || 
         hostname.startsWith('192.168.') ||
         hostname.startsWith('10.') ||
         hostname.startsWith('172.');
}

// 获取适当的代理 agent
function getProxyAgent(targetUrl) {
  // 如果代理未启用，返回 false (不使用代理)
  if (!config.proxy.enabled) {
    return false;
  }
  
  // 如果目标是本地地址，不使用代理
  if (isLocalAddress(targetUrl)) {
    return false;
  }
  
  // 其他情况使用配置的代理
  return httpsAgent;
}

// 基础中间件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));



// 请求日志
app.use(requestLogger);

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// API 路由
app.use('/v1/audio', authenticateApiKey, audioRoutes);
app.use('/v1/images', authenticateApiKey, imageRoutes);


// 代理中间件 - 将其他 /v1/* 请求转发到 LMStudio
app.use('/v1', authenticateApiKey, createProxyMiddleware({
  target: `${config.lmstudio.baseURL}/v1`,
  changeOrigin: true,
  pathRewrite: {
    '^/v1': '/v1'
  },
  timeout: config.lmstudio.timeout,
  proxyTimeout: config.lmstudio.timeout,
  agent: getProxyAgent(config.lmstudio.baseURL),
  // 让代理库处理请求体流
  selfHandleResponse: false,
  onProxyReq: (proxyReq, req) => {
    console.log(`[代理] ${req.method} ${req.path} -> ${config.lmstudio.baseURL}/v1${req.path}`);
    
    // 处理认证头
    if (req.headers['authorization']) {
      proxyReq.setHeader('authorization', req.headers['authorization']);
    }
    // 如果配置了 LMstudio API Key，则添加到请求头
    if (config.lmstudio.apiKey) {
      proxyReq.setHeader('authorization', `Bearer ${config.lmstudio.apiKey}`);
    }
  },
  onProxyRes: (proxyRes, req) => {
    console.log(`[代理] ${req.method} ${req.path} - ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error('[代理] 错误:', err.message);
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          message: 'LMStudio 代理请求失败',
          type: 'proxy_error',
          code: 'lmstudio_unavailable'
        }
      });
    }
  }
}));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      tts: 'available',
      stt: 'available'
    }
  });
});



// 根路径返回 API 信息
app.get('/', (req, res) => {
  res.json({
    name: 'miniAiApi',
    description: 'Mac Mini M4 基础能力的 OpenAI 兼容 API 服务',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      models: '/v1/models',
      tts: '/v1/audio/speech',
      stt: '/v1/audio/transcriptions',
      translation: '/v1/audio/translations',
      chat: '/v1/chat/completions',
      embeddings: '/v1/embeddings',
      images: '/v1/images/generations'
    },
    documentation: 'https://platform.openai.com/docs/api-reference/audio',
    powered_by: 'Mac Mini M4 + MLX'
  });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
      type: 'not_found_error',
      code: 'endpoint_not_found'
    }
  });
});

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
const PORT = config.server.port;
const HOST = config.server.host;

app.listen(PORT, HOST, async () => {
  console.log(`
╭─────────────────────────────────────────────╮
│                  miniAiApi                    │
│         Mac Mini M4 AI 能力服务             │
├─────────────────────────────────────────────┤
│ 🚀 服务器启动成功                            │
│ 📡 地址: http://${HOST}:${PORT}                │
│ 📖 文档: http://${HOST}:${PORT}/              │
│ 🔍 健康检查: http://${HOST}:${PORT}/health     │
├─────────────────────────────────────────────┤
│ 🎤 TTS (Text-to-Speech)                     │
│    POST /v1/audio/speech                    │
│ 🎧 STT (Speech-to-Text)                     │
│    POST /v1/audio/transcriptions            │
│ 🌐 Translation                              │
│    POST /v1/audio/translations              │
│ 🤖 Chat Completion (代理到 LMStudio)        │
│    POST /v1/chat/completions                │
│ 🔗 Embeddings (代理到 LMStudio)             │
│    POST /v1/embeddings                      │
│ 🎨 Image Generation (Draw Things)           │
│    POST /v1/images/generations              │
│    其他 /v1/* 请求 -> ${config.lmstudio.baseURL.replace('http://', '')}        │
╰─────────────────────────────────────────────╯
  `);

  // 检查服务可用性
  const ttsService = new TTSService();
  const sttService = new STTService();
  
  console.log('🔧 检查服务状态...');
  
  try {
    const voices = await ttsService.getAvailableVoices();
    console.log(`✅ TTS 服务可用 (${voices.length} 个语音)`);
  } catch (error) {
    console.log('❌ TTS 服务不可用:', error.message);
  }
  
  try {
    const sttAvailable = await sttService.checkAvailability();
    if (sttAvailable) {
      console.log('✅ STT 服务可用 (mlx_whisper)');
    } else {
      console.log('❌ STT 服务不可用: mlx_whisper 未安装');
    }
  } catch (error) {
    console.log('❌ STT 服务检查失败:', error.message);
  }
  
  // 定期清理临时文件
  setInterval(async () => {
    try {
      await ttsService.cleanupTempFiles();
      await sttService.cleanupTempFiles();
    } catch (error) {
      console.error('清理临时文件失败:', error.message);
    }
  }, 3600000); // 每小时清理一次
  
  console.log('🎉 miniAiApi 服务启动完成！');
});
