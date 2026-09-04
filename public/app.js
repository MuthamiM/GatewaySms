// ── State Management ──────────────────────────────────────────────
const state = {
  user: null,
  token: null,
  apiKey: 'ak_live_demo123',
  pendingEmail: '',
  timerInterval: null,
};

// ── Toast Notification System ─────────────────────────────────────
function showToast(title, message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// ── DOM References ────────────────────────────────────────────────
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const step1 = document.getElementById('login-step-1');
const step2 = document.getElementById('login-step-2');

const loginForm = document.getElementById('login-form');
const otpForm = document.getElementById('otp-form');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const togglePasswordBtn = document.getElementById('toggle-password-btn');

const btnLogin = document.getElementById('btn-login');
const btnVerifyOtp = document.getElementById('btn-verify-otp');
const btnBackToLogin = document.getElementById('btn-back-to-login');
const btnResendOtp = document.getElementById('btn-resend-otp');

const timerCount = document.getElementById('timer-count');
const otpPhoneDisplay = document.getElementById('otp-phone-display');
const otpDigits = document.querySelectorAll('.otp-digit');

// Dashboard Elements
const userCredits = document.getElementById('user-credits');
const userEmailDisplay = document.getElementById('user-email-display');
const userPhoneDisplay = document.getElementById('user-phone-display');
const userAvatarInitials = document.getElementById('user-avatar-initials');
const btnLogout = document.getElementById('btn-logout');

const dashSendForm = document.getElementById('dash-send-form');
const composeTo = document.getElementById('compose-to');
const composeText = document.getElementById('compose-text');
const composeSim = document.getElementById('compose-sim');
const composeFrom = document.getElementById('compose-from');
const charCounter = document.getElementById('char-counter');
const metaEncoding = document.getElementById('meta-encoding');
const metaSegments = document.getElementById('meta-segments');
const metaCredits = document.getElementById('meta-credits');
const btnSendSms = document.getElementById('btn-send-sms');

const devicesList = document.getElementById('devices-list');
const messagesTableBody = document.getElementById('messages-table-body');
const btnRefreshDevices = document.getElementById('btn-refresh-devices');
const btnRefreshLogs = document.getElementById('btn-refresh-logs');
const btnCopyKey = document.getElementById('btn-copy-key');
const apiKeyDisplay = document.getElementById('api-key-display');
const statTotalSent = document.getElementById('stat-total-sent');

// ── Password Visibility Toggle ────────────────────────────────────
togglePasswordBtn.addEventListener('click', () => {
  const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  passwordInput.setAttribute('type', type);
});

// ── Step 1: Login Submission ──────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  setLoading(btnLogin, true);

  try {
    const res = await fetch('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error?.message || 'Login failed. Please check credentials.');
    }

    state.pendingEmail = email;

    // Update Step 2 UI with server data
    otpPhoneDisplay.textContent = result.data.phoneMasked;

    showToast('SMS Dispatched', `6-digit verification code sent to ${result.data.phoneMasked}`, 'success');

    // Switch to Step 2
    step1.classList.remove('active');
    step2.classList.add('active');

    // Clear and focus first OTP digit
    otpDigits.forEach((d) => (d.value = ''));
    otpDigits[0].focus();

    startOtpTimer(result.data.expiresInSeconds || 300);
  } catch (err) {
    showToast('Authentication Error', err.message, 'error');
  } finally {
    setLoading(btnLogin, false);
  }
});

// ── OTP Inputs Auto-advance & Handling ─────────────────────────────
otpDigits.forEach((input, idx) => {
  input.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val.length === 1 && idx < otpDigits.length - 1) {
      otpDigits[idx + 1].focus();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !input.value && idx > 0) {
      otpDigits[idx - 1].focus();
    }
  });

  // Support paste of entire 6-digit code
  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      pasteData.split('').forEach((char, i) => {
        if (otpDigits[i]) otpDigits[i].value = char;
      });
      otpDigits[5].focus();
    }
  });
});

btnBackToLogin.addEventListener('click', () => {
  clearInterval(state.timerInterval);
  step2.classList.remove('active');
  step1.classList.add('active');
});

