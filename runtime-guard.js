(() => {
  'use strict';

  // GitHub Pages must stay entirely on web-safe resources.
  // Prevent remote favicon/icon probing and accidental file:/// references.
  const localFallbackIcon = 'data/icons/png/folder.png';

  const isExplicitUnsafeUrl = value => {
    if (!value) return false;
    const raw = String(value).trim();
    return /^(?:file:|javascript:|vbscript:|data:text\/html)/i.test(raw);
  };

  const isRemoteImage = value => /^https?:/i.test(String(value || '').trim());

  const sanitizeNode = node => {
    if (!(node instanceof Element)) return;

    if (node.matches('a[href]') && isExplicitUnsafeUrl(node.getAttribute('href'))) {
      node.removeAttribute('href');
      node.setAttribute('aria-disabled', 'true');
    }

    if (node.matches('img[src]')) {
      const src = node.getAttribute('src');
      // Keep project-local paths and data images. Suppress external favicon loads:
      // many target sites send CORP headers that browsers reject when embedded.
      if (src && (isRemoteImage(src) || isExplicitUnsafeUrl(src))) {
        node.setAttribute('src', localFallbackIcon);
        node.removeAttribute('data-favicon-fallbacks');
      }
    }
  };

  const originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    const attribute = String(name).toLowerCase();
    if (this instanceof HTMLImageElement && attribute === 'src') {
      if (isRemoteImage(value) || isExplicitUnsafeUrl(value)) value = localFallbackIcon;
    }
    if (this instanceof HTMLAnchorElement && attribute === 'href' && isExplicitUnsafeUrl(value)) {
      this.removeAttribute('href');
      this.setAttribute('aria-disabled', 'true');
      return;
    }
    return originalSetAttribute.call(this, name, value);
  };

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      record.addedNodes.forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        sanitizeNode(node);
        node.querySelectorAll?.('a[href],img[src]').forEach(sanitizeNode);
      });
    });
  });

  const boot = () => {
    document.querySelectorAll('a[href],img[src]').forEach(sanitizeNode);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
