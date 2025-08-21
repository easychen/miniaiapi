# MiniAiApi

[中文](README.md) | **English**

> OpenAI-compatible API optimized for M-series Macs

![](res/logo.png)

## Overview

MiniAiApi is an AI capability service optimized for M-series chip Macs, especially Mac Mini. It attempts to leverage Mac ecosystem-supported software and frameworks (MLX) to provide the highest performance OpenAI-compatible API interfaces.

## Features

- 🎤 **Text-to-Speech (TTS)**: Speech synthesis using macOS native `say` command
- 🎵 **Voice Cloning**: High-quality audio cloning technology based on MLX-Audio and SparkTTS
- 🎧 **Speech-to-Text (STT)**: Speech recognition based on MLX Whisper
- 🤖 **Chat Completion**: Proxy forwarding to LMstudio chat interface
- 🔗 **Embeddings**: Proxy forwarding to LMstudio embedding model interface
- 🎨 **Image Generation**: Integrated Draw Things Mac App for AI drawing
- 🔌 **OpenAI Compatible**: Fully compatible with OpenAI API format
- ⚡ **High Performance**: Optimized for M-series Macs
- 🛡️ **Secure**: Supports API key authentication

## API Support Status

| API Endpoint | Status | Description | Dependencies |
|-------------|--------|-------------|-------------|
| `/v1/audio/speech` | ✅ Available | TTS speech synthesis (traditional + cloning) | macOS `say` / MLX-Audio |
| `/v1/audio/transcriptions` | ✅ Available | Speech to text | MLX Whisper |
| `/v1/audio/translations` | ✅ Available | Speech translation to English | MLX Whisper |
| `/v1/chat/completions` | ✅ Available | Chat completion | LMstudio |
| `/v1/embeddings` | ✅ Available | Text embeddings | LMstudio |
| `/v1/images/generations` | ✅ Available | Image generation | Draw Things |
| `/v1/models` | ✅ Available | Get model list | - |
| `/health` | ✅ Available | Health check | - |

> **Note**: 
> - ✅ indicates implemented and available APIs
> - Some APIs require additional dependency services to work properly
> - All APIs are compatible with OpenAI request and response formats

## System Requirements

- macOS (Recommended macOS 14+)
- Node.js 18+
- MLX Whisper (for speech recognition)
- MLX-Audio (for audio cloning, optional)
- FFmpeg (for audio format conversion)
- LMstudio (for chat and embedding functions)
- Draw Things Mac App (for image generation, optional)

## Installation

### 1. Clone the Project

```bash
git clone <repository-url>
cd miniAiApi
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install System Dependencies

```bash
# Install MLX Whisper
pip install mlx-whisper

# Install MLX-Audio (optional, for audio cloning)
pip install mlx-audio

# Install FFmpeg
brew install ffmpeg

# Install and configure LMstudio
# 1. Download and install LMstudio from the official website
# 2. Start LMstudio, enable API Server in settings
# 3. Set listening address to 127.0.0.1:1234 (default)

# Install and configure Draw Things (optional)
# 1. Install Draw Things from App Store
# 2. Enable HTTP API Server in Settings → Advanced Settings
# 3. Set listening address to 127.0.0.1:7860 (default)
```

### 4. Pre-download Models (Optional)

It's recommended to pre-download models to avoid waiting on first use:

```bash
# Install Hugging Face CLI (if not already installed)
pip install huggingface_hub

# Download whisper
hf download mlx-community/whisper-large-v3-mlx (Large model has better Chinese recognition)

# Download recommended Chinese TTS models
hf download mlx-community/Spark-TTS-0.5B-fp16
hf download mlx-community/Spark-TTS-0.5B-4-6bit (backup, worse cloning effect but faster)

# Download other available models (optional)
hf download mlx-community/Kokoro-82M-bf16 (poor Chinese support, good for other languages)
```

> **Note**: Model downloads may take several minutes to tens of minutes, depending on network speed. Use the `hf download` command to see download progress.

### 5. Configure Environment

```bash
cp env.example .env
```

Edit the `.env` file to configure your settings:

```env
# Server configuration
PORT=3000
HOST=0.0.0.0

# TTS configuration
TTS_VOICE=Yue
TTS_OUTPUT_FORMAT=mp3

# TTS audio cloning configuration (optional)
TTS_CLONE_ENABLED=false
TTS_CLONE_MODEL=mlx-community/Spark-TTS-0.5B-fp16
TTS_CLONE_REF_AUDIO=/path/to/reference/audio.mp3
TTS_CLONE_REF_TEXT=Reference text content corresponding to the audio
TTS_CLONE_LANG_CODE=z
TTS_CLONE_SPEED=1.0

# STT configuration
STT_MODEL=mlx-community/whisper-large-v3-mlx
STT_LANGUAGE=zh

# API security
API_KEY_REQUIRED=false
API_KEY=your-api-key-here

# LMstudio configuration
LMSTUDIO_BASE_URL=http://127.0.0.1:1234
LMSTUDIO_API_KEY=
LMSTUDIO_TIMEOUT=60000