btnResendOtp.addEventListener('click', async () => {
  try {
    const res = await fetch('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: state.pendingEmail,
        password: passwordInput.value.trim(),
      }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error?.message || 'Could not resend code');

    if (result.data.previewOtp) {
      previewOtpCode.textContent = result.data.previewOtp;
    }

    startOtpTimer(300);
    showToast('SMS Resent', `New code dispatched to ${result.data.phoneMasked}`, 'success');
  } catch (err) {
    showToast('Resend Failed', err.message, 'error');
  }
});

// ── Step 2: OTP Verification ──────────────────────────────────────
otpForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  let enteredCode = '';
  otpDigits.forEach((d) => (enteredCode += d.value.trim()));

  if (enteredCode.length !== 6) {
    showToast('Invalid Code', 'Please enter all 6 digits of the OTP code', 'error');
    return;
  }

  setLoading(btnVerifyOtp, true);

  try {
    const res = await fetch('/v1/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: state.pendingEmail,
        otp: enteredCode,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error?.message || 'Verification failed');
    }

    clearInterval(state.timerInterval);

    state.user = result.data.user;
    state.token = result.data.token;
    if (result.data.tenant?.apiKey) {
      state.apiKey = result.data.tenant.apiKey;
    }

    showToast('Authentication Verified', 'Welcome to SMS Gateway SaaS Portal', 'success');

    // Transition to Dashboard
    initDashboard(result.data);
  } catch (err) {
    showToast('Verification Failed', err.message, 'error');
  } finally {
    setLoading(btnVerifyOtp, false);
  }
});

function startOtpTimer(durationSeconds) {
  clearInterval(state.timerInterval);
  let remaining = durationSeconds;

  const update = () => {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    timerCount.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (remaining <= 0) {
      clearInterval(state.timerInterval);
      timerCount.textContent = 'EXPIRED';
      showToast('Code Expired', 'Please request a new verification code', 'error');
    }
    remaining--;
  };

  update();
  state.timerInterval = setInterval(update, 1000);
}

// ── Dashboard Initialization ──────────────────────────────────────
function initDashboard(authData) {
  authView.classList.add('hidden');
  dashboardView.classList.remove('hidden');

  userEmailDisplay.textContent = authData.user.email;
  userPhoneDisplay.textContent = authData.user.phoneNumber;
  apiKeyDisplay.textContent = state.apiKey;

  if (authData.tenant?.credits !== undefined) {
    userCredits.textContent = Number(authData.tenant.credits).toLocaleString();
  }

  // Initials
  const emailName = authData.user.email.split('@')[0];
  userAvatarInitials.textContent = emailName.substring(0, 2).toUpperCase();

  // Load devices and recent messages
  loadDevices();
  loadMessages();
}

// ── Character & GSM Segment Counter ───────────────────────────────
composeText.addEventListener('input', () => {
  const text = composeText.value;
  const analysis = analyzeSmsEncoding(text);

  charCounter.textContent = `${analysis.characterCount} chars (${analysis.segments} segment${analysis.segments === 1 ? '' : 's'})`;
  metaEncoding.textContent = analysis.encoding;
  metaSegments.textContent = `${analysis.segments} SMS`;
  metaCredits.textContent = `${analysis.segments} Credit${analysis.segments === 1 ? '' : 's'}`;
});

function analyzeSmsEncoding(text) {
  const GSM_7BIT =
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
    "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ`¿abcdefghijklmnopqrstuvwxyzäöñüà|^€{}[]~\\";

  let isGsm = true;
  for (let i = 0; i < text.length; i++) {
    if (!GSM_7BIT.includes(text[i])) {
      isGsm = false;
      break;
    }
  }

  const length = text.length;

  if (isGsm) {
    if (length <= 160) {
      return { encoding: 'GSM-7', characterCount: length, segments: length === 0 ? 0 : 1 };
    }
    return { encoding: 'GSM-7', characterCount: length, segments: Math.ceil(length / 153) };
  } else {
    if (length <= 70) {
      return { encoding: 'UCS-2 (Unicode)', characterCount: length, segments: length === 0 ? 0 : 1 };
    }
    return { encoding: 'UCS-2 (Unicode)', characterCount: length, segments: Math.ceil(length / 67) };
  }
}

