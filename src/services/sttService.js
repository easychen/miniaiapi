import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import config from '../../config/default.js';

const execAsync = promisify(exec);

export class STTService {
  constructor() {
    this.model = config.stt.model;
    this.language = config.stt.language;
    this.outputDir = config.stt.outputDir;
    
    // 确保输出目录存在
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 语音转文字
   * @param {string} audioFilePath - 音频文件路径
   * @param {Object} options - 可选参数
   * @returns {Promise<Object>} 识别结果
   */
  async transcribe(audioFilePath, options = {}) {
    const model = options.model || this.model;
    const language = options.language || this.language;
    const outputDir = options.outputDir || this.outputDir;
    
    try {
      console.log(`[STT] 开始语音识别: ${audioFilePath}`);
      console.log(`[STT] 使用模型: ${model}`);
      console.log(`[STT] 识别语言: ${language}`);

      // 构建 mlx_whisper 命令
      const command = [
        'TRANSFORMERS_OFFLINE=1',
        'mlx_whisper',
        `--model=${model}`,
        '--output-format=json',
        `--output-dir=${outputDir}`,
        `--language=${language}`,
        `"${audioFilePath}"`
      ].join(' ');

      console.log(`[STT] 执行命令: ${command}`);
      
      await execAsync(command);
      
      // 构建输出文件路径
      const audioFileName = path.basename(audioFilePath, path.extname(audioFilePath));
      const jsonFilePath = path.join(outputDir, `${audioFileName}.json`);
      
      console.log(`[STT] 查找结果文件: ${jsonFilePath}`);
      
      if (!fs.existsSync(jsonFilePath)) {
        throw new Error(`识别结果文件不存在: ${jsonFilePath}`);
      }
      
      // 读取识别结果
      const resultContent = fs.readFileSync(jsonFilePath, 'utf8');
      const result = JSON.parse(resultContent);
      
      console.log(`[STT] 识别完成，文本长度: ${result.text?.length || 0}`);
      
      // 清理结果文件
      fs.unlink(jsonFilePath, (err) => {
        if (err) {
          console.error(`[STT] 清理结果文件失败: ${err.message}`);
        } else {
          console.log(`[STT] 已清理结果文件: ${jsonFilePath}`);
        }
      });
      
      return {
        text: result.text || '',
        segments: result.segments || [],
        language: result.language || language,
        duration: result.duration || 0
      };
      
    } catch (error) {
      console.error(`[STT] 语音识别失败: ${error.message}`);
      throw new Error(`语音识别失败: ${error.message}`);
    }
  }

  /**
   * 检查 mlx_whisper 是否可用
   * @returns {Promise<boolean>} 是否可用
   */
  async checkAvailability() {
    try {
      await execAsync('which mlx_whisper');
      console.log('[STT] mlx_whisper 可用');
      return true;
    } catch (error) {
      console.error('[STT] mlx_whisper 不可用，请确保已安装 mlx-whisper');
      return false;
    }
  }

  /**
   * 获取支持的音频格式
   * @returns {Array<string>} 支持的格式列表
   */
  getSupportedFormats() {
    return [
      'wav', 'mp3', 'flac', 'ogg', 'wma', 'aac', 'm4a', 'mp4', 'avi', 'mov', 'webm'
    ];
  }

  /**
   * 验证音频文件格式
   * @param {string} filePath - 文件路径
   * @returns {boolean} 是否支持
   */
  isSupportedFormat(filePath) {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    return this.getSupportedFormats().includes(ext);
  }

  /**
   * 获取可用的模型列表
   * @returns {Array<string>} 模型列表
   */
  getAvailableModels() {
    return [
      'mlx-community/whisper-tiny',
      'mlx-community/whisper-tiny-en',
      'mlx-community/whisper-base',
      'mlx-community/whisper-base-en',
      'mlx-community/whisper-small',
      'mlx-community/whisper-small-en',
      'mlx-community/whisper-medium',
      'mlx-community/whisper-medium-en',
      'mlx-community/whisper-large-v2',
      'mlx-community/whisper-large-v3',
      'mlx-community/whisper-large-v3-mlx',
      'mlx-community/whisper-large-v3-turbo'
    ];
  }

  /**
   * 获取支持的语言列表
   * @returns {Array<Object>} 语言列表
   */
  getSupportedLanguages() {
    return [
      { code: 'zh', name: '中文' },
      { code: 'en', name: 'English' },
      { code: 'ja', name: '日本語' },
      { code: 'ko', name: '한국어' },
      { code: 'es', name: 'Español' },
      { code: 'fr', name: 'Français' },
      { code: 'de', name: 'Deutsch' },
      { code: 'ru', name: 'Русский' },
      { code: 'ar', name: 'العربية' },
      { code: 'auto', name: 'Auto Detect' }
    ];
  }

  /**
   * 清理过期的临时文件
   * @param {number} maxAge - 最大文件年龄（毫秒）
   */
  async cleanupTempFiles(maxAge = 3600000) { // 默认1小时
    try {
      const files = fs.readdirSync(this.outputDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.outputDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`[STT] 清理过期文件失败: ${err.message}`);
            } else {
              console.log(`[STT] 已清理过期文件: ${file}`);
            }
          });
        }
      }
    } catch (error) {
      console.error(`[STT] 清理临时文件失败: ${error.message}`);
    }
  }
}

export default STTService;
