/* ==========================================================================
   ELEMENT REFERENCES & GLOBAL STATE (UNCHANGED)
   ========================================================================== */
const homePrompt = document.getElementById('homePrompt');
const askAiBtn = document.getElementById('askAiBtn');
const clearAiBtn = document.getElementById('clearAiBtn');
const homeResponse = document.getElementById('homeResponse');
const createRoomBtn = document.getElementById('createRoomBtn');
const openJoinFormBtn = document.getElementById('openJoinFormBtn');
const copyRoomCodeBtn = document.getElementById('copyRoomCodeBtn');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const joinFormWrapper = document.getElementById('joinFormWrapper');
const joinRoomInput = document.getElementById('joinRoomInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const toggleTheme = document.getElementById('toggleTheme');

let currentRoomCode = '';

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

/* ==========================================================================
   MODIFIED: MARKDOWN RENDERING & SYNTAX HIGHLIGHTING (ISSUES 2 & 3 FIXED)
   ========================================================================== */

/**
 * Configure Marked.js to custom render code blocks with syntax highlighting 
 * and a Copy button, supporting language detection and full Markdown elements.
 */
function setupMarkedRenderer() {
  const renderer = new marked.Renderer();

  // CHANGE MADE (ISSUE 2): Updated marked.js code renderer signature and structure
  // Handles both string code input and code blocks cleanly for all languages.
  renderer.code = function (code, infostring, escaped) {
    // Handle marked.js object or string parameter signatures safely
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
        // Automatic language detection fallback
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

    // CHANGE MADE (ISSUE 2): Render Language Header & Copy Button wrapper
    return `
      <div class="code-block-wrapper" style="position: relative; margin: 1rem 0; border-radius: 8px; overflow: hidden; background: #1e1e1e; color: #d4d4d4;">
        <div class="code-block-header" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 14px; background: #2d2d2d; font-size: 0.8rem; color: #aaa; border-bottom: 1px solid #333;">
          <span class="code-lang" style="font-weight: 600; text-transform: uppercase;">${escapeHtml(displayLang)}</span>
          <button class="copy-code-btn" onclick="copyCodeBlock(this)" style="background: rgba(255, 255, 255, 0.1); border: 1px solid #555; color: #ccc; border-radius: 4px; padding: 3px 10px; font-size: 0.75rem; cursor: pointer; transition: all 0.2s;">Copy</button>
        </div>
        <pre style="margin: 0; padding: 14px; overflow-x: auto;"><code class="hljs ${escapeHtml(displayLang)}">${highlightedCode}</code></pre>
      </div>
    `;
  };

  // CHANGE MADE (ISSUE 3): Standard Markdown options (Headings, Lists, Tables, Blockquotes, HR, Inline Code)
  marked.setOptions({
    renderer: renderer,
    gfm: true,        // GitHub Flavored Markdown (tables, tasklists, etc.)
    breaks: true,     // Convert \n to <br>
    sanitize: false   // Output parsed HTML cleanly
  });
}

/**
 * Global helper function attached to window for handling Copy button clicks.
 * Copies raw code string to clipboard and displays "Copied ✓" for 2 seconds.
 */
window.copyCodeBlock = function (buttonElement) {
  const container = buttonElement.closest('.code-block-wrapper');
  if (!container) return;

  const codeElement = container.querySelector('code');
  if (!codeElement) return;

  // Get original unformatted text from code element
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
 * MODIFIED (ISSUES 1 & 4 FIXED): Converts input to String safely before parsing.
 * Prevents "text.replace is not a function" errors and handles null/undefined/object responses cleanly.
 */
function formatAnswer(text) {
  // CHANGE MADE (ISSUE 4): Safe checking for null, undefined, objects, or empty inputs
  if (text === null || text === undefined || text === '') {
    return '<p>No response received from AI.</p>';
  }

  // Extract text property if response object is passed
  if (typeof text === 'object') {
    text = text.answer || text.response || text.message || JSON.stringify(text);
  }

  // CHANGE MADE (ISSUE 1): Ensure 'text' is strictly converted to a String primitive
  const safeText = String(text).trim();

  if (!safeText) {
    return '<p>No response received from AI.</p>';
  }

  // Parse with Marked if loaded, else fallback safely
  if (typeof marked !== 'undefined') {
    try {
      return marked.parse(safeText);
    } catch (e) {
      console.error('Marked parsing error:', e);
      return `<p>${escapeHtml(safeText).replace(/\n/g, '<br>')}</p>`;
    }
  }

  // Fallback if Marked.js library fails to load
  return `<p>${escapeHtml(safeText).replace(/\n/g, '<br>')}</p>`;
}

/* ==========================================================================
   HELPER UTILITIES (UNCHANGED)
   ========================================================================== */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showMessage(message, type = 'info') {
  homeResponse.innerHTML = `<p class="${type}">${escapeHtml(message)}</p>`;
}

/* ==========================================================================
   AI REQUEST & ROOM MANAGEMENT LOGIC (UNCHANGED)
   ========================================================================== */
async function askAI() {
  const prompt = homePrompt.value.trim();
  if (!prompt) {
    showMessage('Please write a programming question first.', 'warning');
    return;
  }

  askAiBtn.disabled = true;
  askAiBtn.textContent = 'Thinking...';
  homeResponse.innerHTML = '<p>Waiting for Gemini to answer...</p>';

  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'AI request failed.');
    }

    // Passed safely into formatAnswer
    homeResponse.innerHTML = formatAnswer(data.answer);
  } catch (error) {
    homeResponse.innerHTML = `<p>${escapeHtml(error.message || 'Unable to reach the AI service.')}</p>`;
  } finally {
    askAiBtn.disabled = false;
    askAiBtn.textContent = 'Ask AI';
  }
}

