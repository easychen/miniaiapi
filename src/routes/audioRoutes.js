import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import TTSService from '../services/ttsService.js';
import STTService from '../services/sttService.js';

const execAsync = promisify(exec);

const router = express.Router();

// 配置 multer 用于文件上传
const upload = multer({ 
  dest: '/tmp/uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB 限制
  }
});

// 初始化服务
const ttsService = new TTSService();
const sttService = new STTService();

/**
 * OpenAI 兼容的 TTS 接口
 * POST /v1/audio/speech
 */
router.post('/speech', express.json(), async (req, res) => {
  try {
    const { 
      model = 'tts-1',
      input,
      voice = 'alloy',
      response_format = 'mp3',
      speed = 1.0
    } = req.body;

    if (!input) {
      return res.status(400).json({
        error: {
          message: 'Missing required parameter: input',
          type: 'invalid_request_error',
          code: 'missing_required_parameter'
        }
      });
    }

    console.log(`[API] TTS 请求 - 模型: ${model}, 语音: ${voice}, 格式: ${response_format}`);

    // 映射 OpenAI 语音到 macOS 语音
    const voiceMapping = {
      'alloy': 'Yue',
      'echo': 'Ting-Ting',
      'fable': 'Sin-ji',
      'onyx': 'Li-mu',
      'nova': 'Mei-Jia',
      'shimmer': 'Yu-shu'
    };

    const macVoice = voiceMapping[voice] || 'Yue';
    
    // 生成语音
    const audioFile = await ttsService.synthesize(input, {
      voice: macVoice,
      format: response_format
    });

    // 设置响应头
    const mimeType = response_format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="speech.${response_format}"`
    });

    // 发送文件并清理
    res.sendFile(audioFile, (err) => {
      if (err) {
        console.error(`[API] 发送音频文件失败: ${err.message}`);
      }
      
      // 清理临时文件
      setTimeout(() => {
        fs.unlink(audioFile, (unlinkErr) => {
          if (unlinkErr) {
            console.error(`[API] 清理音频文件失败: ${unlinkErr.message}`);
          } else {
            console.log(`[API] 已清理音频文件: ${audioFile}`);
          }
        });
      }, 1000); // 延迟1秒删除，确保文件发送完成
    });

  } catch (error) {
    console.error(`[API] TTS 错误: ${error.message}`);
    res.status(500).json({
      error: {
        message: error.message,
        type: 'server_error',
        code: 'tts_error'
      }
    });
  }
});

/**
 * OpenAI 兼容的 STT 接口
 * POST /v1/audio/transcriptions
 */
router.post('/transcriptions', upload.single('file'), async (req, res) => {
  try {
    const {
      model = 'whisper-1',
      language = 'zh',
      prompt,
      response_format = 'json',
      temperature = 0
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        error: {
          message: 'Missing required parameter: file',
          type: 'invalid_request_error',
          code: 'missing_required_parameter'
        }
      });
    }

    console.log(`[API] STT 请求 - 模型: ${model}, 语言: ${language}, 格式: ${response_format}`);

    const inputFile = req.file.path;
    const outputDir = '/tmp/whisper_output/';
    
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 调用 mlx_whisper 进行语音识别 (直接使用原始API的方式)
    const command = `TRANSFORMERS_OFFLINE=1 mlx_whisper --model=mlx-community/whisper-large-v3-mlx --output-format=json --output-dir=${outputDir} --language=${language} "${inputFile}"`;
    
    console.log(`[API] 执行命令: ${command}`);
    
    await execAsync(command);
    
    // 读取生成的 JSON 文件
    const jsonFile = `${outputDir}${req.file.filename}.json`;
    const result = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

    // 清理临时文件
    fs.unlink(inputFile, (err) => {
      if (err) console.error(`[API] 删除临时文件错误: ${err.message}`);
    });
    fs.unlink(jsonFile, (err) => {
      if (err) console.error(`[API] 删除 JSON 文件错误: ${err.message}`);
    });

    // 返回识别结果（与原始API一致）
    res.json({ text: result.text });

  } catch (error) {
    console.error('[API] 语音识别错误:', error);
    
    // 清理可能存在的上传文件
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('[API] 删除临时文件错误:', err);
      });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * OpenAI 兼容的翻译接口
 * POST /v1/audio/translations
 */
router.post('/translations', upload.single('file'), async (req, res) => {
  try {
    const {
      model = 'whisper-1',
      prompt,
      response_format = 'json',
      temperature = 0
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        error: {
          message: 'Missing required parameter: file',
          type: 'invalid_request_error',
          code: 'missing_required_parameter'
        }
      });
    }

    console.log(`[API] 翻译请求 - 模型: ${model}, 格式: ${response_format}`);

    const audioFile = req.file.path;
    
    // 执行语音识别（翻译到英文）
    const result = await sttService.transcribe(audioFile, {
      language: 'en', // 翻译总是输出英文
      model: 'mlx-community/whisper-large-v3-mlx'
    });

    // 清理上传的文件
    fs.unlink(audioFile, (err) => {
      if (err) console.error(`[API] 清理上传文件失败: ${err.message}`);
    });

    // 返回结果
    if (response_format === 'text') {
      res.set('Content-Type', 'text/plain');
      res.send(result.text);
    } else {
      res.json({
        text: result.text
      });
    }

  } catch (error) {
    console.error(`[API] 翻译错误: ${error.message}`);
    
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error(`[API] 清理失败文件失败: ${err.message}`);
      });
    }

    res.status(500).json({
      error: {
        message: error.message,
        type: 'server_error',
        code: 'translation_error'
      }
    });
  }
});

// 辅助函数：格式化时间为 SRT 格式
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

export default router;
