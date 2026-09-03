(() => {
  'use strict';

  // Browser-side safety layer for this static site.
  // Navigation accepts only http(s); image loading accepts http(s), data:image and same-origin assets.
  const isFileUrl = value => /^\s*file:/i.test(String(value || ''));
  const isHttpUrl = value => /^\s*https?:/i.test(String(value || ''));
  const isDataImage = value => /^\s*data:image\//i.test(String(value || ''));

  const safeImageUrl = value => {
    const raw = String(value || '').trim();
    if (!raw || isFileUrl(raw)) return '';
    if (isDataImage(raw)) return raw;

    try {
      const url = new URL(raw, document.baseURI);
      if (isFileUrl(url.href)) return '';
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
      if (url.protocol === 'data:') return isDataImage(url.href) ? url.href : '';
      if (url.origin === window.location.origin) return `${url.pathname}${url.search}${url.hash}`;
    } catch {}

    return '';
  };

  const sanitize = root => {
    const nodes = root?.querySelectorAll ? root.querySelectorAll('a[href], img[src]') : [];
    nodes.forEach(node => {
      if (node instanceof HTMLAnchorElement) {
        const href = node.getAttribute('href');
        if (isFileUrl(href)) {
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

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      record.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) sanitize(node);
      });
    });
  });

  const boot = () => {
    sanitize(document);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
