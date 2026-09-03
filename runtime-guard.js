(() => {
  'use strict';

  // GitHub Pages must stay entirely on web-safe resources.
  // Prevent remote favicon/icon probing and any accidental file:/// references.
  const localFallbackIcon = 'data/icons/png/folder.png';

  const isBlockedUrl = value => {
    if (!value) return false;
    const raw = String(value).trim();
    if (/^file:/i.test(raw)) return true;
    try {
      const url = new URL(raw, document.baseURI);
      return url.protocol === 'file:' || !/^(https?:|data:|$)/i.test(url.protocol);
    } catch {
      return false;
    }
  };

  const sanitizeNode = node => {
    if (!(node instanceof Element)) return;

    if (node.matches('a[href]') && isBlockedUrl(node.getAttribute('href'))) {
      node.removeAttribute('href');
      node.setAttribute('aria-disabled', 'true');
    }

    if (node.matches('img[src]')) {
      const src = node.getAttribute('src');
      // Only local/data images are allowed. External web images are deliberately
      // suppressed because many sites send restrictive CORP headers for favicons.
      if (src && (/^https?:/i.test(src) || isBlockedUrl(src))) {
        node.setAttribute('src', localFallbackIcon);
        node.removeAttribute('data-favicon-fallbacks');
      }
    }
  };

  const originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    if (this instanceof HTMLImageElement && name.toLowerCase() === 'src') {
      if (/^https?:/i.test(String(value)) || isBlockedUrl(value)) value = localFallbackIcon;
    }
    if (this instanceof HTMLAnchorElement && name.toLowerCase() === 'href' && isBlockedUrl(value)) {
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
