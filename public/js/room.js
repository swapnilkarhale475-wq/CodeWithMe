const socket = io();
const roomCodeText = document.getElementById('roomCodeText');
const memberCount = document.getElementById('memberCount');
const memberList = document.getElementById('memberList');
const copyRoomCodeBtn = document.getElementById('copyRoomCodeBtn');
const roomPrompt = document.getElementById('roomPrompt');
const askRoomAiBtn = document.getElementById('askRoomAiBtn');
const clearRoomAiBtn = document.getElementById('clearRoomAiBtn');
const roomAiResponse = document.getElementById('roomAiResponse');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const usernameInput = document.getElementById('usernameInput');
const toggleTheme = document.getElementById('toggleTheme');

const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('code')?.trim().toUpperCase();
let currentUserName = localStorage.getItem('codewithme-user') || 'Student';

/* ==========================================================================
   THEME LOGIC (UNCHANGED)
   ========================================================================== */
function setThemeFromStorage() {
  const saved = localStorage.getItem('codewithme-theme');
  if (saved === 'dark') {
    document.documentElement.classList.add('dark-mode');
    toggleTheme.textContent = 'Light mode';
  }
}

function toggleThemeMode() {
  document.documentElement.classList.toggle('dark-mode');
  const isDark = document.documentElement.classList.contains('dark-mode');
  localStorage.setItem('codewithme-theme', isDark ? 'dark' : 'light');
  toggleTheme.textContent = isDark ? 'Light mode' : 'Dark mode';
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ==========================================================================
   MARKDOWN RENDERING & SYNTAX HIGHLIGHTING SYSTEM
   ========================================================================== */

/**
 * Configure Marked.js renderer with Highlight.js and code block Copy button
 */
function setupMarkedRenderer() {
  const renderer = new marked.Renderer();

  renderer.code = function (code, infostring) {
    let codeText = typeof code === 'object' && code !== null ? (code.text || '') : String(code || '');
    let lang = typeof code === 'object' && code !== null ? (code.lang || '') : (infostring || '');
    
    lang = lang.trim().toLowerCase();
    let highlightedCode = '';

    if (typeof hljs !== 'undefined') {
      if (lang && hljs.getLanguage(lang)) {
        try {
          highlightedCode = hljs.highlight(codeText, { language: lang }).value;
        } catch (e) {
          highlightedCode = escapeHtml(codeText);
        }
      } else {
        try {
          const autoHighlight = hljs.highlightAuto(codeText);
          highlightedCode = autoHighlight.value;
        } catch (e) {
          highlightedCode = escapeHtml(codeText);
        }
      }
    } else {
      highlightedCode = escapeHtml(codeText);
    }

    const displayLang = lang || 'code';

    return `
      <div class="code-block-wrapper" style="position: relative; margin: 1rem 0; border-radius: 8px; overflow: hidden; background: #1e1e1e; color: #d4d4d4;">
        <div class="code-block-header" style="display: flex; justify-space-between; align-items: center; padding: 6px 14px; background: #2d2d2d; font-size: 0.8rem; color: #aaa; border-bottom: 1px solid #333;">
          <span class="code-lang" style="font-weight: 600; text-transform: uppercase;">${escapeHtml(displayLang)}</span>
          <button class="copy-code-btn" onclick="copyCodeBlock(this)" style="background: rgba(255, 255, 255, 0.1); border: 1px solid #555; color: #ccc; border-radius: 4px; padding: 3px 10px; font-size: 0.75rem; cursor: pointer; transition: all 0.2s;">Copy</button>
        </div>
        <pre style="margin: 0; padding: 14px; overflow-x: auto;"><code class="hljs ${escapeHtml(displayLang)}">${highlightedCode}</code></pre>
      </div>
    `;
  };

  marked.setOptions({
    renderer: renderer,
    gfm: true,
    breaks: true,
    sanitize: false
  });
}

/**
 * Global helper attached to window for code block Copy buttons
 */
window.copyCodeBlock = function (buttonElement) {
  const container = buttonElement.closest('.code-block-wrapper');
  if (!container) return;

  const codeElement = container.querySelector('code');
  if (!codeElement) return;

  const textToCopy = codeElement.innerText || codeElement.textContent;

  navigator.clipboard.writeText(textToCopy)
    .then(() => {
      buttonElement.textContent = 'Copied ✓';
      buttonElement.style.color = '#4CAF50';
      buttonElement.style.borderColor = '#4CAF50';

      setTimeout(() => {
        buttonElement.textContent = 'Copy';
        buttonElement.style.color = '#ccc';
        buttonElement.style.borderColor = '#555';
      }, 2000);
    })
    .catch((err) => {
      console.error('Failed to copy code: ', err);
    });
};

/**
 * Safely converts input and parses Markdown (headings, lists, tables, code blocks, etc.)
 */
function renderRichText(text) {
  if (text === null || text === undefined || text === '') {
    return '<p>No response received from AI.</p>';
  }

  if (typeof text === 'object') {
    text = text.answer || text.response || text.message || JSON.stringify(text);
  }

  const safeText = String(text).trim();

  if (!safeText) {
    return '<p>No response received from AI.</p>';
  }

  if (typeof marked !== 'undefined') {
    try {
      return marked.parse(safeText);
    } catch (e) {
      console.error('Marked parsing error:', e);
      return `<p>${escapeHtml(safeText).replace(/\n/g, '<br>')}</p>`;
    }
  }

  return `<p>${escapeHtml(safeText).replace(/\n/g, '<br>')}</p>`;
}

/* ==========================================================================
   ROOM UI & SOCKET LOGIC (UNCHANGED)
   ========================================================================== */
function addChatMessage(message) {
  const bubble = document.createElement('article');
  bubble.className = `chat-bubble ${message.type}`;
  bubble.innerHTML = `
    <span class="sender">${escapeHtml(message.sender)}</span>
    ${renderRichText(message.text)}
    <span class="timestamp">${new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
  `;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateRoomMeta(code) {
  roomCodeText.textContent = code || 'Invalid room';
}

function updateMembers({ count, members }) {
  memberCount.textContent = `${count} online`;
  memberList.textContent = members.join(', ') || 'No active participants yet.';
}

function showRoomAiResponse(text) {
  roomAiResponse.innerHTML = renderRichText(text);
}

function copyRoomCode() {
  if (!roomCode) return;
  navigator.clipboard.writeText(roomCode).then(() => {
    const originalText = copyRoomCodeBtn.textContent;
    copyRoomCodeBtn.textContent = 'Copied ✓';
    copyRoomCodeBtn.disabled = true;

    setTimeout(() => {
      copyRoomCodeBtn.textContent = originalText;
      copyRoomCodeBtn.disabled = false;
    }, 2000);
  });
}

function sendChatMessage(event) {
  event.preventDefault();
  const content = chatInput.value.trim();
  if (!content) return;

  const username = usernameInput.value.trim() || currentUserName || 'Student';
  currentUserName = username;
  localStorage.setItem('codewithme-user', currentUserName);

  socket.emit('room-message', { roomCode, username, content });
  chatInput.value = '';
}

function askRoomAi() {
  const prompt = roomPrompt.value.trim();
  if (!prompt) return;

  const username = usernameInput.value.trim() || currentUserName || 'Student';
  currentUserName = username;
  localStorage.setItem('codewithme-user', currentUserName);

  socket.emit('ask-ai', { roomCode, prompt, username });
  roomPrompt.value = '';
  roomAiResponse.innerHTML = '<p>Asking Gemini for a shared answer…</p>';
}

if (!roomCode) {
  alert('Invalid room. Please return to the home page and join again.');
  window.location.href = '/';
}

/* ==========================================================================
   SOCKET EVENTS (UNCHANGED)
   ========================================================================== */
socket.on('connect', () => {
  updateRoomMeta(roomCode);
  socket.emit('join-room', { roomCode, username: currentUserName });
});

socket.on('room-joined', () => {
  const savedName = localStorage.getItem('codewithme-user');
  if (savedName) {
    usernameInput.value = savedName;
  }
});

socket.on('room-history', (messages) => {
  chatMessages.innerHTML = '';
  messages.forEach(addChatMessage);
});

socket.on('room-members', updateMembers);

socket.on('new-message', addChatMessage);

socket.on('ai-response', (message) => {
  addChatMessage(message);
  showRoomAiResponse(message.text);
});

socket.on('room-error', (message) => {
  alert(message);
  window.location.href = '/';
});

socket.on('ai-error', (message) => {
  roomAiResponse.innerHTML = `<p>${escapeHtml(message)}</p>`;
});

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  setThemeFromStorage();

  if (typeof marked !== 'undefined') {
    setupMarkedRenderer();
  }

  copyRoomCodeBtn.addEventListener('click', copyRoomCode);
  askRoomAiBtn.addEventListener('click', askRoomAi);
  clearRoomAiBtn.addEventListener('click', () => {
    roomPrompt.value = '';
    roomAiResponse.innerHTML = '';
  });
  chatForm.addEventListener('submit', sendChatMessage);
  toggleTheme.addEventListener('click', toggleThemeMode);
});