# miniAPI

> Mac Mini M4 基础能力的 OpenAI 兼容 API 服务

## 概述

miniAPI 是一个专为 Mac Mini M4 设计的 AI 能力服务，将 Mac 的原生语音合成和 MLX Whisper 语音识别能力包装为 OpenAI 兼容的 API 接口。

## 功能特性

- 🎤 **Text-to-Speech (TTS)**: 使用 macOS 原生 `say` 命令进行语音合成
- 🎧 **Speech-to-Text (STT)**: 基于 MLX Whisper 的语音识别
- 🌐 **语音翻译**: 将语音转录并翻译为英文
- 🔌 **OpenAI 兼容**: 完全兼容 OpenAI Audio API 格式
- ⚡ **高性能**: 针对 Mac Mini M4 优化
- 🛡️ **安全**: 支持 API 密钥认证

## 系统要求

- macOS (推荐 macOS 14+)
- Node.js 18+
- MLX Whisper (用于语音识别)
- FFmpeg (用于音频格式转换)

## 安装

### 1. 克隆项目

```bash
git clone <repository-url>
cd miniAPI
```

### 2. 安装依赖

```bash
npm install
```

### 3. 安装系统依赖

```bash
# 安装 MLX Whisper
pip install mlx-whisper

# 安装 FFmpeg
brew install ffmpeg
```

### 4. 配置环境

```bash
cp .env.example .env
```

编辑 `.env` 文件配置你的设置：

```env
# 服务器配置
PORT=3000
HOST=0.0.0.0

# TTS 配置
TTS_VOICE=Yue
TTS_OUTPUT_FORMAT=mp3

# STT 配置
STT_MODEL=mlx-community/whisper-large-v3-mlx
STT_LANGUAGE=zh

# API 安全
API_KEY_REQUIRED=false
API_KEY=your-api-key-here
```

## 使用方法

### 启动服务

```bash
# 生产环境
npm start

# 开发环境（自动重启）
npm run dev
```

服务启动后，访问 http://localhost:3000 查看 API 信息。

### API 接口

#### 1. 语音合成 (TTS)

```bash
curl -X POST http://localhost:3000/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1",
    "input": "你好，这是一个测试。",
    "voice": "alloy",
    "response_format": "mp3"
  }' \
  --output speech.mp3
```

**支持的语音**:
- `alloy` → Yue (粤语)
- `echo` → Ting-Ting (中文)
- `fable` → Sin-ji (中文)
- `onyx` → Li-mu (中文)
- `nova` → Mei-Jia (中文)
- `shimmer` → Yu-shu (中文)

#### 2. 语音识别 (STT)

```bash
curl -X POST http://localhost:3000/v1/audio/transcriptions \
  -H "Content-Type: multipart/form-data" \
  -F file="@audio.mp3" \
  -F model="whisper-1" \
  -F language="zh"
```

#### 3. 语音翻译

```bash
curl -X POST http://localhost:3000/v1/audio/translations \
  -H "Content-Type: multipart/form-data" \
  -F file="@audio.mp3" \
  -F model="whisper-1"
```

#### 4. 获取模型信息

```bash
curl http://localhost:3000/v1/models
```

#### 5. 健康检查

```bash
curl http://localhost:3000/health
```

## 配置选项

### TTS 配置

- `TTS_VOICE`: 默认语音 (默认: Yue)
- `TTS_OUTPUT_FORMAT`: 输出格式 (mp3/wav)
- `TTS_TEMP_DIR`: 临时文件目录

### STT 配置

- `STT_MODEL`: Whisper 模型 (默认: mlx-community/whisper-large-v3-mlx)
- `STT_LANGUAGE`: 识别语言 (zh/en/auto 等)
- `STT_OUTPUT_DIR`: 输出目录

### 可用的 Whisper 模型

- `mlx-community/whisper-tiny`
- `mlx-community/whisper-base`
- `mlx-community/whisper-small`
- `mlx-community/whisper-medium`
- `mlx-community/whisper-large-v2`
- `mlx-community/whisper-large-v3`
- `mlx-community/whisper-large-v3-mlx`
- `mlx-community/whisper-large-v3-turbo`

## 开发

### 项目结构

```
miniAPI/
├── src/
│   ├── index.js              # 主服务器文件
│   ├── config/
│   │   └── default.js        # 配置管理
│   ├── services/
│   │   ├── ttsService.js     # TTS 服务
│   │   └── sttService.js     # STT 服务
│   ├── routes/
│   │   └── audioRoutes.js    # 音频 API 路由
│   └── middleware/
│       └── auth.js           # 认证中间件
├── config/
├── public/
├── .env.example
├── package.json
└── README.md
```

### 添加新功能

1. 在 `src/services/` 中添加新的服务类
2. 在 `src/routes/` 中添加对应的路由
3. 在 `src/index.js` 中注册路由
4. 更新配置文件和文档

## 错误处理

API 使用标准的 HTTP 状态码和 OpenAI 兼容的错误格式：

```json
{
  "error": {
    "message": "错误描述",
    "type": "error_type",
    "code": "error_code"
  }
}
```

## 性能优化

- 临时文件自动清理（每小时）
- 支持并发请求处理
- 针对 Mac Mini M4 的 MLX 优化
- 音频格式自动转换

## 安全注意事项

- 生产环境建议启用 API 密钥认证
- 限制文件上传大小（默认 50MB）
- 定期清理临时文件
- 使用 HTTPS（需要配置 SSL 证书）

## 故障排除

### 常见问题

1. **TTS 不工作**
   - 检查 macOS 语音是否可用: `say -v ?`
   - 确保 FFmpeg 已安装

2. **STT 不工作**
   - 检查 MLX Whisper 是否安装: `which mlx_whisper`
   - 确保模型已下载

3. **文件上传失败**
   - 检查文件大小是否超限
   - 确保音频格式受支持

### 日志查看

服务会输出详细的日志信息，包括：
- 请求处理时间
- 错误堆栈跟踪
- 服务状态检查

## 许可证

MIT License

## 贡献

欢迎提交 Issues 和 Pull Requests！

## 更新日志

### v1.0.0
- 初始版本发布
- 支持 TTS、STT 和翻译功能
- OpenAI API 兼容
- Mac Mini M4 优化
