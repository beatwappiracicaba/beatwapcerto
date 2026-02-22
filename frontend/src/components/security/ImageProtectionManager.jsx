import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

const isWhitelisted = (img) => {
  if (!img) return true;
  if (img.closest('.permitir-download')) return true;
  if (img.getAttribute('data-download') === 'true') return true;
  if (img.closest('.reactEasyCrop_Container')) return true;
  if ((img.className || '').includes('reactEasyCrop_Image')) return true;
  return false;
};

const canConvertToBackground = (img) => {
  if (!img) return false;
  const alt = img.getAttribute('alt') || '';
  const role = img.getAttribute('role') || '';
  const ariaHidden = img.getAttribute('aria-hidden') || '';
  const seo = img.getAttribute('data-seo') || '';
  if (seo === 'true') return false;
  if (role === 'presentation' || ariaHidden === 'true') return true;
  if (alt.trim() === '') return true;
  return false;
};

const wrapWithProtection = (img, withWatermark) => {
  if (!img || img.closest('.bw-protect')) return;
  const wrapper = document.createElement('span');
  wrapper.className = 'bw-protect';
  if (withWatermark) wrapper.classList.add('bw-watermark');
  const parent = img.parentNode;
  if (!parent) return;
  parent.insertBefore(wrapper, img);
  wrapper.appendChild(img);
};

const applyBasicGuards = (img) => {
  if (!img) return;
  img.setAttribute('draggable', 'false');
  img.style.userSelect = 'none';
  const preventCtx = (e) => e.preventDefault();
  const preventDrag = (e) => {
    e.preventDefault();
    return false;
  };
  if (!img.__bw_ctx__) {
    img.addEventListener('contextmenu', preventCtx);
    img.__bw_ctx__ = true;
  }
  if (!img.__bw_drag__) {
    img.addEventListener('dragstart', preventDrag);
    img.__bw_drag__ = true;
  }
};

const convertToBackground = (img) => {
  if (!img || img.__bw_converted__) return;
  const src = img.currentSrc || img.src;
  if (!src) return;
  const div = document.createElement('div');
  div.className = img.className;
  div.setAttribute('role', img.getAttribute('role') || 'img');
  if (img.getAttribute('aria-label')) {
    div.setAttribute('aria-label', img.getAttribute('aria-label'));
  } else if (img.getAttribute('alt')) {
    div.setAttribute('aria-label', img.getAttribute('alt'));
  }
  if (img.width && img.height) {
    div.style.width = img.width + 'px';
    div.style.height = img.height + 'px';
  }
  div.style.backgroundImage = `url("${src}")`;
  div.style.backgroundSize = 'cover';
  div.style.backgroundPosition = 'center';
  div.style.backgroundRepeat = 'no-repeat';
  const parent = img.parentNode;
  if (!parent) return;
  parent.replaceChild(div, img);
  div.classList.add('bw-bg-converted');
  div.setAttribute('data-bw-bg', 'true');
};

const proxifySrc = (img) => {
  if (!img) return;
  const src = img.getAttribute('src') || '';
  if (!src) return;
  try {
    const u = new URL(src, window.location.href);
    const host = u.host;
    const isSameOrigin = host === window.location.host;
    if (!isSameOrigin && !img.getAttribute('data-no-proxy')) {
      return;
    }
  } catch (e) { void 0; }
};

export const ImageProtectionManager = () => {
  const { user } = useAuth();
  const observerRef = useRef(null);

  useEffect(() => {
    const withWatermark = !user;
    const toggleWatermark = () => {
      const wrappers = Array.from(document.querySelectorAll('.bw-protect'));
      wrappers.forEach((w) => {
        if (withWatermark) {
          w.classList.add('bw-watermark');
        } else {
          w.classList.remove('bw-watermark');
        }
      });
    };
    toggleWatermark();
    const protect = (img) => {
      if (!img || isWhitelisted(img)) return;
      wrapWithProtection(img, withWatermark);
      applyBasicGuards(img);
      if (canConvertToBackground(img)) {
        convertToBackground(img);
      }
      proxifySrc(img);
    };

    const initial = Array.from(document.querySelectorAll('img'));
    initial.forEach(protect);

    observerRef.current = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.tagName === 'IMG') {
              protect(node);
            } else {
              const imgs = node.querySelectorAll && node.querySelectorAll('img');
              if (imgs && imgs.length) {
                imgs.forEach(protect);
              }
            }
          }
        });
      });
    });
    observerRef.current.observe(document.documentElement, { childList: true, subtree: true });
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [user]);

  return null;
};
