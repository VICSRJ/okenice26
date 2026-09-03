(() => {
  'use strict';

  // Only the two known mirrors of the Windows 98 folder asset are allowed remotely.
  const REMOTE_FOLDER_ICONS = new Set([
    'https://cdn.jsdelivr.net/gh/ryokun6/ryos@main/public/resources/windows-icon-catalogs/win98/folders/directory-closed.png',
    'https://raw.githubusercontent.com/ryokun6/ryos/main/public/resources/windows-icon-catalogs/win98/folders/directory-closed.png'
  ]);

  const isRemoteFolderIcon = value => {
    try {
      const url = new URL(String(value || ''), document.baseURI);
      return REMOTE_FOLDER_ICONS.has(url.href);
    } catch {
      return false;
    }
  };

  const isFileUrl = value => /^\s*file:/i.test(String(value || ''));
  const isHttpUrl = value => /^\s*https?:/i.test(String(value || ''));
  const isDataImage = value => /^\s*data:image\//i.test(String(value || ''));

  const dataImageFallback = image => {
    const raw = image?.getAttribute?.('data-favicon-fallbacks') || '';
    return raw.split('|').find(candidate => isDataImage(candidate)) || '';
  };

  const normalizeImageUrl = (image, value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (isFileUrl(raw)) return '';
    if (isDataImage(raw)) return raw;
    if (/data\/icons\/png\/folder\.png(?:$|[?#])/i.test(raw) || /(?:^|\/)folder\.png(?:$|[?#])/i.test(raw)) {
      return [...REMOTE_FOLDER_ICONS][0];
    }
    if (isRemoteFolderIcon(raw)) return raw;
    if (isHttpUrl(raw)) return dataImageFallback(image);
    try {
      const url = new URL(raw, document.baseURI);
      if (url.protocol === 'file:') return '';
      if (url.protocol === 'data:') return isDataImage(url.href) ? url.href : '';
      if (isRemoteFolderIcon(url.href)) return url.href;
      if (url.protocol === 'http:' || url.protocol === 'https:') return dataImageFallback(image);
      return url.pathname + url.search + url.hash;
    } catch {
      return '';
    }
  };

  const sanitizeElement = element => {
    if (!(element instanceof Element)) return;

    if (element.matches('a[href]')) {
      const href = element.getAttribute('href');
      if (isFileUrl(href)) {
        element.removeAttribute('href');
        element.setAttribute('aria-disabled', 'true');
      }
    }

    if (element instanceof HTMLImageElement && element.hasAttribute('src')) {
      const current = element.getAttribute('src');
      const safe = normalizeImageUrl(element, current);
      if (safe !== current) {
        if (safe) originalSetAttribute.call(element, 'src', safe);
        else element.removeAttribute('src');
      }
    }
  };

  const originalSetAttribute = Element.prototype.setAttribute;
  const originalSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');

  Element.prototype.setAttribute = function(name, value) {
    const key = String(name).toLowerCase();
    if (this instanceof HTMLAnchorElement && key === 'href' && isFileUrl(value)) {
      this.removeAttribute('href');
      originalSetAttribute.call(this, 'aria-disabled', 'true');
      return;
    }
    if (this instanceof HTMLImageElement && key === 'src') {
      const safe = normalizeImageUrl(this, value);
      if (!safe) {
        this.removeAttribute('src');
        return;
      }
      return originalSetAttribute.call(this, 'src', safe);
    }
    return originalSetAttribute.call(this, name, value);
  };

  if (originalSrc?.get && originalSrc?.set) {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      configurable: originalSrc.configurable,
      enumerable: originalSrc.enumerable,
      get: originalSrc.get,
      set(value) {
        const safe = normalizeImageUrl(this, value);
        if (!safe) {
          this.removeAttribute('src');
          return;
        }
        originalSrc.set.call(this, safe);
      }
    });
  }

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      record.addedNodes.forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        sanitizeElement(node);
        node.querySelectorAll?.('a[href],img[src]').forEach(sanitizeElement);
      });
    });
  });

  const boot = () => {
    document.querySelectorAll('a[href],img[src]').forEach(sanitizeElement);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
