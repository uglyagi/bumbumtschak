import test from 'node:test';
import assert from 'node:assert/strict';
import { createFullscreenMode } from '../fullscreen.js';

function harness(kind = 'standard', orientation = null) {
  const listeners = new Map(), changes = [], calls = [];
  const doc = { documentElement: {}, addEventListener: (type, fn) => listeners.set(type, fn) };
  const dispatch = type => listeners.get(type)?.();
  const root = doc.documentElement;
  if (kind === 'standard') {
    doc.fullscreenEnabled = true;
    root.requestFullscreen = function (options) { calls.push(['enter', this, options]); doc.fullscreenElement = root; dispatch('fullscreenchange'); return Promise.resolve(); };
    doc.exitFullscreen = function () { calls.push(['exit', this]); doc.fullscreenElement = null; dispatch('fullscreenchange'); return Promise.resolve(); };
  } else if (kind === 'webkit') {
    doc.webkitFullscreenEnabled = true;
    root.webkitRequestFullscreen = function () { calls.push(['enter', this]); doc.webkitFullscreenElement = root; dispatch('webkitfullscreenchange'); };
    doc.webkitExitFullscreen = function () { calls.push(['exit', this]); doc.webkitFullscreenElement = null; dispatch('webkitfullscreenchange'); };
  }
  return { doc, root, calls, changes, dispatch, mode: createFullscreenMode(doc, active => changes.push(active), orientation) };
}

test('native fullscreen uses the whole document so dialogs and touch controls stay inside it', async () => {
  const h = harness(); assert.equal(h.mode.active, false); assert.equal(h.calls.length, 0);
  await h.mode.toggle(); assert(h.mode.active); assert.equal(h.doc.fullscreenElement, h.root);
  assert.equal(h.calls[0][1], h.root); assert.deepEqual(h.calls[0][2], { navigationUI: 'hide' });
  await h.mode.toggle(); assert.equal(h.mode.active, false); assert.equal(h.doc.fullscreenElement, null);
  assert.equal(h.calls[1][1], h.doc); assert.deepEqual(h.changes, [true, false]);
});

test('the browser exit gesture restores the normal view and permits a later entry', async () => {
  const h = harness(); await h.mode.toggle(); h.doc.fullscreenElement = null; h.dispatch('fullscreenchange');
  assert.equal(h.mode.active, false); assert.deepEqual(h.changes, [true, false]);
  await h.mode.toggle(); assert(h.mode.active); await h.mode.leave(); assert.equal(h.mode.active, false);
});

test('unavailable, disabled or rejected fullscreen retains a usable viewport-filling view with a working exit', async () => {
  for (const kind of ['missing', 'disabled', 'rejected']) {
    const h = harness('missing');
    if (kind === 'disabled') { h.doc.fullscreenEnabled = false; h.root.requestFullscreen = () => { throw new Error('must not call disabled API'); }; }
    if (kind === 'rejected') h.root.requestFullscreen = () => Promise.reject(new TypeError('unavailable'));
    await h.mode.toggle(); assert(h.mode.active, kind); await h.mode.leave(); assert.equal(h.mode.active, false, kind);
    assert.deepEqual(h.changes, [true, false]);
  }
});

test('the prefixed fullscreen API enters and exits with the correct owning elements', async () => {
  const h = harness('webkit'); await h.mode.toggle(); assert(h.mode.active); assert.equal(h.doc.webkitFullscreenElement, h.root);
  await h.mode.leave(); assert.equal(h.mode.active, false); assert.equal(h.doc.webkitFullscreenElement, null);
  assert.equal(h.calls[0][1], h.root); assert.equal(h.calls[1][1], h.doc);
});

test('leaving while a native request is pending cannot reopen fullscreen afterwards', async () => {
  const h = harness(); let finish;
  h.root.requestFullscreen = () => new Promise(resolve => { finish = () => { h.doc.fullscreenElement = h.root; h.dispatch('fullscreenchange'); resolve(); }; });
  const opening = h.mode.toggle(); assert(h.mode.active); await h.mode.leave(); assert.equal(h.mode.active, false);
  finish(); await opening; assert.equal(h.mode.active, false); assert.equal(h.doc.fullscreenElement, null);
});


test('entering fullscreen locks landscape after the native request and leaving unlocks it',async()=>{
 const events=[],orientation={lock:async mode=>events.push('lock:'+mode),unlock:()=>events.push('unlock')};const h=harness('standard',orientation);
 const enter=h.root.requestFullscreen;h.root.requestFullscreen=function(options){events.push('enter');return enter.call(this,options);};
 await h.mode.toggle();assert.deepEqual(events,['enter','lock:landscape']);assert(h.mode.active);
 h.doc.fullscreenElement=null;h.dispatch('fullscreenchange');assert.deepEqual(events,['enter','lock:landscape','unlock']);assert.equal(h.mode.active,false);
});

test('a rejected orientation lock leaves the layout fallback available',async()=>{
 let unlocks=0;const h=harness('missing',{lock:()=>Promise.reject(new Error('not supported')),unlock:()=>unlocks++});
 await h.mode.toggle();assert(h.mode.active);await h.mode.leave();assert.equal(h.mode.active,false);assert.equal(unlocks,0);
});

test('an orientation lock which finishes after leaving is released immediately',async()=>{
 let finish,unlocks=0;const h=harness('missing',{lock:()=>new Promise(resolve=>{finish=resolve;}),unlock:()=>unlocks++});
 const opening=h.mode.toggle();await h.mode.leave();finish();await opening;assert.equal(h.mode.active,false);assert.equal(unlocks,1);
});
