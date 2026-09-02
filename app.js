(() => {
  'use strict';

  const start = document.getElementById('start-button');
  const clock = document.getElementById('clock');

  start?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  function updateClock() {
    if (clock) {
      clock.textContent = new Date().toLocaleTimeString('cs-CZ', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  updateClock();
  window.setInterval(updateClock, 1000);
})();
