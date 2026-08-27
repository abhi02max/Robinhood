// ROBINHOOD - Notifications / Toast System
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('notification-container');
  if (!container) return;

  const icons = { success: 'check-circle', error: 'x-circle', info: 'info', warning: 'alert-triangle' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}" class="toast-icon" width="20" height="20"></i>
    <div class="toast-content">
      <div class="toast-message">${message}</div>
    </div>
  `;
  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons({ nodes: [toast] });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function showAchievement(name, emoji) {
  showToast(`🏆 Achievement Unlocked: ${emoji} ${name}`, 'success', 5000);
}
