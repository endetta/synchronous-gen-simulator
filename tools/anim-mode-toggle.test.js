#!/usr/bin/env node
/**
 * Regression test for repeated phasor/realistic mode switches.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML_PATH = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');

function extractAnimModeHandler(html) {
  const start = html.indexOf('function setAnimMode(mode){');
  const end = html.indexOf('function updTrack(el){', start);
  assert(start >= 0, 'setAnimMode function not found');
  assert(end > start, 'setAnimMode end marker not found');
  return html.slice(start, end);
}

function createHandlerHarness(handlerCode) {
  const context = {
    console: { warn() {} },
    S: { animMode: 'phasor' },
    document: {
      getElementById(id) {
        if (id === 'svgPhasor') return {};
        return { classList: { toggle() {} } };
      },
    },
  };

  vm.createContext(context);
  vm.runInContext(`
    let phasorReady = true;
    let realInit = true;
    ${handlerCode}
    globalThis.setReady = () => {
      phasorReady = true;
      realInit = true;
    };
    globalThis.readState = () => ({
      phasorReady,
      realInit,
      animMode: S.animMode,
    });
  `, context);
  return context;
}

function testAnimModeToggle() {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const handlerCode = extractAnimModeHandler(html);

  assert.match(handlerCode, /phasorReady\s*=\s*false/);
  assert.match(handlerCode, /realInit\s*=\s*false/);
  assert.doesNotMatch(handlerCode, /rsReady/);

  const context = createHandlerHarness(handlerCode);
  const sequence = ['phasor', 'realistic', 'phasor', 'realistic'];

  for (const mode of sequence) {
    context.setReady();
    context.setAnimMode(mode);
    const state = context.readState();
    assert.strictEqual(state.phasorReady, false);
    assert.strictEqual(state.realInit, false);
    assert.strictEqual(state.animMode, mode);
  }

  console.log('Animation mode toggle regression test passed.');
}

testAnimModeToggle();