// ── Dispatch Quick SMS ────────────────────────────────────────────
dashSendForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const to = composeTo.value.trim();
  const text = composeText.value.trim();
  const simIndex = parseInt(composeSim.value, 10);
  const from = composeFrom.value.trim() || undefined;

  setLoading(btnSendSms, true);

  try {
    const res = await fetch('/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.apiKey}`,
      },
      body: JSON.stringify({ to, text, simIndex, from }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error?.message || 'Failed to dispatch SMS');
    }

    showToast('SMS Queued for Cellular Delivery', `Message ID: ${result.data.id}`, 'success');

    // Deduct credits visually
    const currentCredits = parseInt(userCredits.textContent.replace(/,/g, ''), 10);
    if (!isNaN(currentCredits)) {
      userCredits.textContent = Math.max(0, currentCredits - result.data.creditsDeducted).toLocaleString();
    }

    // Refresh messages table
    setTimeout(loadMessages, 800);
  } catch (err) {
    showToast('Delivery Error', err.message, 'error');
  } finally {
    setLoading(btnSendSms, false);
  }
});

// ── Load Devices Pool ─────────────────────────────────────────────
async function loadDevices() {
  try {
    const res = await fetch('/v1/devices', {
      headers: { Authorization: `Bearer ${state.apiKey}` },
    });
    const result = await res.json();

    if (!res.ok) return;

    devicesList.innerHTML = '';
    const devices = result.data || [];

    if (devices.length === 0) {
      devicesList.innerHTML = '<p class="device-meta">No devices currently online.</p>';
      return;
    }

    devices.forEach((dev) => {
      const el = document.createElement('div');
      el.className = 'device-item';
      const simText = dev.simSlots?.map((s) => `${s.carrier} (SIM ${s.slotIndex + 1})`).join(', ') || 'SIM 1';

      el.innerHTML = `
        <div class="device-main">
          <div class="device-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="5" y="2" width="14" height="20" rx="2"></rect>
              <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
          </div>
          <div>
            <div class="device-name">${dev.name}</div>
            <div class="device-meta">⚡ ${dev.batteryPercentage}% • ${simText}</div>
          </div>
        </div>
        <span class="device-status-badge">${dev.status}</span>
      `;
      devicesList.appendChild(el);
    });
  } catch (err) {
    console.error('Could not load devices:', err);
  }
}

// ── Load Messages Logs ────────────────────────────────────────────
async function loadMessages() {
  try {
    const res = await fetch('/v1/messages?limit=20', {
      headers: { Authorization: `Bearer ${state.apiKey}` },
    });
    const result = await res.json();

    if (!res.ok) return;

    messagesTableBody.innerHTML = '';
    const messages = result.data || [];

    statTotalSent.textContent = messages.length.toString();

    if (messages.length === 0) {
      messagesTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">
            No messages dispatched yet. Send your first SMS above!
          </td>
        </tr>
      `;
      return;
    }

    messages.forEach((m) => {
      const row = document.createElement('tr');
      const timeStr = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      row.innerHTML = `
        <td class="table-id">${m.id}</td>
        <td class="table-phone">${m.to}</td>
        <td>${escapeHtml(m.text.substring(0, 45))}${m.text.length > 45 ? '...' : ''}</td>
        <td>${m.segments} part</td>
        <td><span class="table-status ${m.status.toLowerCase()}">${m.status}</span></td>
        <td class="table-id">${timeStr}</td>
      `;
      messagesTableBody.appendChild(row);
    });
  } catch (err) {
    console.error('Could not load messages:', err);
  }
}

// ── Logout ────────────────────────────────────────────────────────
btnLogout.addEventListener('click', () => {
  state.user = null;
  state.token = null;
  dashboardView.classList.add('hidden');
  authView.classList.remove('hidden');
  step2.classList.remove('active');
  step1.classList.add('active');
  showToast('Logged Out', 'You have been safely signed out.', 'info');
});

// ── Copy API Key ──────────────────────────────────────────────────
btnCopyKey.addEventListener('click', () => {
  navigator.clipboard.writeText(state.apiKey).then(() => {
    showToast('Copied', 'API Key copied to clipboard', 'info');
  });
});

btnRefreshDevices.addEventListener('click', loadDevices);
btnRefreshLogs.addEventListener('click', loadMessages);

// ── Helpers ───────────────────────────────────────────────────────
function setLoading(btn, isLoading) {
  const text = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled = isLoading;
  if (text) text.style.opacity = isLoading ? '0' : '1';
  if (spinner) spinner.classList.toggle('hidden', !isLoading);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Initial trigger for text analysis
composeText.dispatchEvent(new Event('input'));
