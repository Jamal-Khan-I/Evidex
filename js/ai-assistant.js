/**
 * ════════════════════════════════════════════════════════════════════════════
 * EVIDEX AI ASSISTANT — INTERACTIVE AVATAR & RPG GAME DIALOGUE ENGINE
 * ════════════════════════════════════════════════════════════════════════════
 * Features:
 *  1. Eye-Tracking: Eyes track user cursor in real-time with spherical physics & blinking.
 *  2. Video Integration:
 *      - Thinking state: Loops colorful rotating rings animation from bloub-default-cycle_2.mp4.
 *      - Notification state: Plays blue dot notification animation when answer is ready.
 *  3. Game-Style Speech Message Box:
 *      - RPG speech bubble coming directly from avatar with character name & typewriter effect.
 *      - Text & Voice input (Web Speech API).
 *      - Web Audio API synthesized chimes & blips.
 *  4. Case Intelligence: Real queries on system cases, custody chains, & forensics.
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
  let activeSpeech = null;

  // Eye tracking physics state
  const eyeState = {
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0,
    blinkScale: 1.0,
    isBlinking: false,
    nextBlinkTime: Date.now() + 3000,
    gazeAngle: -0.4,
    hoverScale: 1.0
  };

  // Cursor tracker
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
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
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
      // High-tech 2-tone pleasant crystal ping
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
      osc2.frequency.setValueAtTime(1760, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (e) {
      // Audio autoplay policy fallback
    }
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
      osc.frequency.setValueAtTime(900 + Math.random() * 200, now);

      gain.gain.setValueAtTime(0.015, now);
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
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {}
  }

  // ── INJECT DOM WIDGET ──
  function injectWidgetDOM() {
    if (document.getElementById('evidexAiWidget')) return;

    const widget = document.createElement('div');
    widget.id = 'evidexAiWidget';
    widget.innerHTML = `
      <!-- RPG Game Dialogue Box -->
      <div id="aiDialogueBox" role="dialog" aria-label="Evidex AI Assistant">
        <div class="ai-box-corner top-left"></div>
        <div class="ai-box-corner top-right"></div>
        <div class="ai-box-corner bottom-left"></div>
        <div class="ai-dialogue-tail"></div>

        <!-- Dialogue Header -->
        <div class="ai-dialogue-header">
          <div class="ai-header-profile">
            <div class="ai-mini-portrait">
              <div class="portrait-eye"></div>
              <div class="portrait-eye"></div>
            </div>
            <div class="ai-header-info">
              <span class="ai-speaker-name">
                ✦ EVIDEX AI
                <span style="font-size: 10px; color: #38bdf8; font-weight: 500;">v2.4</span>
              </span>
              <span class="ai-badge-status">
                <span class="ai-status-dot"></span>
                <span>Case Intelligence Active</span>
              </span>
            </div>
          </div>
          <div class="ai-header-controls">
            <button type="button" class="ai-icon-btn active" id="aiAudioToggleBtn" title="Toggle Voice/Sound Effects">
              🔊
            </button>
            <button type="button" class="ai-icon-btn" id="aiCloseBoxBtn" title="Close Dialogue">
              ✕
            </button>
          </div>
        </div>

        <!-- Dialogue Scrollable Message Feed -->
        <div class="ai-dialogue-body" id="aiChatFeed">
          <div class="ai-msg assistant">
            <div class="ai-msg-sender">✦ Evidex AI Assistant</div>
            <div class="ai-msg-bubble">
              Greetings, Officer. I am your <strong>Evidex Case Intelligence Assistant</strong>. 
              I track blockchain case dossiers, tamper audits, forensic lab reports, and custody transfers. 
              <br><br>
              How can I assist your investigation today?
            </div>
          </div>
        </div>

        <!-- Quick Question Action Chips -->
        <div class="ai-suggestions-bar" id="aiSuggestionsBar">
          <button type="button" class="ai-chip" data-query="Summarize all registered cases">
            📁 All Cases Summary
          </button>
          <button type="button" class="ai-chip" data-query="Are there any pending forensic reports?">
            🧪 Forensic Reports
          </button>
          <button type="button" class="ai-chip" data-query="How does chain of custody verification work?">
            ⚖️ Verify Custody
          </button>
          <button type="button" class="ai-chip" data-query="How to register a case with forensics request?">
            📋 Register Case Guide
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
            <input type="text" id="aiPromptInput" placeholder="Ask about cases, forensics, evidence..." autocomplete="off" />
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

      <!-- Floating Avatar Anchor -->
      <div class="ai-avatar-anchor" id="aiAvatarAnchor" title="Click to open Evidex AI Assistant">
        <div class="ai-avatar-glow"></div>
        <div class="ai-notif-orb" id="aiNotifOrb"></div>
        <div class="ai-avatar-core">
          <!-- 1. Live Interactive Canvas for Eye Tracking -->
          <canvas id="aiAvatarCanvas" width="152" height="152"></canvas>
          <!-- 2. Chroma-keyed Video Canvas for Thinking & Notification Animations -->
          <canvas id="aiVideoCanvas" width="152" height="152"></canvas>
        </div>
        <!-- Tooltip Hint when idle -->
        <div class="ai-idle-hint" id="aiIdleHint">
          <span class="ai-hint-sparkle">✦</span>
          <span>Ask AI Assistant</span>
        </div>
      </div>

      <!-- Hidden Video Element for Assets -->
      <video id="aiAvatarVideo" preload="auto" playsinline muted crossOrigin="anonymous">
        <source src="${VIDEO_SRC}" type="video/mp4" />
      </video>
    `;

    document.body.appendChild(widget);
  }

  // ── LIVE CANVAS RENDERING & EYE TRACKING ──
  function initAvatarCanvas() {
    const canvas = document.getElementById('aiAvatarCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const videoCanvas = document.getElementById('aiVideoCanvas');
    const vCtx = videoCanvas ? videoCanvas.getContext('2d') : null;
    const video = document.getElementById('aiAvatarVideo');

    // Video load check
    if (video) {
      video.load();
    }

    // Render loop running at 60fps
    function renderLoop() {
      // 1. Update eye tracking physics
      updateEyePhysics();

      // 2. Draw Interactive Canvas
      drawAvatar(ctx, canvas.width, canvas.height);

      // 3. Draw Video Canvas if thinking or notification
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

    // Vector from avatar center to mouse cursor
    const dx = mouse.x - avatarCenterX;
    const dy = mouse.y - avatarCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Limit displacement to sphere surface radius (max ~18px on 76px avatar = 36px on 152px canvas)
    const maxRadius = 34; // canvas coordinate units
    const angle = Math.atan2(dy, dx);
    const targetDist = Math.min(maxRadius, dist / 14);

    // Default resting eye position: upper-right quadrant (like reference image)
    const baseOffsetX = 18;
    const baseOffsetY = -18;

    // Smooth blending between resting upper-right pose and dynamic cursor direction
    const cursorWeight = Math.min(1.0, dist / 40);
    const targetEyeX = baseOffsetX * (1 - cursorWeight) + Math.cos(angle) * targetDist * cursorWeight;
    const targetEyeY = baseOffsetY * (1 - cursorWeight) + Math.sin(angle) * targetDist * cursorWeight;

    // Dampening / Lerp
    eyeState.currentX += (targetEyeX - eyeState.currentX) * 0.12;
    eyeState.currentY += (targetEyeY - eyeState.currentY) * 0.12;
    eyeState.gazeAngle += (angle - eyeState.gazeAngle) * 0.1;

    // Blinking logic
    const now = Date.now();
    if (!eyeState.isBlinking && now > eyeState.nextBlinkTime) {
      eyeState.isBlinking = true;
      eyeState.blinkStartTime = now;
      eyeState.blinkDuration = 130; // ms
      eyeState.nextBlinkTime = now + 3500 + Math.random() * 3000;
    }

    if (eyeState.isBlinking) {
      const elapsed = now - eyeState.blinkStartTime;
      const progress = elapsed / eyeState.duration;
      if (progress < 1) {
        // Squash to 0.05 at 50%, then expand back
        eyeState.blinkScale = Math.max(0.06, Math.abs(Math.cos(progress * Math.PI)));
      } else {
        eyeState.isBlinking = false;
        eyeState.blinkScale = 1.0;
      }
    } else {
      eyeState.blinkScale = 1.0;
    }

    // Hover scale
    const targetHover = mouse.isOverAvatar ? 1.15 : 1.0;
    eyeState.hoverScale += (targetHover - eyeState.hoverScale) * 0.15;
  }

  function drawAvatar(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = 68; // Main black ball radius

    // ── 1. DRAW BLACK SPHERICAL BODY ──
    ctx.save();

    // Subtle drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;

    // Sphere gradient with 3D depth
    const sphereGrad = ctx.createRadialGradient(
      cx - radius * 0.28, cy - radius * 0.28, radius * 0.1,
      cx, cy, radius
    );
    sphereGrad.addColorStop(0.0, '#2d3038'); // Specular highlight
    sphereGrad.addColorStop(0.35, '#121418');
    sphereGrad.addColorStop(0.75, '#060709');
    sphereGrad.addColorStop(1.0, '#000000');

    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Specular top rim shine
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
    ctx.clip();

    const rimGrad = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius);
    rimGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.22)');
    rimGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.05)');
    rimGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.8)');
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // ── 2. DRAW TWO WHITE PILL EYES ──
    ctx.save();
    // Clip inside the spherical body so eyes never poke outside the ball
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
    ctx.clip();

    // Eye cluster coordinates based on gaze tracking
    const eyesCenterX = cx + eyeState.currentX;
    const eyesCenterY = cy + eyeState.currentY;

    // Eye specs matching reference image (pill/capsule shape)
    const eyeWidth = 13 * eyeState.hoverScale;
    const eyeHeight = 28 * eyeState.hoverScale * eyeState.blinkScale;
    const eyeSpacing = 14;

    // Dynamic tilt angle: base tilt ~ -24deg plus subtle gaze influence
    const tilt = -0.42 + (eyeState.currentX / maxRadius) * 0.15;

    ctx.fillStyle = '#ffffff';

    // Left Eye
    drawPillEye(ctx, eyesCenterX - eyeSpacing * 0.55, eyesCenterY, eyeWidth, eyeHeight, tilt);

    // Right Eye (slightly offset higher & right matching reference image)
    drawPillEye(ctx, eyesCenterX + eyeSpacing * 0.65, eyesCenterY - 4, eyeWidth, eyeHeight, tilt);

    ctx.restore();
  }

  // Draw a smooth pill/capsule shape rotated by angle
  function drawPillEye(ctx, x, y, width, height, angle) {
    if (height < 1.5) return; // Closed eyelid during blink

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

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

    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 6;
    ctx.fill();

    ctx.restore();
  }

  const maxRadius = 34;

  // ── VIDEO FRAME RENDERING WITH CHROMA-KEYING ──
  function drawVideoFrame(ctx, video, w, h) {
    if (!video.videoWidth) return;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(video, 0, 0, w, h);

    // Fast chroma-key out outer white background
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // BFS Flood Fill from corners to make white exterior 100% transparent
    // This preserves white eyes inside the black ball!
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

    // Push 4 borders
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

      // If outer pixel is near-white background
      if (r > 215 && g > 215 && b > 215) {
        data[p + 3] = 0; // Transparent!
        const px = idx % w;
        const py = (idx / w) | 0;
        if (px > 0) push(px - 1, py);
        if (px < w - 1) push(px + 1, py);
        if (py > 0) push(px, py - 1);
        if (py < h - 1) push(px, py + 1);
      } else if (r > 195 && g > 195 && b > 195) {
        // Soft anti-aliased edge
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
            // Transition smoothly to speaking/idle with notif orb active
            setTimeout(() => {
              if (currentState === 'notification') {
                setState('speaking');
              }
            }, 600);
          }
        };
      }
    } else {
      // Idle or speaking
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
    const hint = document.getElementById('aiIdleHint');
    if (!box) return;

    isBoxOpen = true;
    box.classList.add('open');
    if (hint) hint.classList.remove('visible');
    playPop();

    // Clear notification badge
    if (anchor) anchor.classList.remove('has-notif');
    const notifOrb = document.getElementById('aiNotifOrb');
    if (notifOrb) notifOrb.style.display = 'none';

    // Focus input
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
  }

  // ── RPG TYPEWRITER DIALOGUE RENDERING ──
  function appendUserMessage(text) {
    const feed = document.getElementById('aiChatFeed');
    if (!feed) return;

    const msgEl = document.createElement('div');
    msgEl.className = 'ai-msg user';
    msgEl.innerHTML = `
      <div class="ai-msg-sender">👮 YOU</div>
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
        <span>✦ Analyzing case dossiers & blockchain records...</span>
      `;
      feed.appendChild(thinkingEl);
    }
    feed.scrollTop = feed.scrollHeight;
  }

  function removeThinkingIndicator() {
    const thinkingEl = document.getElementById('aiThinkingRow');
    if (thinkingEl) thinkingEl.remove();
  }

  function typewriteAssistantResponse(htmlContent, plainText) {
    const feed = document.getElementById('aiChatFeed');
    if (!feed) return;

    removeThinkingIndicator();

    const msgEl = document.createElement('div');
    msgEl.className = 'ai-msg assistant';
    msgEl.innerHTML = `
      <div class="ai-msg-sender">✦ Evidex AI Assistant</div>
      <div class="ai-msg-bubble">
        <span class="ai-text-container"></span><span class="ai-typewriter-cursor"></span>
      </div>
    `;
    feed.appendChild(msgEl);
    feed.scrollTop = feed.scrollHeight;

    const textContainer = msgEl.querySelector('.ai-text-container');
    const cursor = msgEl.querySelector('.ai-typewriter-cursor');

    // Typewriter character by character
    let i = 0;
    const speed = 18; // ms per char

    if (typewriterInterval) clearInterval(typewriterInterval);

    // Fast-skip on click
    msgEl.addEventListener('click', () => {
      if (typewriterInterval) {
        clearInterval(typewriterInterval);
        typewriterInterval = null;
        textContainer.innerHTML = htmlContent;
        if (cursor) cursor.remove();
        feed.scrollTop = feed.scrollHeight;
      }
    });

    typewriterInterval = setInterval(() => {
      if (i < plainText.length) {
        textContainer.textContent = plainText.substring(0, i + 1);
        if (i % 3 === 0) playTypeBlip();
        i++;
        feed.scrollTop = feed.scrollHeight;
      } else {
        clearInterval(typewriterInterval);
        typewriterInterval = null;
        // Inject rich formatted HTML once typing completes
        textContainer.innerHTML = htmlContent;
        if (cursor) cursor.remove();
        feed.scrollTop = feed.scrollHeight;

        // Optional speech synthesis read aloud
        if (isSoundEnabled && window.speechSynthesis) {
          try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(plainText.replace(/[#*`_]/g, ''));
            utter.rate = 1.05;
            utter.pitch = 1.0;
            window.speechSynthesis.speak(utter);
          } catch (e) {}
        }
      }
    }, speed);
  }

  // ── SMART CASE KNOWLEDGE ENGINE ──
  async function generateAIAnswer(query) {
    const q = (query || '').toLowerCase().trim();

    // Fetch live cases from epsApi if available
    let cases = [];
    try {
      if (window.epsApi && typeof window.epsApi.getCases === 'function') {
        const role = window.currentUserRole || 'POLICE';
        const res = await window.epsApi.getCases(role, 'all');
        if (res && res.cases) cases = res.cases;
      }
    } catch (e) {
      console.warn('AI could not fetch live cases:', e);
    }

    // 1. Cases Summary Query
    if (q.includes('all cases') || q.includes('summarize') || q.includes('summary') || q.includes('how many cases')) {
      if (cases.length === 0) {
        return {
          plain: "There are currently 0 registered cases in the Evidex decentralized ledger. You can register a new FIR case from the 'Register Case' tab in the left sidebar.",
          html: "There are currently <strong>0 registered cases</strong> in the Evidex decentralized ledger.<br><br>You can register a new FIR case from the <strong>Register Case</strong> option in the left navigation sidebar."
        };
      }
      const pendingForensics = cases.filter(c => c.status === 'UNDER_FORENSIC_ANALYSIS' || c.status === 'FORENSIC_REQUESTED').length;
      const courtCases = cases.filter(c => c.status === 'COURT_READY' || c.status === 'ADMITTED').length;
      const recent = cases.slice(0, 3).map(c => `• <strong>${escapeHtml(c.case_number || c.fir_number || 'Case')}</strong>: ${escapeHtml(c.title || 'Evidence Dossier')} (${c.status || 'Active'})`).join('<br>');

      return {
        plain: `Found ${cases.length} total cases in the Evidex ledger. ${pendingForensics} are under forensic analysis, and ${courtCases} are prepared for court presentation.\n\nRecent dossiers:\n${cases.slice(0, 3).map(c => `- ${c.case_number || c.fir_number}: ${c.title} (${c.status})`).join('\n')}`,
        html: `Found <strong>${cases.length} registered case dossiers</strong> in the cryptographic ledger:<br><br>
               📊 <strong>Status Breakdown:</strong><br>
               &bull; Under Forensic Review: <strong>${pendingForensics}</strong><br>
               &bull; Court-Admissible / Ready: <strong>${courtCases}</strong><br><br>
               📁 <strong>Recent Records:</strong><br>${recent}`
      };
    }

    // 2. Forensic Status Query
    if (q.includes('forensic') || q.includes('lab') || q.includes('fsl') || q.includes('report')) {
      const fslCases = cases.filter(c => c.status === 'UNDER_FORENSIC_ANALYSIS' || c.status === 'FORENSIC_REQUESTED' || c.has_forensics_report);
      if (fslCases.length === 0) {
        return {
          plain: "No cases are currently flagged for forensic lab examination. When registering a case, police officers can check 'Request Forensics Report' to schedule evidence analysis.",
          html: "No cases are currently pending forensic lab examination.<br><br>💡 <em>Officer Tip:</em> When registering an FIR, check the <strong>'Request Forensics Report'</strong> checkbox to flag digital evidence for FSL laboratory analysis."
        };
      }
      const list = fslCases.slice(0, 4).map(c => `• <strong>${escapeHtml(c.case_number || c.fir_number)}</strong>: ${escapeHtml(c.title)} &mdash; Status: <span style="color:#f59e0b;">${c.status}</span>`).join('<br>');
      return {
        plain: `There are ${fslCases.length} case(s) involving forensic reports in the ledger.`,
        html: `Found <strong>${fslCases.length} case(s)</strong> with forensic requirements:<br><br>${list}<br><br>Forensic specialists can accept custody, perform hash verification, and upload certified reports.`
      };
    }

    // 3. Chain of Custody Query
    if (q.includes('custody') || q.includes('chain') || q.includes('integrity') || q.includes('tamper')) {
      return {
        plain: "Evidex secures evidence custody using SHA-256 cryptographic hashing and Ethereum Sepolia smart contracts. Every custody transfer is signed with MetaMask, creating an immutable, court-admissible audit trail.",
        html: `⚖️ <strong>Chain of Custody & Tamper Verification:</strong><br><br>
               1. <strong>Cryptographic Fingerprint:</strong> Digital evidence is hashed client-side with SHA-256 before upload.<br>
               2. <strong>Smart Contract Anchoring:</strong> The hash, officer ID, and timestamp are written directly to the Ethereum blockchain.<br>
               3. <strong>Custody Transfers:</strong> When custody moves between Police, Forensic Labs, and Court, both parties sign the transfer transaction.<br>
               4. <strong>Tamper Detection:</strong> Any 1-bit alteration in a file alters the SHA-256 hash, causing immediate integrity validation failure.`
      };
    }

    // 4. Case Registration Guide
    if (q.includes('register') || q.includes('how to') || q.includes('new case')) {
      return {
        plain: "To register a case: 1. Click 'Register Case' in the left menu. 2. Enter Case Title, FIR Number, Section of Law, and Description. 3. Check 'Request Forensics Report' if lab analysis is required. 4. Upload digital evidence files. 5. Sign with your MetaMask wallet.",
        html: `📋 <strong>Case Registration Workflow:</strong><br><br>
               1. Select <strong>'Register Case'</strong> from the translucent left sidebar.<br>
               2. Fill in the FIR Number, Acts/Sections, and Incident Summary.<br>
               3. Select <strong>'Request Forensics Report'</strong> if physical or digital evidence requires FSL inspection.<br>
               4. Upload evidence media (PDF, video, audio, disk images).<br>
               5. Confirm with your authorized MetaMask wallet to mint the immutable record on Ethereum.`
      };
    }

    // 5. General intelligent response
    return {
      plain: `Understood, Officer. Evidex is operating with live Ethereum smart contracts and AES-256 client encryption. You can query case files, check pending lab verifications, or inspect chain of custody logs at any time.`,
      html: `Understood, Officer. <strong>Evidex v2.4</strong> is active.<br><br>
             &bull; <strong>Blockchain Network:</strong> Ethereum Sepolia<br>
             &bull; <strong>Storage Node:</strong> Pinata IPFS Decentralized Cluster<br>
             &bull; <strong>Active Cases:</strong> ${cases.length} registered dossiers<br><br>
             Try asking: <em>"Summarize all cases"</em>, <em>"Forensic reports"</em>, or <em>"How does custody work?"</em>`
    };
  }

  // ── SUBMIT QUESTION HANDLER ──
  async function handleQuestionSubmit(queryText) {
    const text = queryText || (document.getElementById('aiPromptInput')?.value || '').trim();
    if (!text) return;

    const input = document.getElementById('aiPromptInput');
    if (input) input.value = '';

    // Append user question
    appendUserMessage(text);

    // 1. Switch Avatar to THINKING ANIMATION (Colorful rotating rings from video!)
    setState('thinking');
    showThinkingIndicator();

    // Simulate cryptographic processing / API delay (1.8s - 2.5s)
    const delay = 1800 + Math.random() * 700;
    const answer = await new Promise(resolve => {
      setTimeout(async () => {
        const res = await generateAIAnswer(text);
        resolve(res);
      }, delay);
    });

    // 2. Switch Avatar to NOTIFICATION ANIMATION (Blue dot animation from video!)
    setState('notification');

    // 3. Render answer in dialogue box with typewriter effect
    setTimeout(() => {
      typewriteAssistantResponse(answer.html, answer.plain);
    }, 400);
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

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
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
    // Mouse tracking for avatar eyes
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });

    // Avatar hover & click
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

    // Close button
    const closeBtn = document.getElementById('aiCloseBoxBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeDialogueBox();
      });
    }

    // Audio toggle button
    const audioBtn = document.getElementById('aiAudioToggleBtn');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        audioBtn.classList.toggle('active', isSoundEnabled);
        audioBtn.innerHTML = isSoundEnabled ? '🔊' : '🔇';
        if (!isSoundEnabled && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      });
    }

    // Send button & Enter key
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

    // Voice button
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

    // Action chips (Game dialogue options)
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

    // Close on outside click
    document.addEventListener('click', (e) => {
      const widget = document.getElementById('evidexAiWidget');
      if (isBoxOpen && widget && !widget.contains(e.target)) {
        closeDialogueBox();
      }
    });

    // Idle hint timer (pops up gently after 7s to invite user)
    setTimeout(() => {
      const hint = document.getElementById('aiIdleHint');
      if (hint && !isBoxOpen) {
        hint.classList.add('visible');
        setTimeout(() => {
          if (!mouse.isOverAvatar) hint.classList.remove('visible');
        }, 5000);
      }
    }, 7000);
  }

  // Utility helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── INITIALIZATION ──
  function init() {
    injectWidgetDOM();
    initAvatarCanvas();
    initVoiceRecognition();
    attachEventListeners();

    // Expose for testing
    window.evidexAi = {
      setState,
      open: openDialogueBox,
      close: closeDialogueBox,
      ask: handleQuestionSubmit
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
