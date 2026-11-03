/**
 * IntersectionObserver manager for in-view video playback.
 * Ensures videos only play while visible in the viewport and pause when scrolled away.
 */

let observer = null;

export function initVideoObserver() {
  if (observer) return observer;

  if (typeof IntersectionObserver === 'undefined') {
    return null;
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          video.muted = true;
          video.setAttribute('playsinline', '');
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              // Browser autoplay policy suppression fallback
            });
          }
        } else {
          if (!video.paused) {
            video.pause();
          }
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '50px 0px 50px 0px'
    }
  );

  return observer;
}

export function observeVideos(container = document) {
  const obs = initVideoObserver();
  if (!obs) return;

  const videos = container.querySelectorAll('video');
  videos.forEach((vid) => obs.observe(vid));
}

export function unobserveVideo(video) {
  if (observer && video) {
    observer.unobserve(video);
  }
}
