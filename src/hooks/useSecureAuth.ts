import { useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { handleSecureError, globalRateLimiter, validateInput, auditLog } from '../utils/errorHandler';
import { sanitizeInput } from '../utils/validation';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface LoginResult {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
}

export const useSecureAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  // SECURITY: Monitor authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthState(prev => ({
        ...prev,
        user,
        loading: false,
        error: null
      }));

      // SECURITY: Audit log authentication events
      if (user) {
        auditLog('user_authenticated', {
          userId: user.uid,
          email: user.email,
          lastSignIn: user.metadata.lastSignInTime
        });
      } else {
        auditLog('user_signed_out');
      }
    });

    return unsubscribe;
  }, []);

  // SECURITY: Secure login with rate limiting and validation
  const secureLogin = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      // SECURITY: Input sanitization
      const cleanEmail = sanitizeInput(email).toLowerCase();
      const cleanPassword = password; // Don't sanitize password

      // SECURITY: Input validation
      if (!validateInput.email(cleanEmail)) {
        auditLog('login_attempt_invalid_email', { email: cleanEmail });
        return {
          success: false,
          error: 'Sadece @ide.k12.tr e-posta adresleri kabul edilir'
        };
      }

      if (!validateInput.password(cleanPassword)) {
        auditLog('login_attempt_invalid_password', { email: cleanEmail });
        return {
          success: false,
          error: 'Şifre 6-128 karakter arasında olmalıdır'
        };
      }

      // SECURITY: Rate limiting check
      const rateLimitKey = `login_${cleanEmail}`;
      if (globalRateLimiter.isRateLimited(rateLimitKey)) {
        const remainingAttempts = globalRateLimiter.getRemainingAttempts(rateLimitKey);
        auditLog('login_attempt_rate_limited', { 
          email: cleanEmail,
          remainingAttempts 
        });
        
        return {
          success: false,
          error: 'Çok fazla başarısız deneme. Lütfen 5 dakika bekleyin.',
          remainingAttempts
        };
      }

      // SECURITY: Clear any previous errors
      setAuthState(prev => ({ ...prev, error: null }));

      // Attempt login
      const result = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      
      // SECURITY: Reset rate limiter on successful login
      globalRateLimiter.reset(rateLimitKey);
      
      auditLog('login_success', {
        userId: result.user.uid,
        email: result.user.email
      });

      return { success: true };

    } catch (error: any) {
      // SECURITY: Record failed attempt
      const cleanEmail = sanitizeInput(email).toLowerCase();
      const rateLimitKey = `login_${cleanEmail}`;
      globalRateLimiter.recordAttempt(rateLimitKey);
      
      const remainingAttempts = globalRateLimiter.getRemainingAttempts(rateLimitKey);
      
      // SECURITY: Handle error securely
      const secureError = handleSecureError(error);
      
      auditLog('login_failure', {
        email: cleanEmail,
        errorCode: secureError.code,
        remainingAttempts
      });

      setAuthState(prev => ({
        ...prev,
        error: secureError.userMessage
      }));

      return {
        success: false,
        error: secureError.userMessage,
        remainingAttempts
      };
    }
  }, []);

  // SECURITY: Secure logout
  const secureLogout = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const currentUser = auth.currentUser;
      
      await signOut(auth);
      
      auditLog('logout_success', {
        userId: currentUser?.uid,
        email: currentUser?.email
      });

      setAuthState(prev => ({
        ...prev,
        error: null
      }));

      return { success: true };

    } catch (error: any) {
      const secureError = handleSecureError(error);
      
      auditLog('logout_failure', {
        errorCode: secureError.code
      });

      setAuthState(prev => ({
        ...prev,
        error: secureError.userMessage
      }));

      return {
        success: false,
        error: secureError.userMessage
      };
    }
  }, []);

  // SECURITY: Check if user is admin (based on email domain)
  const isAdmin = useCallback((): boolean => {
    if (!authState.user?.email) return false;
    
    // SECURITY: Only @ide.k12.tr emails are considered admin
    return authState.user.email.endsWith('@ide.k12.tr');
  }, [authState.user]);

  // SECURITY: Get remaining login attempts
  const getRemainingAttempts = useCallback((email: string): number => {
    const cleanEmail = sanitizeInput(email).toLowerCase();
    const rateLimitKey = `login_${cleanEmail}`;
    return globalRateLimiter.getRemainingAttempts(rateLimitKey);
  }, []);

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    login: secureLogin,
    logout: secureLogout,
    isAdmin,
    getRemainingAttempts
  };
};

// SECURITY: Legacy hook for backward compatibility
export const useAuth = () => {
  const secureAuth = useSecureAuth();
  
  return {
    user: secureAuth.user,
    loading: secureAuth.loading,
    login: secureAuth.login,
    logout: secureAuth.logout
  };
};