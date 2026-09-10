import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

function setup(file) {
  let now = 0;
  let id = 0;
  const timers = new Map();
  const listeners = {};
  const seeks = [];
  const video = {
    duration: 10, readyState: 2, seeking: false, error: null,
    pause() {}, addEventListener(name, callback) { listeners[name] = callback; },
    get currentTime() { return this.time ?? 0; },
    set currentTime(value) { this.time = value; this.seeking = true; seeks.push(value); },
  };
  const context = vm.createContext({
    scrollVideo: video, reducedMotion: false,
    document: { hidden: false, addEventListener() {} },
    window: { addEventListener() {} },
    performance: { now: () => now },
    setTimeout(callback) { timers.set(++id, callback); return id; },
    clearTimeout(timer) { timers.delete(timer); },
  });
  const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  vm.runInContext(source.slice(source.indexOf('let targetProgress'), source.indexOf('function scheduleScrollRender')), context);
  return {
    video, seeks, timers,
    target(value) { vm.runInContext(`targetProgress = ${value}; updateVideoTarget();`, context); },
    finish() { video.seeking = false; video.readyState = 2; listeners.seeked(); },
    tick(ms) { now += ms; const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); },
  };
}

for (const file of ['public/script.js', 'script.js']) {
  test(`${file}: rapid reversals keep only the latest target`, () => {
    const c = setup(file);
    c.target(0.9);
    const count = c.seeks.length;
    for (let i = 0; i < 100; i++) c.target(i % 2 ? 0.2 : 0.8);
    assert.equal(c.seeks.length, count);
    c.finish();
    assert.ok(Math.abs(c.seeks.at(-1) - 2) < 0.05);
    c.finish();
    assert.equal(c.timers.size, 0);
  });
  test(`${file}: stuck seek recovers without another scroll event`, () => {
    const c = setup(file);
    c.target(0.9);
    c.video.readyState = 1;
    c.target(0.1);
    c.tick(800);
    assert.ok(Math.abs(c.seeks.at(-1) - 1) < 0.05);
    c.finish();
    assert.equal(c.timers.size, 0);
  });
  test(`${file}: metadata-only state allows seeking`, () => {
    const c = setup(file);
    c.video.readyState = 1;
    c.target(0.5);
    assert.ok(Math.abs(c.seeks.at(-1) - 5) < 0.05);
  });
  test(`${file}: missing seeked event does not block the latest target`, () => {
    const c = setup(file);
    c.target(0.8);
    c.target(0.3);
    c.video.seeking = false;
    c.tick(800);
    assert.ok(Math.abs(c.seeks.at(-1) - 3) < 0.05);
    c.finish();
    assert.equal(c.timers.size, 0);
  });
}
