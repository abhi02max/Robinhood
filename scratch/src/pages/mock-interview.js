// ROBINHOOD — Mock Interview Session (Layer 6)
import store from '../store.js';
import { renderAskRobinFab, renderAskRobinPanel } from '../components/ask-robin.js';

export function renderMockInterview() {
  return `
  <div class="mock-interview-page" style="display:flex;flex-direction:column;height:calc(100vh - 64px);max-width:1000px;margin:0 auto;">
    <div style="flex-shrink:0;padding:var(--sp-6) 0;border-bottom:1px solid var(--border-1);">
      <h1 class="page-title" style="margin-bottom:var(--sp-2);">Mock Session</h1>
      <p class="page-subtitle" style="margin-bottom:0;">Experience a grueling, elite Socratic interview.</p>
    </div>

    <!-- Configuration Panel (Visible before starting) -->
    <div id="mock-config-panel" class="anim-fade-up" style="padding:var(--sp-8) 0;">
      <div class="chart-card">
        <h2 style="font-family:var(--font-heading);font-size:var(--text-xl);font-weight:600;margin-bottom:var(--sp-4);">Choose Your Gauntlet</h2>
        <div style="display:flex;gap:var(--sp-4);margin-bottom:var(--sp-6);">
          <button class="btn btn-secondary mock-type-btn active" data-type="Behavioral" style="flex:1;padding:var(--sp-4);justify-content:center;">
             <div style="text-align:center;">
                <i data-lucide="users" width="24" height="24" style="margin-bottom:8px;color:var(--primary);"></i>
                <div style="font-weight:600;">Leadership & Behavioral</div>
                <div style="font-size:var(--text-xs);color:var(--text-3);margin-top:4px;">STAR Method, Conflict, Scale</div>
             </div>
          </button>
          <button class="btn btn-secondary mock-type-btn" data-type="SystemDesign" style="flex:1;padding:var(--sp-4);justify-content:center;">
             <div style="text-align:center;">
                <i data-lucide="database" width="24" height="24" style="margin-bottom:8px;color:var(--danger);"></i>
                <div style="font-weight:600;">System Design Arch</div>
                <div style="font-size:var(--text-xs);color:var(--text-3);margin-top:4px;">CAP Theorem, Scaling, Microservices</div>
             </div>
          </button>
        </div>
        <button id="start-mock-btn" class="btn btn-primary" style="width:100%;">
          <i data-lucide="play" width="16" height="16"></i> Start Interview
        </button>
      </div>
    </div>

    <!-- Active Interview Panel -->
    <div id="mock-active-panel" style="display:none;flex:1;flex-direction:column;min-height:0;">
      <div id="mock-chat-window" style="flex:1;overflow-y:auto;padding:var(--sp-6) 0;display:flex;flex-direction:column;gap:var(--sp-6);">
         <div style="text-align:center;color:var(--text-4);font-size:var(--text-sm);">
            Initializing simulation... The interviewer will speak shortly.
         </div>
      </div>
      
      <!-- Input -->
      <div style="padding:var(--sp-4) 0;border-top:1px solid var(--border-2);display:flex;gap:var(--sp-3);background:var(--bg-1);">
        <textarea id="mock-chat-input" placeholder="Respond to the interviewer..." style="flex:1;background:var(--bg-2);border:1px solid var(--border-2);color:var(--text-1);padding:12px;border-radius:12px;resize:none;min-height:48px;font-family:inherit;font-size:var(--text-sm);" rows="2"></textarea>
        <button id="mock-send-btn" class="btn btn-primary" style="height:48px;padding:0 var(--sp-5);">
          <i data-lucide="send" width="16" height="16"></i> Reply
        </button>
      </div>
    </div>
  </div>
  `;
}

