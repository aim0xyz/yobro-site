const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
const root = document.documentElement;
const story = document.querySelector("[data-scroll-story]");
const scrollVideo = document.querySelector("[data-scroll-video]");
const browserShell = document.querySelector(".browser-shell");
const indexItems = [...document.querySelectorAll(".story-index span")];
const sideItems = [...document.querySelectorAll(".side-item")];
const kinetic = document.querySelector("[data-kinetic]");
const nav = document.querySelector(".nav");
const motionSections = [...document.querySelectorAll("[data-motion-section]")];


document.querySelectorAll("#year").forEach((year) => {
  year.textContent = new Date().getFullYear();
});

document.querySelectorAll("[data-language]").forEach((link) => {
  link.addEventListener("click", () =>
    localStorage.setItem("yobro-language", link.dataset.language),
  );
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.14 },
);

document.querySelectorAll(".reveal").forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index % 3, 2) * 90}ms`;
  observer.observe(element);
});

let targetProgress = 0;
let smoothProgress = 0;
let activeScene = -1;
let rafPending = false;
let videoDuration = 0;
let scrollDirty = true;
let previousRenderTime = null;
// The source is 24 fps; the scrub encode has a keyframe every four frames.
const videoFPS = 24;
let lastVideoFrame = 0;
let wantedVideoFrame = 0;
let requestedVideoFrame = -1;
let videoSeekStarted = 0;
let videoSeekTimer = null;
const videoSeekTimeout = 750;
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

// Keep a single pending target and a watchdog independent of scroll events.
// Some decoders stay in `seeking` or drop readyState while decoding a jump.
function scheduleVideoSeek() {
  if (videoSeekTimer !== null) return;
  videoSeekTimer = setTimeout(() => {
    videoSeekTimer = null;
    seekLatestVideoFrame();
  }, 100);
}

function seekLatestVideoFrame() {
  if (!scrollVideo || !videoDuration || scrollVideo.error || document.hidden) return;
  const now = performance.now();
  const pending = requestedVideoFrame >= 0;
  const timedOut = pending && now - videoSeekStarted >= videoSeekTimeout;

  if (scrollVideo.seeking && !timedOut) {
    // Also watch seeks initiated by the browser itself.
    if (!pending) {
      requestedVideoFrame = wantedVideoFrame;
      videoSeekStarted = now;
    }
    scheduleVideoSeek();
    return;
  }
  // HAVE_METADATA is enough to request a seek. Waiting for HAVE_CURRENT_DATA
  // here can deadlock when the old frame is no longer buffered.
  if (scrollVideo.readyState < 1) {
    scheduleVideoSeek();
    return;
  }
  const targetTime = Math.min(videoDuration - 0.001, (wantedVideoFrame + 0.125) / videoFPS);
  if (!scrollVideo.seeking && scrollVideo.readyState >= 2 &&
      Math.abs(scrollVideo.currentTime - targetTime) < 0.5 / videoFPS) {
    requestedVideoFrame = -1;
    clearTimeout(videoSeekTimer);
    videoSeekTimer = null;
    return;
  }
  if (pending && !timedOut) {
    scheduleVideoSeek();
    return;
  }
  try {
    scrollVideo.currentTime = targetTime;
    requestedVideoFrame = wantedVideoFrame;
    videoSeekStarted = now;
  } catch {
    // Metadata can disappear during a source reload; retry after it returns.
    requestedVideoFrame = -1;
  }
  scheduleVideoSeek();
}

function updateVideoTarget() {
  wantedVideoFrame = Math.round((reducedMotion ? 0 : targetProgress) * lastVideoFrame);
  seekLatestVideoFrame();
}

if (scrollVideo) {
  scrollVideo.loop = false;
  scrollVideo.autoplay = false;
  scrollVideo.pause();
  const prepareScrollVideo = () => {
    if (!Number.isFinite(scrollVideo.duration) || scrollVideo.duration <= 0) return;
    videoDuration = scrollVideo.duration;
    lastVideoFrame = Math.max(0, Math.round(videoDuration * videoFPS) - 1);
    requestedVideoFrame = -1;
    updateVideoTarget();
  };
  scrollVideo.addEventListener("loadedmetadata", prepareScrollVideo);
  scrollVideo.addEventListener("loadeddata", updateVideoTarget);
  scrollVideo.addEventListener("canplay", updateVideoTarget);
  // A completed seek releases the queue; always follow the newest scroll target.
  scrollVideo.addEventListener("seeked", () => {
    requestedVideoFrame = -1;
    seekLatestVideoFrame();
  });
  document.addEventListener("visibilitychange", updateVideoTarget);
  window.addEventListener("pageshow", updateVideoTarget);
  scrollVideo.addEventListener("play", () => scrollVideo.pause());
  if (scrollVideo.readyState >= 1) prepareScrollVideo();
}

function scheduleScrollRender() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(renderScroll);
}

function requestScrollUpdate() {
  scrollDirty = true;
  scheduleScrollRender();
}

function measureScroll() {
  if (reducedMotion) return;
  if (story) {
    const rect = story.getBoundingClientRect();
    const distance = Math.max(1, story.offsetHeight - window.innerHeight);
    targetProgress = clamp(-rect.top / distance);
    root.style.setProperty("--story-fade-progress", targetProgress.toFixed(4));
  }
  const pageDistance = Math.max(
    1,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  root.style.setProperty(
    "--page-progress",
    clamp(window.scrollY / pageDistance),
  );
  if (kinetic) {
    const kineticRect = kinetic.getBoundingClientRect();
    const kineticDistance = Math.max(1, kinetic.offsetHeight + window.innerHeight);
    kinetic.style.setProperty(
      "--kinetic-progress",
      clamp((window.innerHeight - kineticRect.top) / kineticDistance).toFixed(4),
    );
  }
  nav?.classList.toggle("is-condensed", window.scrollY > window.innerHeight * 0.65);
  if (browserShell) {
    const browserRect = browserShell.getBoundingClientRect();
    const browserHasTakenOver =
      targetProgress > 0.32 &&
      browserRect.bottom > 24 &&
      browserRect.top < window.innerHeight - 24;
    nav?.classList.toggle("is-story-hidden", browserHasTakenOver);
  }
  motionSections.forEach((section) => {
    const sectionRect = section.getBoundingClientRect();
    const travel = section.offsetHeight + window.innerHeight;
    const localProgress = clamp((window.innerHeight - sectionRect.top) / travel);
    section.style.setProperty("--local-progress", localProgress.toFixed(4));
  });
  updateVideoTarget();
}

if (!reducedMotion && finePointer) {
  document.querySelectorAll(".principle").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const box = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - box.left}px`);
      card.style.setProperty("--my", `${event.clientY - box.top}px`);
    });
  });
}

