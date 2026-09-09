const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
const root = document.documentElement;
const story = document.querySelector("[data-scroll-story]");
const scrollVideo = document.querySelector("[data-scroll-video]");
const address = document.querySelector("[data-address]");
const indexItems = [...document.querySelectorAll(".story-index span")];
const sideItems = [...document.querySelectorAll(".side-item")];
const kinetic = document.querySelector("[data-kinetic]");
const nav = document.querySelector(".nav");

const addresses = [
  "yobro://home",
  "yobro://spaces",
  "yobro://agent/local",
  "yobro://privacy",
];

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
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

if (scrollVideo) {
  scrollVideo.loop = false;
  scrollVideo.autoplay = false;
  scrollVideo.pause();
  const prepareScrollVideo = () => {
    videoDuration = Math.max(0, scrollVideo.duration - 0.04);
    scrollVideo.currentTime = reducedMotion
      ? 0
      : targetProgress * videoDuration;
  };
  if (scrollVideo.readyState >= 1) {
    prepareScrollVideo();
  } else {
    scrollVideo.addEventListener("loadedmetadata", prepareScrollVideo, {
      once: true,
    });
  }
  scrollVideo.addEventListener("play", () => scrollVideo.pause());
}

function measureScroll() {
  if (reducedMotion) return;
  if (story) {
    const rect = story.getBoundingClientRect();
    const distance = Math.max(1, story.offsetHeight - window.innerHeight);
    targetProgress = clamp(-rect.top / distance);
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
    const kineticDistance = Math.max(1, kinetic.offsetHeight - window.innerHeight);
    root.style.setProperty(
      "--kinetic-progress",
      clamp(-kineticRect.top / kineticDistance).toFixed(4),
    );
  }
  nav?.classList.toggle("is-condensed", window.scrollY > window.innerHeight * 0.65);
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(renderScroll);
  }
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

function renderScroll() {
  smoothProgress += (targetProgress - smoothProgress) * 0.12;
  const entrance = clamp(smoothProgress / 0.2);
  const browserEntrance = clamp((smoothProgress - 0.24) / 0.34);
  const journey = clamp((smoothProgress - 0.3) / 0.65);
  const scene = Math.min(3, Math.floor(journey * 3.999));

  root.style.setProperty("--story-progress", entrance.toFixed(4));
  root.style.setProperty("--browser-progress", browserEntrance.toFixed(4));
  root.style.setProperty("--feed-offset", `${(-journey * 75).toFixed(3)}%`);

  if (scrollVideo && videoDuration && scrollVideo.readyState >= 2) {
    const requestedTime = smoothProgress * videoDuration;
    if (Math.abs(scrollVideo.currentTime - requestedTime) > 0.025) {
      scrollVideo.currentTime = requestedTime;
    }
  }

  if (scene !== activeScene) {
    activeScene = scene;
    if (address) address.textContent = addresses[scene];
    indexItems.forEach((item, index) =>
      item.classList.toggle("is-current", index === scene),
    );
    sideItems.forEach((item, index) => {
      const shouldHighlight = scene === 1 ? index === 1 : index === 0;
      item.classList.toggle("is-active", shouldHighlight);
    });
  }

  if (Math.abs(targetProgress - smoothProgress) > 0.0005) {
    requestAnimationFrame(renderScroll);
  } else {
    smoothProgress = targetProgress;
    rafPending = false;
  }
}

if (!reducedMotion) {
  window.addEventListener("scroll", measureScroll, { passive: true });
  window.addEventListener("resize", measureScroll, { passive: true });
  measureScroll();
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