export function initMockInterview() {
  if (window.lucide) window.lucide.createIcons();

  const configPanel = document.getElementById('mock-config-panel');
  const activePanel = document.getElementById('mock-active-panel');
  const typeBtns = document.querySelectorAll('.mock-type-btn');
  const startBtn = document.getElementById('start-mock-btn');
  
  const chatWindow = document.getElementById('mock-chat-window');
  const chatInput = document.getElementById('mock-chat-input');
  const sendBtn = document.getElementById('mock-send-btn');
  
  let selectedType = 'Behavioral';
  let chatHistory = [];
  let isStreaming = false;

  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedType = btn.dataset.type;
    });
  });

  function appendMessage(role, text) {
    const isUser = role === 'user';
    const msgDiv = document.createElement('div');
    msgDiv.style.display = 'flex';
    msgDiv.style.gap = '16px';
    msgDiv.style.maxWidth = '85%';
    msgDiv.style.alignSelf = isUser ? 'flex-end' : 'flex-start';
    msgDiv.style.flexDirection = isUser ? 'row-reverse' : 'row';
    msgDiv.className = 'anim-fade-up';

    const avatar = document.createElement('div');
    avatar.style.width = '36px';
    avatar.style.height = '36px';
    avatar.style.borderRadius = '50%';
    avatar.style.flexShrink = '0';
    avatar.style.display = 'flex';
    avatar.style.alignItems = 'center';
    avatar.style.justifyContent = 'center';
    avatar.style.fontWeight = 'bold';
    
    if (isUser) {
      avatar.style.background = 'var(--primary)';
      avatar.style.color = 'white';
      avatar.textContent = 'U';
    } else {
      avatar.style.background = 'var(--danger-muted)';
      avatar.style.color = 'var(--danger)';
      avatar.innerHTML = '<i data-lucide="briefcase" width="18" height="18"></i>';
    }

    const bubble = document.createElement('div');
    bubble.style.background = isUser ? 'var(--primary-muted)' : 'var(--bg-3)';
    bubble.style.border = '1px solid ' + (isUser ? 'var(--primary)' : 'var(--border-2)');
    bubble.style.color = 'var(--text-1)';
    bubble.style.padding = '12px 16px';
    bubble.style.borderRadius = '12px';
    if(isUser) bubble.style.borderTopRightRadius = '4px';
    else bubble.style.borderTopLeftRadius = '4px';
    bubble.style.fontSize = 'var(--text-sm)';
    bubble.style.lineHeight = '1.6';
    bubble.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    if (!isUser && window.lucide) {
      window.lucide.createIcons({ root: msgDiv });
    }

    return bubble;
  }

  async function triggerInterviewer(isInitial = false) {
    if (isStreaming) return;
    isStreaming = true;
    sendBtn.disabled = true;
    chatInput.disabled = true;

    if (isInitial) {
      chatWindow.innerHTML = ''; // clear loading text
      const prompt = selectedType === 'Behavioral' 
        ? "Hello. We are reviewing your past experience. Tell me about a time you had to resolve a deep technical disagreement within your team. What was the impact?" 
        : "Welcome to the system design round. I want you to design a globally distributed real-time chat application like WhatsApp. Describe the core high-level components first.";
      
      const msgBubble = appendMessage('interviewer', "");
      simulateTyping(msgBubble, prompt, () => {
        chatHistory.push({ role: 'assistant', content: prompt });
        isStreaming = false;
        sendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
      });
      return;
    }

    const msgBubble = appendMessage('interviewer', "");
    msgBubble.innerHTML = '<span class="pulse-dot"></span><span class="pulse-dot" style="animation-delay:0.2s"></span><span class="pulse-dot" style="animation-delay:0.4s"></span>';
    
    try {
      const response = await fetch('/api/ai/mock-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewType: selectedType,
          chatHistory: chatHistory,
          userId: store.get('user')?.id
        })
      });

      if (!response.ok) throw new Error('Network error');
      
      msgBubble.innerHTML = '';
      let fullText = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'message_delta') {
                fullText += data.delta?.text || '';
                msgBubble.innerHTML = escapeHtml(fullText).replace(/\n/g, '<br>');
                chatWindow.scrollTop = chatWindow.scrollHeight;
              } else if (data.type === 'error') {
                throw new Error(data.reason);
              }
            } catch(e) {}
          }
        }
      }
      
      chatHistory.push({ role: 'assistant', content: fullText });
    } catch(e) {
      msgBubble.innerHTML = '<span style="color:var(--danger)">Connection to interviewer lost. Retry.</span>';
    } finally {
      isStreaming = false;
      sendBtn.disabled = false;
      chatInput.disabled = false;
      chatInput.focus();
    }
  }

  function simulateTyping(element, text, callback) {
    let i = 0;
    const interval = setInterval(() => {
      element.innerHTML = escapeHtml(text.slice(0, i)) + '<span class="cursor">|</span>';
      i++;
      if (i > text.length) {
        clearInterval(interval);
        element.innerHTML = escapeHtml(text);
        if (callback) callback();
      }
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }, 20);
  }

  startBtn.addEventListener('click', () => {
    configPanel.style.display = 'none';
    activePanel.style.display = 'flex';
    triggerInterviewer(true);
  });

  const sendAction = () => {
    const text = chatInput.value.trim();
    if (!text || isStreaming) return;
    
    appendMessage('user', text);
    chatHistory.push({ role: 'user', content: text });
    chatInput.value = '';
    
    triggerInterviewer(false);
  };

  sendBtn.addEventListener('click', sendAction);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAction();
    }
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