async function createRoom() {
  createRoomBtn.disabled = true;
  createRoomBtn.textContent = 'Generating...';

  try {
    const response = await fetch('/api/create-room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to create room.');
    }

    currentRoomCode = data.roomCode;
    roomCodeDisplay.textContent = currentRoomCode;
    copyRoomCodeBtn.disabled = false;
    joinFormWrapper.classList.add('hidden');
  } catch (error) {
    roomCodeDisplay.textContent = 'Error creating room. Try again.';
    console.error(error);
  } finally {
    createRoomBtn.disabled = false;
    createRoomBtn.textContent = 'Create Room';
  }
}

function copyRoomCode() {
  if (!currentRoomCode) return;
  navigator.clipboard.writeText(currentRoomCode);
}

function toggleJoinForm() {
  joinFormWrapper.classList.toggle('hidden');
}

async function joinRoom() {
  const rawCode = joinRoomInput.value.trim().toUpperCase();
  if (!rawCode) {
    showMessage('Enter a valid room code first.', 'warning');
    return;
  }

  joinRoomBtn.disabled = true;
  joinRoomBtn.textContent = 'Joining...';

  try {
    const response = await fetch('/api/join-room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ roomCode: rawCode })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Room not found.');
    }

    window.location.href = `/room?code=${encodeURIComponent(data.roomCode)}`;
  } catch (error) {
    showMessage(error.message, 'warning');
  } finally {
    joinRoomBtn.disabled = false;
    joinRoomBtn.textContent = 'Join';
  }
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  setThemeFromStorage();
  
  // Initialize Marked renderer options for code highlighting and custom tags
  if (typeof marked !== 'undefined') {
    setupMarkedRenderer();
  }

  askAiBtn.addEventListener('click', askAI);
  clearAiBtn.addEventListener('click', () => {
    homePrompt.value = '';
    homeResponse.innerHTML = '';
  });
  createRoomBtn.addEventListener('click', createRoom);
  openJoinFormBtn.addEventListener('click', toggleJoinForm);
  copyRoomCodeBtn.addEventListener('click', copyRoomCode);
  joinRoomBtn.addEventListener('click', joinRoom);
  toggleTheme.addEventListener('click', toggleThemeMode);
});