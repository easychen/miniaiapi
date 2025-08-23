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
router.post('/speech', express.json({ limit: '50mb' }), async (req, res) => {
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

    // 检查是否为克隆模型（以 :clone 结尾）
    const isCloneModel = model.endsWith(':clone');
    const actualModel = isCloneModel ? model.slice(0, -6) : model; // 去除 :clone 后缀

    console.log(`[API] TTS 请求 - 模型: ${actualModel}, 克隆模式: ${isCloneModel}, 语音: ${voice}, 格式: ${response_format}`);

    let audioFile;

    if (isCloneModel) {
      // 使用克隆模式
      console.log(`[API] 使用音频克隆模式生成语音`);
      audioFile = await ttsService.synthesize(input, {
        useClone: true,
        format: response_format,
        speed: speed
      });
    } else {
      // 使用传统 macOS TTS
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
      audioFile = await ttsService.synthesize(input, {
        voice: macVoice,
        format: response_format
      });
    }

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
      temperature = 0,
      timestamp_granularities
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
    
    // 解析 timestamp_granularities 参数，默认为 ["segment"]
    let timestampGranularities = ['segment']; // OpenAI API 默认值
    if (timestamp_granularities) {
      if (Array.isArray(timestamp_granularities)) {
        timestampGranularities = timestamp_granularities;
      } else if (typeof timestamp_granularities === 'string') {
        // 处理可能的 JSON 字符串或逗号分隔的字符串
        try {
          timestampGranularities = JSON.parse(timestamp_granularities);
        } catch {
          timestampGranularities = timestamp_granularities.split(',').map(s => s.trim());
        }
      }
    }

    console.log(`[API] 时间戳粒度: ${JSON.stringify(timestampGranularities)}`);

    const inputFile = req.file.path;
    
    // 确定时间戳粒度需求
    const needWordTimestamps = timestampGranularities.includes('word');
    const needSegmentTimestamps = timestampGranularities.includes('segment');
    
    // 使用 STTService 进行识别
    const result = await sttService.transcribe(inputFile, {
      language: language,
      model: 'mlx-community/whisper-large-v3-mlx',
      word_timestamps: needWordTimestamps,
      timestamp_granularities: timestampGranularities
    });

    // 清理临时文件
    fs.unlink(inputFile, (err) => {
      if (err) console.error(`[API] 删除临时文件错误: ${err.message}`);
    });

    // 根据格式返回结果
    if (response_format === 'text') {
      res.set('Content-Type', 'text/plain');
      res.send(result.text);
    } else if (response_format === 'verbose_json') {
      // 返回详细的 JSON 格式，包含时间戳
      const verboseResult = {
        task: 'transcribe',
        language: result.language,
        duration: result.duration,
        text: result.text
      };

      // 根据请求的时间戳粒度添加相应数据
      if (needSegmentTimestamps && result.segments) {
        verboseResult.segments = result.segments;
      }
      if (needWordTimestamps && result.words) {
        verboseResult.words = result.words;
      }

      res.json(verboseResult);
    } else {
      // 标准 JSON 格式
      const response = { text: result.text };
      
      // 根据请求的时间戳粒度添加相应数据
      if (needSegmentTimestamps && result.segments) {
        response.segments = result.segments;
      }
      if (needWordTimestamps && result.words) {
        response.words = result.words;
      }
      
      res.json(response);
    }

  } catch (error) {
    console.error('[API] 语音识别错误:', error);
    
    // 清理可能存在的上传文件
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('[API] 删除临时文件错误:', err);
      });
    }

    res.status(500).json({
      error: {
        message: error.message,
        type: 'server_error',
        code: 'transcription_error'
      }
    });
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
