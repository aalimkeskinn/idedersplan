// SECURITY: Secure error handling utility
export interface SecureError {
  code: string;
  message: string;
  timestamp: number;
  userMessage: string;
}

// SECURITY: Safe error messages that don't expose system internals
const SAFE_ERROR_MESSAGES: { [key: string]: string } = {
  // Authentication errors
  'auth/user-not-found': 'Kullanıcı bulunamadı',
  'auth/wrong-password': 'Hatalı şifre',
  'auth/too-many-requests': 'Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin',
  'auth/user-disabled': 'Hesap devre dışı bırakılmış',
  'auth/invalid-email': 'Geçersiz e-posta adresi',
  'auth/email-already-in-use': 'Bu e-posta adresi zaten kullanımda',
  'auth/weak-password': 'Şifre çok zayıf',
  'auth/network-request-failed': 'Ağ bağlantısı hatası',
  
  // Firestore errors
  'permission-denied': 'Bu işlem için yetkiniz yok',
  'not-found': 'Kaynak bulunamadı',
  'already-exists': 'Kaynak zaten mevcut',
  'resource-exhausted': 'Sistem yoğunluğu nedeniyle işlem gerçekleştirilemedi',
  'unauthenticated': 'Oturum açmanız gerekiyor',
  'unavailable': 'Servis geçici olarak kullanılamıyor',
  'deadline-exceeded': 'İşlem zaman aşımına uğradı',
  
  // Validation errors
  'validation-error': 'Girilen bilgiler geçersiz',
  'conflict-error': 'Çakışma tespit edildi',
  'rate-limit-exceeded': 'Çok fazla istek gönderildi',
  
  // Generic errors
  'unknown': 'Beklenmeyen bir hata oluştu',
  'network-error': 'Ağ bağlantısı sorunu',
  'timeout': 'İşlem zaman aşımına uğradı'
};

// SECURITY: Handle errors securely without exposing sensitive information
export const handleSecureError = (error: any): SecureError => {
  const timestamp = Date.now();
  
  // SECURITY: Log full error details for debugging (server-side only)
  if (import.meta.env.DEV) {
    console.error('🔒 SECURE ERROR HANDLER:', {
      timestamp,
      error,
      stack: error?.stack,
      code: error?.code,
      message: error?.message
    });
  }
  
  // Extract error code
  let errorCode = 'unknown';
  if (error?.code) {
    errorCode = error.code;
  } else if (error?.name) {
    errorCode = error.name.toLowerCase();
  } else if (error?.message) {
    // Try to extract known error patterns
    const message = error.message.toLowerCase();
    if (message.includes('network')) errorCode = 'network-error';
    else if (message.includes('timeout')) errorCode = 'timeout';
    else if (message.includes('permission')) errorCode = 'permission-denied';
    else if (message.includes('not found')) errorCode = 'not-found';
  }
  
  // Get safe user message
  const userMessage = SAFE_ERROR_MESSAGES[errorCode] || SAFE_ERROR_MESSAGES['unknown'];
  
  // SECURITY: Create sanitized error object
  const secureError: SecureError = {
    code: errorCode,
    message: userMessage,
    timestamp,
    userMessage
  };
  
  // SECURITY: Log sanitized error for monitoring
  console.warn('⚠️ User Error:', {
    code: errorCode,
    message: userMessage,
    timestamp: new Date(timestamp).toISOString()
  });
  
  return secureError;
};

// SECURITY: Rate limiting helper
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  
  constructor(maxAttempts: number = 5, windowMs: number = 300000) { // 5 attempts per 5 minutes
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }
  
  // Check if action is rate limited
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    // Update attempts list
    this.attempts.set(identifier, recentAttempts);
    
    return recentAttempts.length >= this.maxAttempts;
  }
  
  // Record an attempt
  recordAttempt(identifier: string): void {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    attempts.push(now);
    this.attempts.set(identifier, attempts);
  }
  
  // Get remaining attempts
  getRemainingAttempts(identifier: string): number {
    const attempts = this.attempts.get(identifier) || [];
    const now = Date.now();
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxAttempts - recentAttempts.length);
  }
  
  // Reset attempts for identifier
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
  
  // Clear old entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [identifier, attempts] of this.attempts.entries()) {
      const recentAttempts = attempts.filter(time => now - time < this.windowMs);
      if (recentAttempts.length === 0) {
        this.attempts.delete(identifier);
      } else {
        this.attempts.set(identifier, recentAttempts);
      }
    }
  }
}

// SECURITY: Global rate limiter instance
export const globalRateLimiter = new RateLimiter();

// SECURITY: Cleanup old rate limit entries every 10 minutes
setInterval(() => {
  globalRateLimiter.cleanup();
}, 600000);

// SECURITY: Input validation helpers
export const validateInput = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@ide\.k12\.tr$/;
    return emailRegex.test(email.trim());
  },
  
  password: (password: string): boolean => {
    return password.length >= 6 && password.length <= 128;
  },
  
  name: (name: string): boolean => {
    const sanitized = name.trim();
    return sanitized.length >= 2 && 
           sanitized.length <= 100 && 
           !/[<>\"'&]/.test(sanitized);
  },
  
  text: (text: string, maxLength: number = 500): boolean => {
    const sanitized = text.trim();
    return sanitized.length <= maxLength && 
           !/[<>\"'&]/.test(sanitized);
  }
};

// SECURITY: Audit logging
export const auditLog = (action: string, details: any = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    details: {
      ...details,
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  };
  
  // SECURITY: Log to console in development
  if (import.meta.env.DEV) {
    console.log('📋 AUDIT LOG:', logEntry);
  }
  
  // TODO: In production, send to secure logging service
  // sendToSecureLoggingService(logEntry);
};