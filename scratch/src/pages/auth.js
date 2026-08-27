// ROBINHOOD — Auth Page v3 (Production-grade with real API)
import store from '../store.js';
import { router } from '../router.js';
import { showToast } from '../components/notifications.js';
import { robinhoodBrandMark } from '../components/brand.js';
import { renderAskRobinFab, renderAskRobinPanel, initAskRobin, setRobinContext } from '../components/ask-robin.js';

// API base URL
const API_BASE = '';  // Same origin

export function renderAuth() {
  return `
    <div class="auth-page">
      <div class="auth-brand">
        <div class="auth-brand-mark">
          ${robinhoodBrandMark(28)}
        </div>
      <div class="auth-brand-title">Robinhood</div>
      <div class="auth-brand-sub" style="font-weight:700; color:var(--accent); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.06em; font-size:var(--text-xs);">For Good</div>
      <div class="auth-brand-sub">The structured path to algorithmic mastery. 465 problems. 86 companies. One platform.</div>
    </div>
    <div class="auth-form-panel">
      <div class="auth-form-wrap" id="auth-form-container"></div>
    </div>

    ${renderAskRobinFab()}
    ${renderAskRobinPanel()}
  </div>
  `;
}

export function initAuth() {
  setRobinContext(
    'Authentication',
    'Account Setup',
    'Help me complete signup/login securely, including email verification and password reset steps.'
  );
  initAskRobin();

  // Check URL params for verification or reset
  const params = new URLSearchParams(window.location.search);
  const verifyToken = params.get('verify');
  const resetToken = params.get('reset');
  
  if (verifyToken) {
    handleEmailVerification(verifyToken);
  } else if (resetToken) {
    showResetPasswordForm(resetToken);
  } else {
    showSignupForm();
  }
}

async function handleEmailVerification(token) {
  const container = document.getElementById('auth-form-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="auth-form-heading">Verifying your email...</div>
    <div style="text-align:center; padding: 20px;">
      <div class="loading-spinner"></div>
    </div>
  `;
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Email verified successfully!', 'success');
      showLoginForm();
    } else {
      showToast(data.reason || 'Verification failed', 'error');
      showSignupForm();
    }
  } catch (error) {
    showToast('Verification failed. Please try again.', 'error');
    showSignupForm();
  }
}

function showSignupForm() {
  const container = document.getElementById('auth-form-container');
  if (!container) return;
  container.innerHTML = `
    <div class="auth-form-heading">Create your account</div>
    <div class="auth-form">
      <div class="input-group">
        <label class="input-label" for="auth-name">Full Name</label>
        <input class="input" type="text" id="auth-name" placeholder="Your name" autocomplete="name">
      </div>
      <div class="input-group">
        <label class="input-label" for="auth-email">Email</label>
        <input class="input" type="email" id="auth-email" placeholder="you@example.com" autocomplete="email">
      </div>
      <div class="input-group">
        <label class="input-label" for="auth-password">Password</label>
        <input class="input" type="password" id="auth-password" placeholder="Create a password (8+ characters)">
        <div class="input-hint" id="password-strength"></div>
      </div>
      <button class="btn btn-primary btn-lg" id="auth-submit-btn" style="width:100%;">
        Create Account
      </button>
      <div class="auth-switch">
        Already have an account? <a id="switch-to-login">Log in</a>
      </div>
    </div>
  `;

  // Password strength indicator
  const passwordInput = document.getElementById('auth-password');
  const strengthIndicator = document.getElementById('password-strength');
  passwordInput?.addEventListener('input', () => {
    const password = passwordInput.value;
    if (password.length === 0) {
      strengthIndicator.textContent = '';
    } else if (password.length < 8) {
      strengthIndicator.textContent = 'Password must be at least 8 characters';
      strengthIndicator.style.color = 'var(--danger)';
    } else if (password.length < 12) {
      strengthIndicator.textContent = 'Good password';
      strengthIndicator.style.color = 'var(--warning)';
    } else {
      strengthIndicator.textContent = 'Strong password';
      strengthIndicator.style.color = 'var(--success)';
    }
  });

  document.getElementById('auth-submit-btn').addEventListener('click', handleSignup);
  document.getElementById('switch-to-login')?.addEventListener('click', showLoginForm);
}

async function handleSignup() {
  const name = document.getElementById('auth-name')?.value?.trim();
  const email = document.getElementById('auth-email')?.value?.trim();
  const password = document.getElementById('auth-password')?.value;

  // Validation
  if (!name || name.length < 2) {
    showToast('Please enter your name (at least 2 characters)', 'error');
    return;
  }
  if (!email || !email.includes('@')) {
    showToast('Please enter a valid email', 'error');
    return;
  }
  if (!password || password.length < 8) {
    showToast('Password must be at least 8 characters', 'error');
    return;
  }

  const submitBtn = document.getElementById('auth-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';

  try {
    const response = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (data.success) {
      showToast('Account created! Check your email to verify.', 'success', 5000);
      
      // In development, auto-verify with the token
      if (data.verificationToken) {
        showVerificationForm(email, data.verificationToken);
      } else {
        showVerificationPendingForm(email);
      }
    } else {
      showToast(data.reason || 'Signup failed', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  } catch (error) {
    showToast('Connection error. Please try again.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
}

function showVerificationForm(email, token) {
  const container = document.getElementById('auth-form-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="auth-form-heading">Verify your email</div>
    <p style="color:var(--text-2);margin-bottom:16px;">We sent a verification link to <strong>${email}</strong></p>
    <div class="auth-form">
      <p style="color:var(--text-3);font-size:var(--text-sm);margin-bottom:16px;">
        Development mode: Click below to verify immediately
      </p>
      <button class="btn btn-primary btn-lg" id="auth-verify-btn" style="width:100%;">
        Verify Now
      </button>
      <div class="auth-switch" style="margin-top:16px;">
        <a id="resend-verification">Resend verification email</a>
      </div>
    </div>
  `;

  document.getElementById('auth-verify-btn').addEventListener('click', async () => {
    const btn = document.getElementById('auth-verify-btn');
    btn.disabled = true;
    btn.textContent = 'Verifying...';
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast('Email verified! You can now log in.', 'success');
        showLoginForm();
      } else {
        showToast(data.reason || 'Verification failed', 'error');
        btn.disabled = false;
        btn.textContent = 'Verify Now';
      }
    } catch (error) {
      showToast('Verification failed. Please try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Verify Now';
    }
  });

  document.getElementById('resend-verification')?.addEventListener('click', () => {
    resendVerification(email);
  });
}

