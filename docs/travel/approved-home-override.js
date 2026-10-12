import { hydrateApprovedReferenceHome, renderApprovedReferenceHome } from './approved-home.js';

const view = document.querySelector('#view');

function syncApprovedExploreHome() {
  if (!view) return;
  const explore = view.querySelector('[data-view="explore"]');
  if (!explore || explore.classList.contains('approved-reference-home')) return;
  view.innerHTML = renderApprovedReferenceHome();
  hydrateApprovedReferenceHome(view);
}

syncApprovedExploreHome();

if (view) {
  const observer = new MutationObserver(() => syncApprovedExploreHome());
  observer.observe(view, { childList: true });
}
