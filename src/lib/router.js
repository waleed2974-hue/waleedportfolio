import siteData from '../data/site.json';

const listeners = new Set();
let currentRoute = { path: '/', params: {}, hash: '' };

export function parsePath(pathname, hash = '') {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  
  if (cleanPath === '/') {
    return { path: '/', params: {}, hash };
  }
  
  const workMatch = cleanPath.match(/^\/work\/([a-zA-Z0-9_-]+)$/);
  if (workMatch) {
    return { path: '/work/:slug', params: { slug: workMatch[1] }, hash };
  }
  
  if (cleanPath === '/updates') {
    return { path: '/updates', params: {}, hash };
  }
  
  if (cleanPath === '/about') {
    return { path: '/about', params: {}, hash };
  }

  if (cleanPath === '/admin') {
    return { path: '/admin', params: {}, hash };
  }

  // Fallback to root if unknown
  return { path: '/', params: {}, hash };
}

export function updateMeta(title, description) {
  if (title) {
    document.title = title;
  }
  if (description) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', description);
    }
  }
}

export function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn(currentRoute);
    } catch (err) {
      console.error('Error in route listener:', err);
    }
  });
}

export function navigate(url, replace = false) {
  const parsedUrl = new URL(url, window.location.origin);
  const newRoute = parsePath(parsedUrl.pathname, parsedUrl.hash);

  if (
    currentRoute.path === newRoute.path &&
    JSON.stringify(currentRoute.params) === JSON.stringify(newRoute.params) &&
    currentRoute.hash === newRoute.hash
  ) {
    return;
  }

  currentRoute = newRoute;

  if (replace) {
    window.history.replaceState({ path: url }, '', url);
  } else {
    window.history.pushState({ path: url }, '', url);
  }

  notifyListeners();
}

export function onRoute(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getCurrentRoute() {
  return currentRoute;
}

export function initRouter() {
  currentRoute = parsePath(window.location.pathname, window.location.hash);

  window.addEventListener('popstate', () => {
    currentRoute = parsePath(window.location.pathname, window.location.hash);
    notifyListeners();
  });

  // Intercept internal link clicks
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Ignore external links, mailto, tel, or links with target="_blank"
    if (
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      link.target === '_blank'
    ) {
      return;
    }

    // Intercept client routing
    e.preventDefault();
    navigate(href);
  });

  // Initial trigger
  notifyListeners();
}
