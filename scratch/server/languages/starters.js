/**
 * Resolver from a registry `starterGenerator` name to the function that implements it.
 *
 * The registry holds generator NAMES rather than function references, because it is
 * imported by the browser bundle and must stay free of imports. This module is the
 * server-side other half: it is where a name becomes code.
 *
 * Anything that needs "render the starter for language X" goes through here, so there
 * is one mapping instead of a per-language script that knows its own renderer.
 */
import { getLanguage, listLanguages } from './registry.js';
import { renderCppStarter } from '../scripts/lib/cpp-infer.mjs';
import { renderJavaStarter } from './java.js';
import { renderCStarter } from './c.js';

const RENDERERS = Object.freeze({
  'cpp-signature': renderCppStarter,
  'java-signature': renderJavaStarter,
  'c-signature': renderCStarter,
});

/**
 * The starter renderer for a language, or null when it has none.
 *
 * A null means "this language takes its shape from the submitted source", which is
 * true of JavaScript and Python: there is no signature to render a starter from, and
 * their starters are hand-written in the seed files.
 */
export function resolveStarterRenderer(language) {
  const def = getLanguage(language);
  if (!def || def.signatureStrategy !== 'signature') return null;
  return RENDERERS[def.starterGenerator] || null;
}

/** Languages that have a generated starter, in registry order. */
export function languagesWithGeneratedStarters() {
  return listLanguages()
    .filter((l) => resolveStarterRenderer(l.key) !== null)
    .map((l) => l.key);
}
