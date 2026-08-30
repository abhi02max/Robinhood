/**
 * Text-level editing helpers for the curriculum seed JSON files.
 *
 * WHY NOT JSON.parse + JSON.stringify
 * -----------------------------------
 * These files are hand-maintained and reviewed as diffs. `JSON.stringify(doc, null, 2)`
 * does not round-trip them: it puts every element of every test-case array on its own
 * line, turning a 32 KB file into 52 KB and a two-line change into a 20,000-line diff.
 * So the backfill scripts parse to *decide* what to add and then splice the new key in
 * as text, leaving every other byte untouched.
 *
 * Shared by backfill-cpp-signatures.js and backfill-cpp-starters.js, which both need
 * the same brace matching and the same refusal to guess when a slug is ambiguous.
 */

/**
 * Index of the `}` that closes the object opening at `open`, ignoring braces inside
 * string literals.
 *
 * `starter_code` values are source code, and source code is full of braces, so a naive
 * depth counter closes the object in the middle of a string and the splice lands in
 * the wrong place.
 */
export function matchBrace(text, open) {
  let depth = 0;
  let inString = false;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Locate one problem's `"slug": "..."` line, refusing to proceed if it is not unique.
 *
 * A duplicated slug within a file would make every offset below it ambiguous, and
 * writing to the wrong problem is worse than writing to none.
 */
export function findSlug(raw, slug) {
  const token = `"slug": ${JSON.stringify(slug)}`;
  const first = raw.indexOf(token);
  if (first === -1) return { error: `could not find ${token} in the file` };
  if (raw.indexOf(token, first + 1) !== -1) {
    return { error: `${token} appears more than once; refusing to guess which problem` };
  }
  return { at: first, token };
}

/**
 * Bounds and indentation of the object under `key` belonging to the problem at `from`.
 * Returns { open, close, indent } or { error }.
 */
export function findObjectBlock(raw, from, key) {
  const keyIdx = raw.indexOf(`"${key}"`, from);
  if (keyIdx === -1) return { error: `no ${key} block after the slug` };
  const open = raw.indexOf('{', keyIdx);
  if (open === -1) return { error: `${key} is not an object` };
  const close = matchBrace(raw, open);
  if (close === -1) return { error: `unbalanced braces in ${key}` };
  const lineStart = raw.lastIndexOf('\n', keyIdx) + 1;
  const indent = raw.slice(lineStart, keyIdx).match(/^[ \t]*/)[0];
  return { open, close, indent };
}

/**
 * Splice a new `"key": value` pair in as the LAST member of an existing object
 * block, matching the indentation of the members already there.
 *
 * `cpp_signature` is a sibling of `starter_code` and goes after its closing brace,
 * but a C++ starter goes *inside* `starter_code`, which needs the trailing comma on
 * the other side and the inner indent rather than the outer one.
 *
 * Inserting after the last non-whitespace byte (not immediately before `close`)
 * keeps the closing brace on its own line where the file already had it.
 *
 * @param {string} raw whole file text
 * @param {{ open: number, close: number, indent: string }} block from findObjectBlock
 * @param {string} member rendered member text, e.g. `"cpp": "..."`
 * @returns {{ at: number, text: string } | { error: string }}
 */
export function insertObjectMember(raw, block, member) {
  let i = block.close - 1;
  while (i > block.open && /\s/.test(raw[i])) i -= 1;
  if (i <= block.open) {
    // An empty `{}` gives no existing member to copy the formatting from, and
    // guessing it produces a diff that does not match the rest of the file.
    return { error: 'object has no existing members; refusing to guess formatting' };
  }
  if (raw[i] === ',') {
    return { error: 'object ends with a trailing comma; refusing to edit' };
  }
  return { at: i + 1, text: `,\n${block.indent}  ${member}` };
}

/**
 * Apply splices to a string. Sorted back-to-front so earlier offsets stay valid.
 * Each edit is `{ at, text }`.
 */
export function applyInsertions(raw, edits) {
  let next = raw;
  for (const ins of [...edits].sort((a, b) => b.at - a.at)) {
    next = next.slice(0, ins.at) + ins.text + next.slice(ins.at);
  }
  return next;
}

/**
 * Guard against a splice that changed more than the one key it was meant to add.
 *
 * Both sides are re-parsed with `keys` stripped from every problem; anything else
 * differing means the text edit corrupted the file, and the caller must not write it.
 */
export function assertOnlyKeysAdded(rawBefore, rawAfter, keys) {
  const strip = (text) => {
    const doc = JSON.parse(text);
    const list = Array.isArray(doc.problems) ? doc.problems : Array.isArray(doc) ? doc : [doc];
    for (const p of list) {
      for (const k of keys) {
        if (k.includes('.')) {
          const [outer, inner] = k.split('.');
          if (p[outer] && typeof p[outer] === 'object') delete p[outer][inner];
        } else {
          delete p[k];
        }
      }
    }
    return JSON.stringify(doc);
  };
  return strip(rawBefore) === strip(rawAfter);
}
