// Keep game windows in the document. Native modal dialogs can leave fullscreen
// on mobile browsers when they are promoted into the browser's top layer.
export function createGameDialog(document, dialog, backdrop, background, dismiss) {
  let wasInert = false, presented = false;
  const controls = () => [...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')]
    .filter(node => !node.hidden && node.getClientRects().length);
  function show() {
    if (!presented) {
      wasInert = !!background.inert;
      presented = true;
    }
    if (!dialog.open) dialog.show();
    background.inert = true;
    backdrop.hidden = false;
    backdrop.classList.toggle('space-choice', dialog.classList.contains('space-choice'));
    dialog.setAttribute('aria-modal', 'true');
    document.body.classList.add('dialog-open');
  }
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    presented = false;
    background.inert = wasInert;
    backdrop.hidden = true;
    dialog.removeAttribute('aria-modal');
    document.body.classList.remove('dialog-open');
  });
  backdrop.addEventListener('click', () => { if (dialog.open) dismiss(); });
  document.addEventListener('keydown', event => {
    if (!dialog.open) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      if (!event.repeat) dismiss();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const items = controls(), index = items.indexOf(document.activeElement);
      const next = index < 0 ? (event.shiftKey ? items.length - 1 : 0)
        : (index + (event.shiftKey ? -1 : 1) + items.length) % items.length;
      (items[next] || dialog).focus({ preventScroll: true });
    }
  }, true);
  document.addEventListener('focusin', event => {
    if (dialog.open && !dialog.contains(event.target)) (controls()[0] || dialog).focus({ preventScroll: true });
  });
  return { show };
}