function renderScroll(timestamp) {
  if (scrollDirty) {
    scrollDirty = false;
    measureScroll();
  }
  const elapsed = previousRenderTime === null ? 1000 / 60 : Math.min(64, timestamp - previousRenderTime);
  previousRenderTime = timestamp;
  // Time-based easing behaves the same on 60 Hz and 120 Hz displays.
  smoothProgress += (targetProgress - smoothProgress) * (1 - Math.exp(-elapsed / 55));
  if (Math.abs(targetProgress - smoothProgress) <= 0.0001) smoothProgress = targetProgress;
  const entrance = clamp(smoothProgress / 0.2);
  const browserEntrance = clamp((smoothProgress - 0.24) / 0.34);
  const journey = clamp((smoothProgress - 0.58) / 0.37);
  const scene = Math.round(journey * 3);

  root.style.setProperty("--story-progress", entrance.toFixed(4));
  root.style.setProperty("--browser-progress", browserEntrance.toFixed(4));
  root.style.setProperty("--feed-offset", `${(-journey * 75).toFixed(6)}%`);

  if (scene !== activeScene) {
    activeScene = scene;
    document.querySelector(".native-mail")?.classList.toggle("is-active", scene === 1);
    indexItems.forEach((item, index) =>
      item.classList.toggle("is-current", index === scene),
    );
    sideItems.forEach((item, index) => {
      const shouldHighlight = scene === 1 ? index === 1 : index === 0;
      item.classList.toggle("is-active", shouldHighlight);
    });
  }

  rafPending = false;
  if (smoothProgress !== targetProgress || scrollDirty) {
    scheduleScrollRender();
  } else {
    previousRenderTime = null;
  }
}

if (!reducedMotion) {
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate, { passive: true });
  window.addEventListener("pageshow", requestScrollUpdate);
  requestScrollUpdate();
}

if (!reducedMotion && finePointer) {
  document.querySelectorAll(".magnetic").forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      const box = button.getBoundingClientRect();
      const x = (event.clientX - box.left - box.width / 2) * 0.12;
      const y = (event.clientY - box.top - box.height / 2) * 0.16;
      button.style.transform = `translate(${x}px,${y}px)`;
    });
    button.addEventListener("pointerleave", () => {
      button.style.transform = "";
    });
  });
}
