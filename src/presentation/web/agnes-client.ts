export const agnesClientScript = `
(() => {
  const navButtons = Array.from(document.querySelectorAll('[data-nav]'));
  const views = Array.from(document.querySelectorAll('[data-view]'));
  const moduleButtons = Array.from(document.querySelectorAll('[data-module]'));
  const detailLayer = document.querySelector('[data-module-detail]');
  const assistantLayer = document.querySelector('[data-assistant-layer]');
  const assistantButton = document.querySelector('[data-agnes-control]');
  const liveClock = document.querySelector('[data-live-clock]');

  const showView = (viewId) => {
    for (const view of views) {
      const active = view.getAttribute('data-view') === viewId;
      view.setAttribute('data-active', active ? 'true' : 'false');
      view.hidden = !active;
    }

    for (const button of navButtons) {
      const active = button.getAttribute('data-nav') === viewId;
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    }
  };

  for (const button of navButtons) {
    button.addEventListener('click', () => {
      const viewId = button.getAttribute('data-nav');
      if (viewId) showView(viewId);
    });
  }

  const closeDetail = () => {
    if (!detailLayer) return;
    detailLayer.setAttribute('data-open', 'false');
    detailLayer.setAttribute('aria-hidden', 'true');
  };

  for (const button of moduleButtons) {
    button.addEventListener('click', () => {
      if (!detailLayer) return;
      const title = button.getAttribute('data-title') || 'AGNES';
      const subtitle = button.getAttribute('data-subtitle') || '';
      const summary = button.getAttribute('data-summary') || '';
      const prompt = button.getAttribute('data-prompt') || '';
      const titleTarget = detailLayer.querySelector('[data-detail-title]');
      const subtitleTarget = detailLayer.querySelector('[data-detail-subtitle]');
      const summaryTarget = detailLayer.querySelector('[data-detail-summary]');
      const promptTarget = detailLayer.querySelector('[data-detail-prompt]');
      if (titleTarget) titleTarget.textContent = title;
      if (subtitleTarget) subtitleTarget.textContent = subtitle;
      if (summaryTarget) summaryTarget.textContent = summary;
      if (promptTarget) promptTarget.textContent = prompt;
      detailLayer.setAttribute('data-open', 'true');
      detailLayer.setAttribute('aria-hidden', 'false');
    });
  }

  const detailClose = document.querySelector('[data-detail-close]');
  if (detailClose) detailClose.addEventListener('click', closeDetail);

  const closeAssistant = () => {
    if (!assistantLayer) return;
    assistantLayer.setAttribute('data-open', 'false');
    assistantLayer.setAttribute('aria-hidden', 'true');
  };

  if (assistantButton) {
    assistantButton.addEventListener('click', () => {
      if (!assistantLayer) return;
      assistantLayer.setAttribute('data-open', 'true');
      assistantLayer.setAttribute('aria-hidden', 'false');
    });
  }

  const assistantClose = document.querySelector('[data-assistant-close]');
  if (assistantClose) assistantClose.addEventListener('click', closeAssistant);

  const updateClock = () => {
    if (!liveClock) return;
    const formatted = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
    liveClock.textContent = formatted;
  };

  updateClock();
  window.setInterval(updateClock, 30000);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeDetail();
      closeAssistant();
    }
  });

  showView('home');
})();
`;
