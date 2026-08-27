/**
 * Client-side decryption for private articles (envelope encryption).
 *
 * private.data.js only contains ciphertext + wrapped data keys.
 * The password never leaves the browser; decryption happens locally with
 * WebCrypto (PBKDF2-SHA256 + AES-256-GCM) — requires HTTPS (GitHub Pages ✓).
 */
import { privateConfig, privatePosts } from "./private.data.js";

const ADMIN_KEY_STORAGE = "weather-blog-admin-key";
const enc = new TextEncoder();
const dec = new TextDecoder();

/** In-memory cache: slug → decrypted post payload (lost on refresh). */
const unlockedCache = new Map();

function b64decode(value) {
  const bin = atob(String(value));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64encode(bytes) {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}

function findPrivate(slug) {
  return privatePosts.find((post) => post.slug === slug) || null;
}

/** PBKDF2-SHA256 → 256-bit AES-GCM key (extractable so admin can persist it). */
async function deriveKey(password) {
  const material = await crypto.subtle.importKey(
    "raw",
    enc.encode(String(password)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: b64decode(privateConfig.salt),
      iterations: privateConfig.iterations,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    true,
    ["decrypt"],
  );
}

/** Unwrap this grant's data key, then decrypt the article payload. */
async function unlockWithKey(key, article, grantEntry) {
  try {
    const dek = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64decode(grantEntry.iv) },
      key,
      b64decode(grantEntry.data),
    );
    const dekKey = await crypto.subtle.importKey(
      "raw",
      dek,
      "AES-GCM",
      false,
      ["decrypt"],
    );
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64decode(article.cipher.iv) },
      dekKey,
      b64decode(article.cipher.data),
    );
    return JSON.parse(dec.decode(plain));
  } catch {
    return null;
  }
}

// --- Admin key persistence (免密) -------------------------------------------

function storeAdminKey(key) {
  try {
    return crypto.subtle.exportKey("raw", key).then((raw) => {
      localStorage.setItem(ADMIN_KEY_STORAGE, b64encode(new Uint8Array(raw)));
    });
  } catch {
    return Promise.resolve();
  }
}

function loadAdminKey() {
  try {
    const stored = localStorage.getItem(ADMIN_KEY_STORAGE);
    if (!stored) return null;
    return crypto.subtle.importKey(
      "raw",
      b64decode(stored),
      "AES-GCM",
      true,
      ["decrypt"],
    );
  } catch {
    return null;
  }
}

export function hasAdminKey() {
  try {
    return Boolean(localStorage.getItem(ADMIN_KEY_STORAGE));
  } catch {
    return false;
  }
}

export function clearAdminKey() {
  try {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
  } catch {
    /* storage unavailable */
  }
}

/** Forget every decrypted payload (called when the admin locks the site). */
export function clearUnlocked() {
  unlockedCache.clear();
}

// --- Public API --------------------------------------------------------------

export function getUnlocked(slug) {
  return unlockedCache.get(slug) || null;
}

export function cacheUnlocked(slug, payload) {
  unlockedCache.set(slug, payload);
}

/**
 * Try a password against one article. Returns the decrypted payload on
 * success (null on wrong password / no grant). Admin unlocks are persisted.
 */
export async function tryUnlock(slug, password) {
  const entry = findPrivate(slug);
  if (!entry || !password) return null;

  const key = await deriveKey(password);
  for (const grant of entry.keys) {
    const payload = await unlockWithKey(key, entry, grant);
    if (payload) {
      unlockedCache.set(slug, payload);
      if (grant.grant === "admin") await storeAdminKey(key);
      return payload;
    }
  }
  return null;
}

/**
 * If an admin key is remembered, try to open the article without a password.
 * Returns payload, or null if no key / key no longer valid (salt changed).
 */
export async function autoUnlockAdmin(slug) {
  const entry = findPrivate(slug);
  if (!entry) return null;

  const key = await loadAdminKey();
  if (!key) return null;

  const adminGrant = entry.keys.find((grant) => grant.grant === "admin");
  if (!adminGrant) return null;

  const payload = await unlockWithKey(key, entry, adminGrant);
  if (payload) unlockedCache.set(slug, payload);
  return payload;
}