function showVerificationPendingForm(email) {
  const container = document.getElementById('auth-form-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="auth-form-heading">Check your email</div>
    <p style="color:var(--text-2);margin-bottom:16px;">
      We sent a verification link to <strong>${email}</strong>
    </p>
    <p style="color:var(--text-3);font-size:var(--text-sm);margin-bottom:24px;">
      Click the link in the email to verify your account and start learning.
    </p>
    <div class="auth-form">
      <button class="btn btn-secondary btn-lg" id="auth-login-btn" style="width:100%;">
        Go to Login
      </button>
      <div class="auth-switch" style="margin-top:16px;">
        <a id="resend-verification">Didn't receive the email? Resend</a>
      </div>
    </div>
  `;

  document.getElementById('auth-login-btn')?.addEventListener('click', showLoginForm);
  document.getElementById('resend-verification')?.addEventListener('click', () => {
    resendVerification(email);
  });
}

async function resendVerification(email) {
  try {
    const response = await fetch(`${API_BASE}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Verification email sent!', 'success');
      if (data.verificationToken) {
        showVerificationForm(email, data.verificationToken);
      }
    } else {
      showToast(data.reason || 'Failed to resend', 'error');
    }
  } catch (error) {
    showToast('Failed to resend. Please try again.', 'error');
  }
}

function showLoginForm() {
  const container = document.getElementById('auth-form-container');
  if (!container) return;
  container.innerHTML = `
    <div class="auth-form-heading">Welcome back</div>
    <div class="auth-form">
      <div class="input-group">
        <label class="input-label" for="auth-email">Email</label>
        <input class="input" type="email" id="auth-email" placeholder="you@example.com" autocomplete="email">
      </div>
      <div class="input-group">
        <label class="input-label" for="auth-password">Password</label>
        <input class="input" type="password" id="auth-password" placeholder="Your password" autocomplete="current-password">
      </div>
      <button class="btn btn-primary btn-lg" id="auth-login-btn" style="width:100%;">
        Log In
      </button>
      <div class="auth-switch">
        <a id="forgot-password">Forgot password?</a>
      </div>
      <div class="auth-switch">
        New here? <a id="switch-to-signup">Create an account</a>
      </div>
    </div>
  `;

  document.getElementById('auth-login-btn').addEventListener('click', handleLogin);
  document.getElementById('switch-to-signup')?.addEventListener('click', showSignupForm);
  document.getElementById('forgot-password')?.addEventListener('click', showForgotPasswordForm);
}

