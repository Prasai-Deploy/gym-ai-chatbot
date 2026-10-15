import { AppError } from '@errors/AppError';

export class AIProviderError extends AppError {
  public readonly provider: string;
  public readonly category: string;

  constructor(
    message: string,
    statusCode: number = 502,
    provider: string = 'groq',
    category: string = 'PROVIDER_ERROR',
    isOperational: boolean = true
  ) {
    super(message, statusCode, isOperational);
    this.provider = provider;
    this.category = category;
  }
}

export class AIProviderConfigError extends AIProviderError {
  constructor(message: string = 'AI Provider configuration is missing or invalid', provider: string = 'groq') {
    super(message, 500, provider, 'CONFIG_ERROR');
  }
}

export class AIProviderRateLimitError extends AIProviderError {
  constructor(message: string = 'AI Provider rate limit exceeded', provider: string = 'groq') {
    super(message, 429, provider, 'RATE_LIMIT_ERROR');
  }
}

export class AIProviderNetworkError extends AIProviderError {
  constructor(message: string = 'AI Provider network connection failed', provider: string = 'groq') {
    super(message, 503, provider, 'NETWORK_ERROR');
  }
}

export class AIModelNotFoundError extends AIProviderError {
  constructor(message: string = 'Requested AI model was not found', provider: string = 'groq') {
    super(message, 404, provider, 'MODEL_NOT_FOUND_ERROR');
  }
}

export class AIContextExceededError extends AIProviderError {
  constructor(message: string = 'Context window length exceeded', provider: string = 'groq') {
    super(message, 400, provider, 'CONTEXT_EXCEEDED_ERROR');
  }
}

export class AIServiceUnavailableError extends AIProviderError {
  constructor(message: string = 'AI Service temporarily unavailable', provider: string = 'groq') {
    super(message, 503, provider, 'SERVICE_UNAVAILABLE_ERROR');
  }
}

export class AIProviderTimeoutError extends AIProviderError {
  constructor(message: string = 'AI Provider request timed out', provider: string = 'groq') {
    super(message, 504, provider, 'TIMEOUT_ERROR');
  }
}
