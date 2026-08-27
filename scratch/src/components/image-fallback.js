function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderImageFallback({
  src = '',
  alt = 'image',
  width = 20,
  height = 20,
  className = '',
  fallbackHtml = '',
  fallbackText = '',
  style = '',
}) {
  const safeSrc = escapeHtml(src);
  const safeAlt = escapeHtml(alt);
  const safeFallbackText = escapeHtml(fallbackText);
  const fallback = fallbackHtml || `<span class="image-fallback-text">${safeFallbackText || '?'}</span>`;

  return `
    <span class="image-fallback ${className}" data-image-fallback style="width:${width}px;height:${height}px;${style}">
      ${safeSrc ? `
        <img
          src="${safeSrc}"
          alt="${safeAlt}"
          width="${width}"
          height="${height}"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          onerror="window.__handleImageFallbackError(event)"
        />
      ` : ''}
      <span class="image-fallback-slot ${safeSrc ? 'hidden' : ''}">${fallback}</span>
    </span>
  `;
}

if (!window.__handleImageFallbackError) {
  window.__handleImageFallbackError = (event) => {
    const img = event?.target;
    if (!img) return;
    const wrapper = img.closest('[data-image-fallback]');
    if (!wrapper) return;
    img.remove();
    const slot = wrapper.querySelector('.image-fallback-slot');
    if (slot) slot.classList.remove('hidden');
  };
}