async function handleLogin() {
  const email = document.getElementById('auth-email')?.value?.trim();
  const password = document.getElementById('auth-password')?.value;

  if (!email) {
    showToast('Please enter your email', 'error');
    return;
  }
  if (!password) {
    showToast('Please enter your password', 'error');
    return;
  }

  const loginBtn = document.getElementById('auth-login-btn');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';

  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success && data.user) {
      // Store session
      store.loginWithSession(data.user, data.sessionToken);
      store.updateStreak();
      
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      const destination = store.getLearnerProfile?.() ? '/dashboard' : '/onboarding';
      setTimeout(() => router.navigate(destination), 300);
    } else {
      showToast(data.reason || 'Invalid email or password', 'error');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Log In';
    }
  } catch (error) {
    showToast('Connection error. Please try again.', 'error');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Log In';
  }
}

function showForgotPasswordForm() {
  const container = document.getElementById('auth-form-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="auth-form-heading">Reset your password</div>
    <p style="color:var(--text-2);margin-bottom:16px;">
      Enter your email and we'll send you a reset link.
    </p>
    <div class="auth-form">
      <div class="input-group">
        <label class="input-label" for="auth-email">Email</label>
        <input class="input" type="email" id="auth-email" placeholder="you@example.com" autocomplete="email">
      </div>
      <button class="btn btn-primary btn-lg" id="auth-reset-btn" style="width:100%;">
        Send Reset Link
      </button>
      <div class="auth-switch">
        <a id="back-to-login">Back to login</a>
      </div>
    </div>
  `;

  document.getElementById('auth-reset-btn').addEventListener('click', handleForgotPassword);
  document.getElementById('back-to-login')?.addEventListener('click', showLoginForm);
}

async function handleForgotPassword() {
  const email = document.getElementById('auth-email')?.value?.trim();

  if (!email) {
    showToast('Please enter your email', 'error');
    return;
  }

  const resetBtn = document.getElementById('auth-reset-btn');
  resetBtn.disabled = true;
  resetBtn.textContent = 'Sending...';

  try {
    const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    showToast('If an account exists, a reset link has been sent.', 'success', 5000);
    
    // In development, show the reset form directly
    if (data.resetToken) {
      showResetPasswordForm(data.resetToken);
    } else {
      showLoginForm();
    }
  } catch (error) {
    showToast('Failed to send reset link. Please try again.', 'error');
    resetBtn.disabled = false;
    resetBtn.textContent = 'Send Reset Link';
  }
}

function showResetPasswordForm(token) {
  const container = document.getElementById('auth-form-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="auth-form-heading">Set new password</div>
    <p style="color:var(--text-2);margin-bottom:16px;">
      Enter your new password below.
    </p>
    <div class="auth-form">
      <div class="input-group">
        <label class="input-label" for="auth-password">New Password</label>
        <input class="input" type="password" id="auth-password" placeholder="New password (8+ characters)">
      </div>
      <div class="input-group">
        <label class="input-label" for="auth-confirm">Confirm Password</label>
        <input class="input" type="password" id="auth-confirm" placeholder="Confirm new password">
      </div>
      <button class="btn btn-primary btn-lg" id="auth-reset-btn" style="width:100%;">
        Reset Password
      </button>
    </div>
  `;

  document.getElementById('auth-reset-btn').addEventListener('click', () => {
    handleResetPassword(token);
  });
}

async function handleResetPassword(token) {
  const password = document.getElementById('auth-password')?.value;
  const confirm = document.getElementById('auth-confirm')?.value;

  if (!password || password.length < 8) {
    showToast('Password must be at least 8 characters', 'error');
    return;
  }
  if (password !== confirm) {
    showToast('Passwords do not match', 'error');
    return;
  }

  const resetBtn = document.getElementById('auth-reset-btn');
  resetBtn.disabled = true;
  resetBtn.textContent = 'Resetting...';

  try {
    const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: password }),
    });

    const data = await response.json();

    if (data.success) {
      showToast('Password reset successful! Please log in.', 'success');
      showLoginForm();
    } else {
      showToast(data.reason || 'Reset failed', 'error');
      resetBtn.disabled = false;
      resetBtn.textContent = 'Reset Password';
    }
  } catch (error) {
    showToast('Reset failed. Please try again.', 'error');
    resetBtn.disabled = false;
    resetBtn.textContent = 'Reset Password';
  }
}
