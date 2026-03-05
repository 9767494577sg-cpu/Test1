/* ============================================================
   FitLife PWA - AI Fitness Coach
   ============================================================ */

async function loadAICoach() {
  try {
    const [history, plan] = await Promise.all([
      api('GET', '/api/ai/history'),
      api('GET', '/api/ai/plan'),
    ]);
    renderChatHistory(history);
    renderAIPlan(plan);
  } catch (e) {
    toast('Failed to load AI Coach: ' + e.message, 'error');
  }
}

function renderChatHistory(messages) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  if (!messages.length) {
    container.innerHTML = `
      <div class="chat-msg assistant">
        Hi! 👋 I'm your AI Fitness Coach. I'm here to help you with workouts, nutrition, recovery, and motivation!
        <br><br>Try asking me:
        <br>• "Give me a workout plan"
        <br>• "How do I lose weight?"
        <br>• "I feel tired today"
        <br>• "Nutrition tips"
      </div>
    `;
    return;
  }
  container.innerHTML = messages.map(m => `
    <div class="chat-msg ${m.role}">${m.message}</div>
  `).join('');
  container.scrollTop = container.scrollHeight;
}

function renderAIPlan(plan) {
  const container = document.getElementById('ai-weekly-plan');
  if (!container) return;
  container.innerHTML = plan.weekly_plan.map(day => {
    const icons = { workout: '💪', active_recovery: '🚶', cardio: '🏃', strength: '🏋️', hiit: '🔥', yoga: '🧘', recovery: '🌿' };
    const icon = icons[day.category] || icons[day.type] || '📋';
    return `
      <div class="card mb-1 flex items-center gap-1">
        <span style="font-size:1.3rem;flex-shrink:0">${icon}</span>
        <div style="flex:1">
          <div class="font-bold text-sm">${day.day}</div>
          <div class="text-sm text-secondary">${day.workout}</div>
        </div>
        <div class="text-right">
          <div class="text-sm text-muted">${day.duration} min</div>
          <span class="badge badge-primary text-sm">${day.category}</span>
        </div>
      </div>
    `;
  }).join('');

  const tipsContainer = document.getElementById('ai-tips');
  if (tipsContainer && plan.tips) {
    tipsContainer.innerHTML = plan.tips.map(tip => `
      <div class="flex gap-1 items-center mb-1">
        <span style="color:var(--success);flex-shrink:0">✓</span>
        <span class="text-sm text-secondary">${tip}</span>
      </div>
    `).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-chat');
  const input = document.getElementById('chat-input');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = input.value.trim();
      if (!msg) return;
      input.value = '';
      input.disabled = true;

      // Add user message immediately
      const container = document.getElementById('chat-messages');
      const userMsg = document.createElement('div');
      userMsg.className = 'chat-msg user';
      userMsg.textContent = msg;
      container.appendChild(userMsg);
      container.scrollTop = container.scrollHeight;

      // Add thinking indicator
      const thinking = document.createElement('div');
      thinking.className = 'chat-msg assistant';
      thinking.innerHTML = '<span class="animate-pulse">🤔 Thinking...</span>';
      container.appendChild(thinking);
      container.scrollTop = container.scrollHeight;

      try {
        const response = await api('POST', '/api/ai/chat', { message: msg });
        thinking.textContent = response.response;
        container.scrollTop = container.scrollHeight;
      } catch (e) {
        thinking.textContent = 'Sorry, I had trouble responding. Please try again!';
        toast(e.message, 'error');
      } finally {
        input.disabled = false;
        input.focus();
      }
    });
  }
});
