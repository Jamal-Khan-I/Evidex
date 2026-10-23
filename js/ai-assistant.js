/**
 * ════════════════════════════════════════════════════════════════════════════
 * EVIDEX AI ASSISTANT — LIGHT THEME INTERACTIVE AVATAR & CASE STORY ENGINE
 * ════════════════════════════════════════════════════════════════════════════
 * Updates:
 *  1. Eye Geometry: Upright, parallel pill capsules with generous separation
 *     matching the user's reference image.
 *  2. Medium, noticeable avatar size (58px anchor, 52px core).
 *  3. Light theme game dialogue box without corner brackets or v2.4 badge.
 *  4. Clean message bubbles (no sender labels "YOU" / "Evidex AI").
 *  5. Clean header: "EVIDEX AI" without star symbols or sub-badges.
 *  6. Storytelling Case Engine with voice narration for registered cases.
 * ════════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ── CONFIGURATION & TIMINGS ──
  const VIDEO_SRC = 'assets/bloub-default-cycle_2.mp4';
  const THINKING_START = 8.0;
  const THINKING_END = 11.0;
  const NOTIF_START = 6.0;
  const NOTIF_END = 7.8;

  // ── STATE VARIABLES ──
  let currentState = 'idle'; // 'idle' | 'thinking' | 'notification' | 'speaking'
  let isBoxOpen = false;
  let isSoundEnabled = true;
  let isListeningVoice = false;
  let typewriterInterval = null;
  let activeSpeechUtterance = null;
  let isVoiceSpeaking = false;

  // Eye tracking physics state (centered upright parallel capsules)
  const eyeState = {
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0,
    blinkScale: 1.0,
    isBlinking: false,
    nextBlinkTime: Date.now() + 3000,
    hoverScale: 1.0
  };

  const mouse = {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.5,
    isOverAvatar: false
  };

  // Web Audio Context (synthesized game audio)
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playChime() {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
      osc2.frequency.setValueAtTime(1760, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (e) {}
  }

  function playTypeBlip() {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(850 + Math.random() * 200, now);

      gain.gain.setValueAtTime(0.012, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.035);
    } catch (e) {}
  }

  function playPop() {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {}
  }

  // ── INJECT DOM WIDGET (LIGHT THEME, CLEAN HEADER) ──
  function injectWidgetDOM() {
    if (document.getElementById('evidexAiWidget')) return;

    const widget = document.createElement('div');
    widget.id = 'evidexAiWidget';
    widget.innerHTML = `
      <!-- Light Theme RPG Game Dialogue Box -->
      <div id="aiDialogueBox" role="dialog" aria-label="Evidex AI Assistant">
        <div class="ai-dialogue-tail"></div>

        <!-- Clean Dialogue Header -->
        <div class="ai-dialogue-header">
          <div class="ai-header-profile">
            <div class="ai-mini-portrait">
              <div class="portrait-eye"></div>
              <div class="portrait-eye"></div>
            </div>
            <div class="ai-header-info">
              <span class="ai-speaker-name">EVIDEX AI</span>
            </div>
          </div>
          <div class="ai-header-controls">
            <button type="button" class="ai-icon-btn active" id="aiAudioToggleBtn" title="Toggle Voice/Sound">
              🔊
            </button>
            <button type="button" class="ai-icon-btn" id="aiCloseBoxBtn" title="Close Dialogue">
              ✕
            </button>
          </div>
        </div>

        <!-- Dialogue Message Feed -->
        <div class="ai-dialogue-body" id="aiChatFeed">
          <div class="ai-msg assistant">
            <div class="ai-msg-bubble">
              Greetings, Officer! I am <strong>EVIDEX AI</strong>, powered by Groq ultra-fast neural inference. I have full conversational intelligence—you can ask me anything from case analysis, digital forensics, and Indian law to general knowledge, science, or casual conversation!
              <br><br>
              Try asking <em>"How are you?"</em>, <em>"Explain the latest case"</em>, or whatever questions you have.
            </div>
          </div>
        </div>

        <!-- Quick Action Chips -->
        <div class="ai-suggestions-bar" id="aiSuggestionsBar">
          <button type="button" class="ai-chip primary-chip" data-query="Explain the detailed summary and forensic dossier of the last case that was registered">
            📋 Details of Last Case
          </button>
          <button type="button" class="ai-chip" data-query="Summarize all registered cases">
            📁 All Cases Summary
          </button>
          <button type="button" class="ai-chip" data-query="Are there any pending forensic reports?">
            🧪 Forensic Reports
          </button>
          <button type="button" class="ai-chip" data-query="How does chain of custody verification work?">
            ⚖️ Verify Custody
          </button>
        </div>

        <!-- Listening Voice Notice -->
        <div class="ai-listening-notice" id="aiListeningNotice">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 15px;">🎙️</span>
            <span>Listening to your voice... Speak now!</span>
          </div>
          <button type="button" id="aiCancelVoiceBtn" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 12px; font-weight: 700;">Cancel</button>
        </div>

        <!-- Dialogue Input Bar -->
        <div class="ai-dialogue-input-bar">
          <div class="ai-input-wrap">
            <input type="text" id="aiPromptInput" placeholder="Ask me anything... cases, law, science, general questions..." autocomplete="off" />
          </div>
          <button type="button" id="aiVoiceBtn" title="Ask using your voice">
            🎙️
          </button>
          <button type="button" id="aiSendBtn" title="Send Question">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>

      <!-- Medium Floating Avatar Anchor -->
      <div class="ai-avatar-anchor" id="aiAvatarAnchor" title="Click to open Evidex AI Assistant">
        <div class="ai-avatar-glow"></div>
        <div class="ai-notif-orb" id="aiNotifOrb"></div>
        <div class="ai-avatar-core">
          <!-- 1. Live Interactive Canvas for Eye Tracking -->
          <canvas id="aiAvatarCanvas" width="152" height="152"></canvas>
          <!-- 2. Chroma-keyed Video Canvas for Thinking & Notification Animations -->
          <canvas id="aiVideoCanvas" width="152" height="152"></canvas>
        </div>
      </div>

      <!-- Hidden Video Element for Assets -->
      <video id="aiAvatarVideo" preload="auto" playsinline muted crossOrigin="anonymous">
        <source src="${VIDEO_SRC}" type="video/mp4" />
      </video>
    `;

    document.body.appendChild(widget);
  }

  // ── LIVE CANVAS RENDERING & EYE TRACKING (MATCHING REFERENCE IMAGE) ──
  const maxDisplacement = 22; // Maximum pupil offset from center of sphere

  function initAvatarCanvas() {
    const canvas = document.getElementById('aiAvatarCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const videoCanvas = document.getElementById('aiVideoCanvas');
    const vCtx = videoCanvas ? videoCanvas.getContext('2d') : null;
    const video = document.getElementById('aiAvatarVideo');

    if (video) video.load();

    function renderLoop() {
      updateEyePhysics();
      drawAvatar(ctx, canvas.width, canvas.height);

      if (currentState === 'thinking' || currentState === 'notification') {
        if (vCtx && video && !video.paused) {
          drawVideoFrame(vCtx, video, videoCanvas.width, videoCanvas.height);
        }
      }

      requestAnimationFrame(renderLoop);
    }

    requestAnimationFrame(renderLoop);
  }

  function updateEyePhysics() {
    const anchor = document.getElementById('aiAvatarAnchor');
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const avatarCenterX = rect.left + rect.width / 2;
    const avatarCenterY = rect.top + rect.height / 2;

    const dx = mouse.x - avatarCenterX;
    const dy = mouse.y - avatarCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const angle = Math.atan2(dy, dx);
    const targetDist = Math.min(maxDisplacement, dist / 18);

    // At rest: centered in the middle of the black ball
    const targetEyeX = Math.cos(angle) * targetDist;
    const targetEyeY = Math.sin(angle) * targetDist;

    // Smooth Lerp
    eyeState.currentX += (targetEyeX - eyeState.currentX) * 0.12;
    eyeState.currentY += (targetEyeY - eyeState.currentY) * 0.12;

    // Blinking logic
    const now = Date.now();
    if (!eyeState.isBlinking && now > eyeState.nextBlinkTime) {
      eyeState.isBlinking = true;
      eyeState.blinkStartTime = now;
      eyeState.blinkDuration = 120;
      eyeState.nextBlinkTime = now + 3500 + Math.random() * 3000;
    }

    if (eyeState.isBlinking) {
      const elapsed = now - eyeState.blinkStartTime;
      const progress = elapsed / eyeState.blinkDuration;
      if (progress < 1) {
        eyeState.blinkScale = Math.max(0.06, Math.abs(Math.cos(progress * Math.PI)));
      } else {
        eyeState.isBlinking = false;
        eyeState.blinkScale = 1.0;
      }
    } else {
      eyeState.blinkScale = 1.0;
    }

    const targetHover = mouse.isOverAvatar ? 1.08 : 1.0;
    eyeState.hoverScale += (targetHover - eyeState.hoverScale) * 0.15;
  }

  function drawAvatar(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = 68; // Main black ball radius on 152px canvas

    // ── 1. DRAW PURE BLACK SPHERICAL BODY ──
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;

    // Deep rich black ball matching reference image
    const sphereGrad = ctx.createRadialGradient(
      cx - radius * 0.25, cy - radius * 0.25, radius * 0.1,
      cx, cy, radius
    );
    sphereGrad.addColorStop(0.0, '#1c1e24');
    sphereGrad.addColorStop(0.3, '#0c0d10');
    sphereGrad.addColorStop(0.7, '#000000');
    sphereGrad.addColorStop(1.0, '#000000');

    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── 2. DRAW TWO UPRIGHT, PARALLEL PILL EYES (MATCHING USER REFERENCE IMAGE) ──
    ctx.save();
    // Clip inside the spherical body
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
    ctx.clip();

    // Eye cluster coordinates based on gaze tracking (resting slightly above center like reference image)
    const eyesCenterX = cx + eyeState.currentX;
    const eyesCenterY = cy + eyeState.currentY - 4;

    // Upright capsule dimensions and wide spacing matching reference image (27.4% diameter spacing, 16.7% gap)
    const eyeWidth = 15 * eyeState.hoverScale;
    const eyeHeight = 30 * eyeState.hoverScale * eyeState.blinkScale;
    const eyeSpacing = 38; // 38px center-to-center spacing, 23px gap between eyes

    ctx.fillStyle = '#ffffff';

    // Left Eye (upright vertical pill capsule)
    drawPillEye(ctx, eyesCenterX - eyeSpacing / 2, eyesCenterY, eyeWidth, eyeHeight);

    // Right Eye (upright vertical pill capsule, parallel at exact same Y)
    drawPillEye(ctx, eyesCenterX + eyeSpacing / 2, eyesCenterY, eyeWidth, eyeHeight);

    ctx.restore();
  }

  // Draw upright pill/capsule shape with rounded end caps
  function drawPillEye(ctx, x, y, width, height) {
    if (height < 1.5) return; // Closed eyelid

    ctx.save();
    ctx.translate(x, y);

    const rx = width / 2;
    const ry = height / 2;
    const r = rx;

    ctx.beginPath();
    ctx.moveTo(-rx, -ry + r);
    ctx.arcTo(-rx, -ry, 0, -ry, r);
    ctx.arcTo(rx, -ry, rx, -ry + r, r);
    ctx.lineTo(rx, ry - r);
    ctx.arcTo(rx, ry, 0, ry, r);
    ctx.arcTo(-rx, ry, -rx, ry - r, r);
    ctx.closePath();

    ctx.fill();
    ctx.restore();
  }

  // ── VIDEO FRAME RENDERING WITH CHROMA-KEYING ──
  function drawVideoFrame(ctx, video, w, h) {
    if (!video.videoWidth) return;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(video, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // BFS Flood Fill from outer edges to make exterior white transparent
    const visited = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let head = 0, tail = 0;

    function push(px, py) {
      const idx = py * w + px;
      if (!visited[idx]) {
        visited[idx] = 1;
        queue[tail++] = idx;
      }
    }

    for (let x = 0; x < w; x++) {
      push(x, 0);
      push(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      push(0, y);
      push(w - 1, y);
    }

    while (head < tail) {
      const idx = queue[head++];
      const p = idx * 4;
      const r = data[p], g = data[p + 1], b = data[p + 2];

      if (r > 215 && g > 215 && b > 215) {
        data[p + 3] = 0;
        const px = idx % w;
        const py = (idx / w) | 0;
        if (px > 0) push(px - 1, py);
        if (px < w - 1) push(px + 1, py);
        if (py > 0) push(px, py - 1);
        if (py < h - 1) push(px, py + 1);
      } else if (r > 195 && g > 195 && b > 195) {
        const bright = (r + g + b) / 3;
        data[p + 3] = Math.max(0, Math.min(255, (255 - bright) * 3));
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  // ── STATE SWITCHING & VIDEO LOOPS ──
  function setState(state) {
    currentState = state;
    const anchor = document.getElementById('aiAvatarAnchor');
    const video = document.getElementById('aiAvatarVideo');
    const videoCanvas = document.getElementById('aiVideoCanvas');
    const avatarCanvas = document.getElementById('aiAvatarCanvas');
    const notifOrb = document.getElementById('aiNotifOrb');

    if (!anchor) return;

    anchor.classList.remove('state-thinking', 'state-notification', 'has-notif');

    if (state === 'thinking') {
      anchor.classList.add('state-thinking');
      if (videoCanvas) videoCanvas.style.opacity = '1';
      if (avatarCanvas) avatarCanvas.style.opacity = '0';
      if (notifOrb) notifOrb.style.display = 'none';

      if (video) {
        video.currentTime = THINKING_START;
        video.play().catch(() => {});
        video.ontimeupdate = () => {
          if (currentState === 'thinking' && video.currentTime >= THINKING_END) {
            video.currentTime = THINKING_START;
          }
        };
      }
    } else if (state === 'notification') {
      anchor.classList.add('state-notification', 'has-notif');
      if (videoCanvas) videoCanvas.style.opacity = '1';
      if (avatarCanvas) avatarCanvas.style.opacity = '0';
      if (notifOrb) notifOrb.style.display = 'block';

      playChime();

      if (video) {
        video.currentTime = NOTIF_START;
        video.play().catch(() => {});
        video.ontimeupdate = () => {
          if (currentState === 'notification' && video.currentTime >= NOTIF_END) {
            video.pause();
            setTimeout(() => {
              if (currentState === 'notification') {
                setState('speaking');
              }
            }, 600);
          }
        };
      }
    } else {
      if (videoCanvas) videoCanvas.style.opacity = '0';
      if (avatarCanvas) avatarCanvas.style.opacity = '1';
      if (video) video.pause();
    }
  }

  // ── RPG GAME DIALOGUE BOX CONTROLS ──
  function toggleDialogueBox() {
    isBoxOpen ? closeDialogueBox() : openDialogueBox();
  }

  function openDialogueBox() {
    const box = document.getElementById('aiDialogueBox');
    const anchor = document.getElementById('aiAvatarAnchor');
    if (!box) return;

    isBoxOpen = true;
    box.classList.add('open');
    playPop();

    if (anchor) anchor.classList.remove('has-notif');
    const notifOrb = document.getElementById('aiNotifOrb');
    if (notifOrb) notifOrb.style.display = 'none';

    setTimeout(() => {
      const input = document.getElementById('aiPromptInput');
      if (input) input.focus();
    }, 150);
  }

  function closeDialogueBox() {
    const box = document.getElementById('aiDialogueBox');
    if (!box) return;
    isBoxOpen = false;
    box.classList.remove('open');
    if (isListeningVoice) stopVoiceRecognition();
    stopStoryVoice();
  }

  // ── CLEAN MESSAGE RENDERING (NO SENDER LABELS) ──
  function appendUserMessage(text) {
    const feed = document.getElementById('aiChatFeed');
    if (!feed) return;

    const msgEl = document.createElement('div');
    msgEl.className = 'ai-msg user';
    msgEl.innerHTML = `
      <div class="ai-msg-bubble">${escapeHtml(text)}</div>
    `;
    feed.appendChild(msgEl);
    feed.scrollTop = feed.scrollHeight;
  }

  function showThinkingIndicator() {
    const feed = document.getElementById('aiChatFeed');
    if (!feed) return;

    let thinkingEl = document.getElementById('aiThinkingRow');
    if (!thinkingEl) {
      thinkingEl = document.createElement('div');
      thinkingEl.id = 'aiThinkingRow';
      thinkingEl.className = 'ai-thinking-indicator';
      thinkingEl.innerHTML = `
        <div class="ai-thinking-spinner"></div>
        <span>Analyzing case records &amp; reconstructing dossier...</span>
      `;
      feed.appendChild(thinkingEl);
    }
    feed.scrollTop = feed.scrollHeight;
  }

  function removeThinkingIndicator() {
    const thinkingEl = document.getElementById('aiThinkingRow');
    if (thinkingEl) thinkingEl.remove();
  }

  // ── EVIDEX AI INDIAN ENGLISH VOICE SYSTEM ──
  let aiVoiceAudioPlayer = null;

  function stopAiVoice() {
    if (aiVoiceAudioPlayer) {
      try {
        aiVoiceAudioPlayer.pause();
        aiVoiceAudioPlayer.currentTime = 0;
      } catch (e) {}
      aiVoiceAudioPlayer = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isVoiceSpeaking = false;
  }

  function getIndianSpeechVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices || voices.length === 0) return null;

    // 1. Natural Indian English voices (Microsoft Ravi, Heera, Neerja, Google English India)
    const indianVoice = voices.find(v => 
      (v.lang === 'en-IN' || v.lang.startsWith('en-IN') || v.lang.startsWith('en_IN')) &&
      (v.name.includes('Ravi') || v.name.includes('Heera') || v.name.includes('Neerja') || v.name.includes('India'))
    );
    if (indianVoice) return indianVoice;

    // 2. Any en-IN voice
    const anyIndian = voices.find(v => v.lang === 'en-IN' || v.lang.startsWith('en-IN') || v.lang.startsWith('en_IN'));
    if (anyIndian) return anyIndian;

    // 3. Clear Natural English voices
    const naturalEn = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David')));
    return naturalEn || voices.find(v => v.lang.startsWith('en')) || voices[0];
  }

  async function speakAssistantVoice(plainText, onEnd = null) {
    if (!isSoundEnabled) return;
    stopAiVoice();

    const cleanText = plainText.replace(/[*#_`]/g, '').trim();
    if (!cleanText) return;

    // Try high-fidelity server-side neural Indian English TTS first (up to 650 characters)
    if (cleanText.length <= 650) {
      try {
        const ttsFn = (window.epsApi && window.epsApi.generateIndianTts)
          ? window.epsApi.generateIndianTts
          : (window.epsApi && window.epsApi.generateJarvisTts);
        if (typeof ttsFn === 'function') {
          const res = await ttsFn(cleanText);
          if (res && res.success && res.audioUrl) {
            isVoiceSpeaking = true;
            const audio = new Audio(res.audioUrl);
            aiVoiceAudioPlayer = audio;
            audio.onended = () => {
              isVoiceSpeaking = false;
              aiVoiceAudioPlayer = null;
              if (onEnd) onEnd();
            };
            audio.onerror = () => {
              aiVoiceAudioPlayer = null;
              fallbackWebSpeechIndian(cleanText, onEnd);
            };
            await audio.play();
            return;
          }
        }
      } catch (err) {
        // Fallback to client synthesis
      }
    }

    fallbackWebSpeechIndian(cleanText, onEnd);
  }

  function fallbackWebSpeechIndian(cleanText, onEnd = null) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(cleanText);
      const voice = getIndianSpeechVoice();
      if (voice) utter.voice = voice;
      // Clear, natural, articulate pronunciation (normal pitch 1.0, natural pace 1.0)
      utter.pitch = 1.0; 
      utter.rate = 1.0;
      isVoiceSpeaking = true;
      activeSpeechUtterance = utter;

      utter.onend = () => {
        isVoiceSpeaking = false;
        if (onEnd) onEnd();
      };
      utter.onerror = () => {
        isVoiceSpeaking = false;
      };
      window.speechSynthesis.speak(utter);
    } catch (e) {
      isVoiceSpeaking = false;
    }
  }

  function speakStoryText(plainText, storyControlsContainer) {
    if (!isSoundEnabled) return;
    stopAiVoice();

    const cleanText = plainText.replace(/[*#_]/g, '').trim();
    if (!cleanText) return;

    if (storyControlsContainer) {
      storyControlsContainer.innerHTML = `
        <span>🔊 Narrating case with Evidex AI voice...</span>
        <div style="display:flex; gap:6px;">
          <button type="button" class="ai-voice-btn-pill" id="aiPauseStoryBtn">⏸ Pause</button>
          <button type="button" class="ai-voice-btn-pill danger" id="aiStopStoryBtn">⏹ Stop</button>
        </div>
      `;

      const pauseBtn = storyControlsContainer.querySelector('#aiPauseStoryBtn');
      const stopBtn = storyControlsContainer.querySelector('#aiStopStoryBtn');

      if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
          if (aiVoiceAudioPlayer) {
            if (aiVoiceAudioPlayer.paused) {
              aiVoiceAudioPlayer.play();
              pauseBtn.textContent = '⏸ Pause';
            } else {
              aiVoiceAudioPlayer.pause();
              pauseBtn.textContent = '▶ Resume';
            }
          } else if (window.speechSynthesis) {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
              pauseBtn.textContent = '⏸ Pause';
            } else {
              window.speechSynthesis.pause();
              pauseBtn.textContent = '▶ Resume';
            }
          }
        });
      }

      if (stopBtn) {
        stopBtn.addEventListener('click', () => {
          stopAiVoice();
          storyControlsContainer.innerHTML = `<span>⏹ Narration stopped.</span>`;
        });
      }
    }

    // Split story into natural paragraphs/sentences so each segment is synthesized via high-fidelity neural Indian English TTS
    const paragraphs = cleanText.split(/\n+/).map(p => p.trim()).filter(Boolean);
    const chunks = [];
    for (const p of paragraphs) {
      if (p.length <= 400) {
        chunks.push(p);
      } else {
        const sentences = p.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [p];
        let cur = '';
        for (const s of sentences) {
          if ((cur + s).length <= 400) {
            cur += s;
          } else {
            if (cur) chunks.push(cur.trim());
            cur = s;
          }
        }
        if (cur) chunks.push(cur.trim());
      }
    }

    let chunkIdx = 0;
    isVoiceSpeaking = true;

    async function playNextChunk() {
      if (!isVoiceSpeaking) return;
      if (chunkIdx >= chunks.length) {
        isVoiceSpeaking = false;
        if (storyControlsContainer) {
          storyControlsContainer.innerHTML = `<span>✓ Case narration complete.</span>`;
        }
        return;
      }

      const textToPlay = chunks[chunkIdx++];
      await speakAssistantVoice(textToPlay, () => {
        playNextChunk();
      });
    }

    playNextChunk();
  }

  function stopStoryVoice() {
    stopAiVoice();
  }

  function typewriteAssistantResponse(htmlContent, plainText, isStory = false) {
    const feed = document.getElementById('aiChatFeed');
    if (!feed) return;

    removeThinkingIndicator();

    const msgEl = document.createElement('div');
    msgEl.className = 'ai-msg assistant';
    msgEl.innerHTML = `
      <div class="ai-msg-bubble">
        <div class="ai-text-container"></div><span class="ai-typewriter-cursor"></span>
        ${isStory ? '<div class="ai-story-voice-bar" id="aiStoryControls"></div>' : ''}
      </div>
    `;
    feed.appendChild(msgEl);
    feed.scrollTop = feed.scrollHeight;

    const textContainer = msgEl.querySelector('.ai-text-container');
    const cursor = msgEl.querySelector('.ai-typewriter-cursor');
    const storyControls = msgEl.querySelector('#aiStoryControls');

    let i = 0;
    const speed = 12; // Fast, snappy interval
    const step = isStory ? 4 : 2; // Type multiple characters per tick for rapid response

    if (typewriterInterval) clearInterval(typewriterInterval);

    msgEl.addEventListener('click', () => {
      if (typewriterInterval) {
        clearInterval(typewriterInterval);
        typewriterInterval = null;
        textContainer.innerHTML = htmlContent;
        if (cursor) cursor.remove();
        feed.scrollTop = feed.scrollHeight;
        if (isStory && isSoundEnabled) speakStoryText(plainText, storyControls);
        else if (isSoundEnabled) speakAssistantVoice(plainText);
      }
    });

    typewriterInterval = setInterval(() => {
      if (i < plainText.length) {
        i = Math.min(plainText.length, i + step);
        textContainer.textContent = plainText.substring(0, i);
        if (i % 6 === 0) playTypeBlip();
        feed.scrollTop = feed.scrollHeight;
      } else {
        clearInterval(typewriterInterval);
        typewriterInterval = null;
        textContainer.innerHTML = htmlContent;
        if (cursor) cursor.remove();
        feed.scrollTop = feed.scrollHeight;

        // Auto-start voice narration for story or answer in Evidex AI voice
        if (isSoundEnabled) {
          if (isStory) {
            speakStoryText(plainText, storyControls);
          } else {
            speakAssistantVoice(plainText);
          }
        }
      }
    }, speed);
  }

  // ── SMART KNOWLEDGE ENGINE & REAL-TIME GROQ CONVERSATIONAL AI ──
  async function generateAIAnswer(query) {
    const q = (query || '').toLowerCase().trim();
    const role = window.currentUserRole || 'Officer';

    // 1. EXPLICIT CASE BRIEFING / DOSSIER REQUEST (Details of the registered case)
    const isExplicitCaseStory = 
      q.includes('details of last case') || 
      q.includes('details of the last case') || 
      q.includes('explain the detailed summary') ||
      q.includes('explain about the last case') ||
      q.includes('explain the last case') ||
      q.includes('dossier of last case') ||
      q.includes('dossier of the last case') ||
      q.includes('details of case') ||
      q.includes('story of last case') || 
      q.includes('story of the last case') || 
      q.includes('story of the case') || 
      q.includes('case story') || 
      q.includes('investigative story') || 
      q.includes('explain about the last case that was registered like a story') ||
      q.includes('narrate the case dossier') ||
      q.includes('narrate the last case');

    if (isExplicitCaseStory) {
      try {
        if (window.epsApi && typeof window.epsApi.analyzeCaseStory === 'function') {
          const res = await window.epsApi.analyzeCaseStory();
          if (res && res.success) {
            return {
              isStory: true,
              plain: res.storyPlain,
              html: res.storyHtml
            };
          }
        }
      } catch (e) {
        console.warn('Backend story analysis error:', e);
      }
    }

    // 2. LIVE DYNAMIC CONVERSATIONAL AI VIA GROQ ULTRA-FAST LPU (NO SCRIPTED / CANNED REPLIES)
    try {
      if (window.epsApi && typeof window.epsApi.askEvidexAi === 'function') {
        const chatRes = await window.epsApi.askEvidexAi(query, role);
        if (chatRes && chatRes.success && (chatRes.replyHtml || chatRes.replyPlain)) {
          return {
            isStory: false,
            plain: chatRes.replyPlain,
            html: chatRes.replyHtml
          };
        }
      }
    } catch (e) {
      console.warn('Real-time Groq chat error:', e);
    }

    // 3. Dynamic Local Fallback if server/network is offline
    return {
      isStory: false,
      plain: "Understood, Officer. Evidex AI is actively monitoring the Ethereum Sepolia evidence ledger and SHA-256 custody chains under Indian evidentiary standards.",
      html: "Understood, Officer. <strong>Evidex AI</strong> is standing by with live ledger intelligence.<br><br>&bull; <strong>Blockchain:</strong> Ethereum Sepolia<br>&bull; <strong>Cryptographic Anchor:</strong> SHA-256 &amp; AES-GCM<br>&bull; <strong>Evidentiary Standard:</strong> Bharatiya Nyaya Sanhita &amp; IT Act 2000"
    };
  }

  // ── SUBMIT QUESTION HANDLER (FAST & RESPONSIVE) ──
  async function handleQuestionSubmit(queryText) {
    const text = queryText || (document.getElementById('aiPromptInput')?.value || '').trim();
    if (!text) return;

    const input = document.getElementById('aiPromptInput');
    if (input) input.value = '';

    stopStoryVoice();
    appendUserMessage(text);

    // 1. Switch Avatar to THINKING ANIMATION
    setState('thinking');
    showThinkingIndicator();

    // Fast direct query without artificial sleep delays
    const answer = await generateAIAnswer(text);

    // 2. Switch Avatar to NOTIFICATION ANIMATION (Blue dot)
    setState('notification');

    // 3. Render answer in dialogue box with snappy typewriter effect & voice
    setTimeout(() => {
      typewriteAssistantResponse(answer.html, answer.plain, answer.isStory);
    }, 200);
  }

  // ── VOICE INPUT (WEB SPEECH API) ──
  let recognition = null;

  function initVoiceRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      const voiceBtn = document.getElementById('aiVoiceBtn');
      if (voiceBtn) {
        voiceBtn.style.opacity = '0.5';
        voiceBtn.title = 'Voice input not supported in this browser (use Chrome or Edge)';
      }
      return;
    }

    recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListeningVoice = true;
      const voiceBtn = document.getElementById('aiVoiceBtn');
      const notice = document.getElementById('aiListeningNotice');
      if (voiceBtn) voiceBtn.classList.add('listening');
      if (notice) notice.classList.add('active');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        const input = document.getElementById('aiPromptInput');
        if (input) input.value = transcript;
        handleQuestionSubmit(transcript);
      }
    };

    recognition.onerror = () => {
      stopVoiceRecognition();
    };

    recognition.onend = () => {
      stopVoiceRecognition();
    };
  }

  function startVoiceRecognition() {
    if (!recognition) initVoiceRecognition();
    if (recognition && !isListeningVoice) {
      try {
        recognition.start();
      } catch (e) {
        stopVoiceRecognition();
      }
    }
  }

  function stopVoiceRecognition() {
    isListeningVoice = false;
    const voiceBtn = document.getElementById('aiVoiceBtn');
    const notice = document.getElementById('aiListeningNotice');
    if (voiceBtn) voiceBtn.classList.remove('listening');
    if (notice) notice.classList.remove('active');
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }
  }

  // ── EVENT LISTENERS ──
  function attachEventListeners() {
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });

    const anchor = document.getElementById('aiAvatarAnchor');
    if (anchor) {
      anchor.addEventListener('mouseenter', () => {
        mouse.isOverAvatar = true;
      });
      anchor.addEventListener('mouseleave', () => {
        mouse.isOverAvatar = false;
      });
      anchor.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDialogueBox();
      });
    }

    const closeBtn = document.getElementById('aiCloseBoxBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeDialogueBox();
      });
    }

    const audioBtn = document.getElementById('aiAudioToggleBtn');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        audioBtn.classList.toggle('active', isSoundEnabled);
        audioBtn.innerHTML = isSoundEnabled ? '🔊' : '🔇';
        if (!isSoundEnabled) {
          stopStoryVoice();
        }
      });
    }


    const sendBtn = document.getElementById('aiSendBtn');
    const input = document.getElementById('aiPromptInput');

    if (sendBtn) {
      sendBtn.addEventListener('click', () => handleQuestionSubmit());
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleQuestionSubmit();
        }
      });
    }

    const voiceBtn = document.getElementById('aiVoiceBtn');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        if (isListeningVoice) {
          stopVoiceRecognition();
        } else {
          startVoiceRecognition();
        }
      });
    }

    const cancelVoiceBtn = document.getElementById('aiCancelVoiceBtn');
    if (cancelVoiceBtn) {
      cancelVoiceBtn.addEventListener('click', stopVoiceRecognition);
    }

    const suggestionsBar = document.getElementById('aiSuggestionsBar');
    if (suggestionsBar) {
      suggestionsBar.addEventListener('click', (e) => {
        const chip = e.target.closest('.ai-chip');
        if (chip) {
          const query = chip.getAttribute('data-query');
          if (query) handleQuestionSubmit(query);
        }
      });
    }

    document.addEventListener('click', (e) => {
      const widget = document.getElementById('evidexAiWidget');
      if (isBoxOpen && widget && !widget.contains(e.target)) {
        closeDialogueBox();
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── VISIBILITY LOGIC (NOT PRESENT ON STARTING PAGE) ──
  function updateAiWidgetVisibility() {
    const widget = document.getElementById('evidexAiWidget');
    if (!widget) return;

    const landing = document.getElementById('landingPage');
    const app = document.getElementById('appContent');

    const isLandingVisible = landing && (landing.style.display !== 'none' && window.getComputedStyle(landing).display !== 'none');
    const isAppVisible = app && (app.style.display !== 'none' && window.getComputedStyle(app).display !== 'none');

    if (!isLandingVisible && isAppVisible) {
      widget.classList.add('visible');
      widget.style.display = 'block';
    } else {
      widget.classList.remove('visible');
      widget.style.display = 'none';
      closeDialogueBox();
    }
  }

  function setupVisibilityObserver() {
    updateAiWidgetVisibility();

    const landing = document.getElementById('landingPage');
    const app = document.getElementById('appContent');

    const observer = new MutationObserver(() => {
      updateAiWidgetVisibility();
    });

    if (landing) {
      observer.observe(landing, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    if (app) {
      observer.observe(app, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    window.addEventListener('popstate', updateAiWidgetVisibility);
    window.addEventListener('hashchange', updateAiWidgetVisibility);
  }

  // ── INITIALIZATION ──
  function init() {
    injectWidgetDOM();
    initAvatarCanvas();
    initVoiceRecognition();
    attachEventListeners();
    setupVisibilityObserver();

    window.evidexAi = {
      setState,
      open: openDialogueBox,
      close: closeDialogueBox,
      ask: handleQuestionSubmit,
      updateVisibility: updateAiWidgetVisibility
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