# Draw Things configuration
DRAW_THINGS_BASE_URL=http://127.0.0.1:7860
DRAW_THINGS_ENABLED=false
DRAW_THINGS_TIMEOUT=120000
```

## Audio Cloning Configuration Example

### Complete Configuration Steps

1. **Enable audio cloning feature**
   ```env
   TTS_CLONE_ENABLED=true
   ```

2. **Select and download model**
   ```bash
   # Recommended: High-quality Chinese model
   hf download mlx-community/Spark-TTS-0.5B-fp16
   
   # Or: Quantized version (uses less memory)
   hf download mlx-community/Spark-TTS-0.5B-4-6bit
   ```

3. **Configure model and reference audio**
   ```env
   TTS_CLONE_MODEL=mlx-community/Spark-TTS-0.5B-fp16
   TTS_CLONE_REF_AUDIO=/Users/yourname/audio/reference.mp3
   TTS_CLONE_REF_TEXT=This is the complete content spoken by the speaker in the reference audio, which must match the audio content exactly.
   TTS_CLONE_LANG_CODE=z
   TTS_CLONE_SPEED=1.0
   ```

4. **Prepare reference audio**
   - High audio quality with minimal background noise
   - Recommended duration: 10-30 seconds
   - Supported formats: MP3, WAV, M4A, etc.
   - Reference text must match audio content exactly

### Test Configuration

After configuration, you can test with the following commands:

```bash
# Test traditional TTS
curl -X POST http://localhost:3000/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"model": "tts-1", "input": "Test traditional speech synthesis"}' \
  --output test_normal.mp3

# Test audio cloning
curl -X POST http://localhost:3000/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"model": "tts-1:clone", "input": "Test audio cloning functionality"}' \
  --output test_clone.mp3
```

## Usage

### Start Service

```bash
# Production environment
npm start

# Development environment (auto-restart)
npm run dev
```

After the service starts, visit http://localhost:3000 to view API information.

### API Interfaces

#### 1. Text-to-Speech (TTS)

##### Traditional TTS (using macOS system voices)

```bash
curl -X POST http://localhost:3000/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1",
    "input": "Hello, this is a test.",
    "voice": "alloy",
    "response_format": "mp3"
  }' \
  --output speech.mp3
```

**Supported Voices**:
- `alloy` → Yue (Chinese)
- `echo` → Ting-Ting (Chinese)
- `fable` → Sin-ji (Chinese)
- `onyx` → Li-mu (Chinese)
- `nova` → Mei-Jia (Chinese)
- `shimmer` → Yu-shu (Chinese)

##### Audio Cloning TTS (using MLX-Audio)

To use audio cloning functionality, simply add the `:clone` suffix to the model name:

```bash
curl -X POST http://localhost:3000/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1:clone",
    "input": "Actually, model hallucination is not a big problem. Rather, believing in the knowledge from probability model pre-training is like climbing a tree to catch fish. The core of the model should be strong reasoning ability, then import trusted context, and derive answers through reasoning ability.",
    "voice": "alloy",
    "response_format": "mp3",
    "speed": 1.5
  }' \
  --output cloned_speech.mp3
```

> **Note**: 
> - Before using clone mode, you need to configure `TTS_CLONE_ENABLED=true` and related parameters in `.env`
> - You need to provide a reference audio file and corresponding reference text
> - Clone mode ignores the `voice` parameter and uses the configured reference audio for voice cloning

#### 2. Speech-to-Text (STT)

```bash
curl -X POST http://localhost:3000/v1/audio/transcriptions \
  -H "Content-Type: multipart/form-data" \
  -F file="@audio.mp3" \
  -F model="whisper-1" \
  -F language="zh"
```

#### 3. Speech Translation

```bash
curl -X POST http://localhost:3000/v1/audio/translations \
  -H "Content-Type: multipart/form-data" \
  -F file="@audio.mp3" \
  -F model="whisper-1"
```

#### 4. Get Model Information

```bash
curl http://localhost:3000/v1/models
```

#### 5. Chat Completion

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```

#### 6. Text Embeddings

```bash
curl -X POST http://localhost:3000/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "text-embedding-ada-002",
    "input": "This is a text that needs to be vectorized"
  }'
```

#### 7. Image Generation

```bash
curl -X POST http://localhost:3000/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "prompt": "A cute kitten playing in the garden",
    "n": 1,
    "size": "1024x1024",
    "quality": "standard",
    "style": "vivid"
  }'
```

#### 8. Health Check

```bash
curl http://localhost:3000/health
```

## Configuration Options

### TTS Configuration

- `TTS_VOICE`: Default voice (default: Yue)
- `TTS_OUTPUT_FORMAT`: Output format (mp3/wav)
- `TTS_TEMP_DIR`: Temporary file directory

### TTS Audio Cloning Configuration

- `TTS_CLONE_ENABLED`: Whether to enable audio cloning functionality (default: false)
- `TTS_CLONE_MODEL`: MLX-Audio model name (default: mlx-community/Spark-TTS-0.5B-fp16)
- `TTS_CLONE_REF_AUDIO`: Reference audio file path (required, used for voice cloning)
- `TTS_CLONE_REF_TEXT`: Text content corresponding to reference audio (required, used for model alignment)
- `TTS_CLONE_LANG_CODE`: Language code (default: z, for Chinese)
- `TTS_CLONE_SPEED`: Speech speed (default: 1.0, range 0.5-2.0)

