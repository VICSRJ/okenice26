(() => {
  'use strict';

  // Static-site safety layer. Never patches browser prototypes.
  // Remote HTTP/HTTPS favicon loading remains allowed.
  const isFileUrl = value => /^\s*file:/i.test(String(value || ''));
  const isJavascriptUrl = value => /^\s*javascript:/i.test(String(value || ''));
  const isHttpUrl = value => /^\s*https?:/i.test(String(value || ''));
  const isDataImage = value => /^\s*data:image\//i.test(String(value || ''));

  const safeImageUrl = value => {
    const raw = String(value || '').trim();
    if (!raw || isFileUrl(raw)) return '';
    if (isDataImage(raw)) return raw;

    try {
      const url = new URL(raw, document.baseURI);
      if (isFileUrl(url.href) || isJavascriptUrl(url.href)) return '';
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
      if (url.origin === window.location.origin) return `${url.pathname}${url.search}${url.hash}`;
    } catch {}

    return '';
  };

  const sanitize = root => {
    if (!root || !root.querySelectorAll) return;

    root.querySelectorAll('a[href], img[src]').forEach(node => {
      if (node instanceof HTMLAnchorElement) {
        const href = node.getAttribute('href');
        if (isFileUrl(href) || isJavascriptUrl(href)) {
          node.removeAttribute('href');
          node.setAttribute('aria-disabled', 'true');
        }
      }

      if (node instanceof HTMLImageElement) {
        const src = node.getAttribute('src');
        const safe = safeImageUrl(src);
        if (safe && safe !== src) node.setAttribute('src', safe);
        else if (!safe && src) node.removeAttribute('src');
      }
    });
  };

  const boot = () => {
    sanitize(document);

    new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) sanitize(node);
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
