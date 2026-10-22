import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameDialog } from '../game-dialog.js';

function harness(inert = false) {
  const listeners = new Map(), events = new Map(), classes = new Set(), attributes = new Map();
  const background = { inert }, backdrop = { hidden: true, classList: { toggle: (name, value) => value ? classes.add(name) : classes.delete(name) }, addEventListener: (type, fn) => events.set('backdrop:' + type, fn) };
  const document = { fullscreenElement: {}, activeElement: null, body: { classList: { add: name => classes.add(name), remove: name => classes.delete(name) } }, addEventListener: (type, fn) => listeners.set(type, fn) };
  const button = () => ({ hidden: false, getClientRects: () => [{}], focus() { document.activeElement = this; } });
  let controls = [button(), button(), button()], dismissals = 0, shows = 0;
  const dialog = { open: false, menu: false, classList: { contains: () => dialog.menu },
    show() { shows++; this.open = true; }, showModal() { throw new Error('Native modal presentation would exit fullscreen on affected browsers'); },
    addEventListener: (type, fn) => events.set(type, fn), querySelectorAll: () => controls,
    contains: node => node === dialog || controls.includes(node), focus() { document.activeElement = this; },
    setAttribute: (name, value) => attributes.set(name, value), removeAttribute: name => attributes.delete(name),
    close() { this.open = false; events.get('close')(); } };
  const api = createGameDialog(document, dialog, backdrop, background, () => { dismissals++; dialog.close(); });
  const key = (key, shiftKey = false, repeat = false) => {
    const event = { key, shiftKey, repeat, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
    listeners.get('keydown')(event); return event;
  };
  return { api, dialog, document, backdrop, background, attributes, classes, events, key,
    controls, setControls: items => { controls = items; }, focus: target => listeners.get('focusin')({ target }),
    get dismissals() { return dismissals; }, get shows() { return shows; } };
}

test('in-game windows leave native fullscreen in place and block the background until closed', () => {
  for (const inert of [false, true]) {
    const h = harness(inert), fullscreen = h.document.fullscreenElement;
    h.api.show(); assert(h.dialog.open); assert(h.background.inert); assert(!h.backdrop.hidden);
    assert.equal(h.document.fullscreenElement, fullscreen); assert.equal(h.attributes.get('aria-modal'), 'true');
    h.dialog.menu = true; h.api.show(); assert.equal(h.shows, 1); assert(h.classes.has('space-choice'));
    h.dialog.close(); assert.equal(h.background.inert, inert); assert(h.backdrop.hidden); assert(!h.classes.has('dialog-open'));
    assert(!h.attributes.has('aria-modal')); assert.equal(h.document.fullscreenElement, fullscreen);
  }
});

test('Tab, Shift+Tab and programmatic focus stay inside an open game window', () => {
  const h = harness(); h.api.show();
  h.controls.at(-1).focus(); assert(h.key('Tab').prevented); assert.equal(h.document.activeElement, h.controls[0]);
  h.key('Tab', true); assert.equal(h.document.activeElement, h.controls.at(-1));
  h.focus({}); assert.equal(h.document.activeElement, h.controls[0]);
  h.setControls([]); h.key('Tab'); assert.equal(h.document.activeElement, h.dialog);
  h.dialog.close(); assert(!h.key('Tab').prevented);
});

test('Escape and backdrop close only the game window and a stale close event cannot unlock a reopened window', () => {
  const h = harness(), fullscreen = h.document.fullscreenElement; h.api.show();
  h.key('Escape', false, true); assert.equal(h.dismissals, 0);
  const escape = h.key('Escape'); assert(escape.prevented && escape.stopped); assert.equal(h.dismissals, 1);
  assert.equal(h.document.fullscreenElement, fullscreen);
  h.api.show(); h.events.get('close')(); assert(h.background.inert); assert(!h.backdrop.hidden);
  h.events.get('backdrop:click')(); assert.equal(h.dismissals, 2); assert(h.backdrop.hidden);
  h.api.show(); h.dialog.open = false; h.api.show(); h.events.get('close')();
  assert(h.background.inert, 'a queued close event cannot unlock the replacement window');
  h.dialog.close(); assert.equal(h.background.inert, false, 'reopening before the close event does not retain our own temporary inert state');
});