**Recommended MLX-Audio Models**:
- `mlx-community/Spark-TTS-0.5B-fp16` - High-quality Chinese TTS model (recommended)
- `mlx-community/Spark-TTS-0.5B-4-6bit` - Quantized version, uses less memory
- `mlx-community/Kokoro-82M-bf16` - Lightweight model with multilingual support

**Language Code Description**:
- `z` - Chinese (recommended for Chinese text)
- `a` - American English
- `b` - British English
- `j` - Japanese

### STT Configuration

- `STT_MODEL`: Whisper model (default: mlx-community/whisper-large-v3-mlx)
- `STT_LANGUAGE`: Recognition language (zh/en/auto etc.)
- `STT_OUTPUT_DIR`: Output directory

### LMstudio Configuration

- `LMSTUDIO_BASE_URL`: LMstudio service address (default: http://127.0.0.1:1234)
- `LMSTUDIO_API_KEY`: LMstudio API key (optional)
- `LMSTUDIO_TIMEOUT`: Request timeout (default: 60000ms)

### Draw Things Configuration

- `DRAW_THINGS_BASE_URL`: Draw Things HTTP API address (default: http://127.0.0.1:7860)
- `DRAW_THINGS_ENABLED`: Whether to enable image generation functionality (default: false)
- `DRAW_THINGS_TIMEOUT`: Request timeout (default: 120000ms)

### Available Whisper Models

- `mlx-community/whisper-tiny`
- `mlx-community/whisper-base`
- `mlx-community/whisper-small`
- `mlx-community/whisper-medium`
- `mlx-community/whisper-large-v2`
- `mlx-community/whisper-large-v3`
- `mlx-community/whisper-large-v3-mlx`
- `mlx-community/whisper-large-v3-turbo`

## Development

### Project Structure

```
miniAiApi/
├── src/
│   ├── index.js              # Main server file
│   ├── services/
│   │   ├── ttsService.js     # TTS service
│   │   └── sttService.js     # STT service
│   ├── routes/
│   │   ├── audioRoutes.js    # Audio API routes
│   │   └── imageRoutes.js    # Image API routes
│   └── middleware/
│       └── auth.js           # Authentication middleware
├── config/
│   └── default.js            # Configuration management
├── public/
├── env.example
├── package.json
└── README.md
```

### Adding New Features

1. Add new service classes in `src/services/`
2. Add corresponding routes in `src/routes/`
3. Register routes in `src/index.js`
4. Update configuration files and documentation

## Error Handling

The API uses standard HTTP status codes and OpenAI-compatible error format:

```json
{
  "error": {
    "message": "Error description",
    "type": "error_type",
    "code": "error_code"
  }
}
```

## Performance Optimization

- Automatic temporary file cleanup (hourly)
- Support for concurrent request processing
- MLX optimization for Mac Mini M4
- Automatic audio format conversion

## Security Considerations

- Production environment recommends enabling API key authentication
- Limit file upload size (default 50MB)
- Regular cleanup of temporary files
- Use HTTPS (requires SSL certificate configuration)

## Troubleshooting

### Common Issues

1. **TTS not working**
   - Check if macOS voices are available: `say -v ?`
   - Ensure FFmpeg is installed

2. **Audio cloning not working**
   - Check if MLX-Audio is installed: `python -m mlx_audio.tts.generate --help`
   - Ensure `TTS_CLONE_ENABLED=true` is configured
   - Check if reference audio file exists and is readable
   - Ensure reference text matches reference audio content
   - Verify model is downloaded: `ls ~/.cache/huggingface/hub/`
   - Check if language code is correct (use `z` for Chinese)

3. **STT not working**
   - Check if MLX Whisper is installed: `which mlx_whisper`
   - Ensure model is downloaded

4. **File upload failed**
   - Check if file size exceeds limit
   - Ensure audio format is supported

5. **LMstudio proxy failed**
   - Check if LMstudio is started and API Server is enabled
   - Confirm address and port configuration is correct
   - Check if API Key matches

6. **Image generation failed**
   - Confirm Draw Things is installed and HTTP API Server is enabled
   - Check `DRAW_THINGS_ENABLED=true` configuration
   - Confirm Draw Things is listening on the correct port (7860)

### Log Viewing

The service outputs detailed log information, including:
- Request processing time
- Error stack traces
- Service status checks

## License

MIT License

## Contributing

Issues and Pull Requests are welcome!

## Changelog

### v1.1.0
- ✨ Added audio cloning functionality based on MLX-Audio
- 🎵 Support for voice cloning using reference audio
- 🔧 Added flexible cloning configuration options
- 📚 Improved documentation and troubleshooting guide

### v1.0.0
- Initial release
- Support for TTS, STT, and translation features
- OpenAI API compatibility
- Mac Mini M4 optimization
