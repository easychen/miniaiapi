import config from '../../config/default.js';

/**
 * API 密钥验证中间件
 */
export function authenticateApiKey(req, res, next) {
  // 如果不需要 API 密钥验证，直接通过
  if (!config.api.keyRequired) {
    return next();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: {
        message: 'Missing authorization header',
        type: 'authentication_error',
        code: 'missing_api_key'
      }
    });
  }

  // 支持 Bearer token 和直接 API key 两种格式
  let apiKey;
  if (authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7);
  } else {
    apiKey = authHeader;
  }

  if (apiKey !== config.api.key) {
    return res.status(401).json({
      error: {
        message: 'Invalid API key',
        type: 'authentication_error',
        code: 'invalid_api_key'
      }
    });
  }

  next();
}

/**
 * 请求日志中间件
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  
  // 记录请求完成时间
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
}

/**
 * 错误处理中间件
 */
export function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${err.stack}`);
  
  // 如果响应已经发送，交给默认错误处理器
  if (res.headersSent) {
    return next(err);
  }
  
  // 根据错误类型返回适当的状态码
  let statusCode = 500;
  let errorType = 'server_error';
  let errorCode = 'internal_error';
  
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorType = 'invalid_request_error';
    errorCode = 'validation_error';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorType = 'authentication_error';
    errorCode = 'unauthorized';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorType = 'permission_error';
    errorCode = 'forbidden';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorType = 'not_found_error';
    errorCode = 'not_found';
  }
  
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal server error',
      type: errorType,
      code: errorCode
    }
  });
}

export default {
  authenticateApiKey,
  requestLogger,
  errorHandler
};
