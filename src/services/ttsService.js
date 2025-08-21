import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import config from '../../config/default.js';

const execAsync = promisify(exec);

export class TTSService {
  constructor() {
    this.voice = config.tts.voice;
    this.outputFormat = config.tts.outputFormat;
    this.tempDir = config.tts.tempDir;
    
    // 确保临时目录存在
    this.ensureTempDir();
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 清理输入文本，移除 markdown 标记并规范化
   * @param {string} text - 输入文本
   * @returns {string} 清理后的文本
   */
  cleanText(text) {
    return text
      .replace(/[*_~`#\[\]]/g, '')  // 移除 markdown 标记
      .replace(/\s+/g, ' ')         // 多个空格合并为一个
      .replace(/"/g, '\\"')         // 转义双引号
      .replace(/'/g, "'\\''")       // 转义单引号
      .replace(/\-/g, '\\-')        // 转义破折号
      .replace(/\$/g, '\\$')        // 转义美元符号
      .replace(/`/g, '\\`')         // 转义反引号
      .trim();                      // 去除首尾空格
  }

  /**
   * 生成语音文件
   * @param {string} text - 要转换的文本
   * @param {Object} options - 可选参数
   * @returns {Promise<string>} 生成的音频文件路径
   */
  async synthesize(text, options = {}) {
    const voice = options.voice || this.voice;
    const format = options.format || this.outputFormat;
    
    const cleanedText = this.cleanText(text);
    const timestamp = Date.now();
    const tempAiff = path.join(this.tempDir, `speech_${timestamp}.aiff`);
    const finalFile = path.join(this.tempDir, `speech_${timestamp}.${format}`);

    try {
      console.log(`[TTS] 开始生成语音文件: ${voice} 语音`);
      console.log(`[TTS] 文本内容: ${cleanedText.substring(0, 100)}...`);
      
      // 使用 macOS say 命令生成 AIFF 文件
      await execAsync(`say -v "${voice}" -o "${tempAiff}" "${cleanedText}"`);
      console.log(`[TTS] AIFF 文件生成完成: ${tempAiff}`);
      
      if (format === 'mp3') {
        // 使用 ffmpeg 转换为 MP3
        await execAsync(`ffmpeg -i "${tempAiff}" "${finalFile}"`);
        console.log(`[TTS] MP3 文件转换完成: ${finalFile}`);
        
        // 删除临时 AIFF 文件
        fs.unlink(tempAiff, (err) => {
          if (err) console.error(`[TTS] 删除临时文件失败: ${err.message}`);
        });
        
        return finalFile;
      } else {
        // 如果不需要转换，直接返回 AIFF 文件
        return tempAiff;
      }
      
    } catch (error) {
      console.error(`[TTS] 语音合成失败: ${error.message}`);
      
      // 清理可能存在的临时文件
      [tempAiff, finalFile].forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlink(file, (err) => {
            if (err) console.error(`[TTS] 清理文件失败: ${err.message}`);
          });
        }
      });
      
      throw new Error(`语音合成失败: ${error.message}`);
    }
  }

  /**
   * 获取可用的语音列表
   * @returns {Promise<Array>} 可用语音列表
   */
  async getAvailableVoices() {
    try {
      const { stdout } = await execAsync('say -v ?');
      const voices = stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const parts = line.split(/\s+/);
          const name = parts[0];
          const language = parts[1];
          const description = parts.slice(2).join(' ');
          return { name, language, description };
        });
      
      return voices;
    } catch (error) {
      console.error(`[TTS] 获取语音列表失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 清理过期的临时文件
   * @param {number} maxAge - 最大文件年龄（毫秒）
   */
  async cleanupTempFiles(maxAge = 3600000) { // 默认1小时
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`[TTS] 清理过期文件失败: ${err.message}`);
            } else {
              console.log(`[TTS] 已清理过期文件: ${file}`);
            }
          });
        }
      }
    } catch (error) {
      console.error(`[TTS] 清理临时文件失败: ${error.message}`);
    }
  }
}

export default TTSService;
