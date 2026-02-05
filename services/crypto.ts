
/**
 * AnonCloud Crypto Service
 * 基于 Web Crypto API 的端到端加密实现
 */

const ITERATIONS = 10000;
const ALGO = 'AES-GCM';

const enc = new TextEncoder();
const dec = new TextDecoder();

/**
 * 健壮的 Uint8Array 转 Base64
 * 解决大数组 Spread 导致栈溢出的问题
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * 健壮的 Base64 转 Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function isCryptoSupported(): boolean {
  return !!(window.crypto && window.crypto.subtle);
}

/**
 * 从房间号和密码派生密钥
 * 强制规范化房间号作为盐值
 */
export async function deriveKey(roomCode: string, password: string): Promise<CryptoKey> {
  if (!isCryptoSupported()) {
    throw new Error('当前环境不支持加密（需 HTTPS）');
  }

  const normalizedSalt = roomCode.trim().toUpperCase();

  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(normalizedSalt),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: ALGO, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptContent(key: CryptoKey, plainText: string): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = enc.encode(plainText);
  
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    encoded
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return bytesToBase64(combined);
}

export async function decryptContent(key: CryptoKey, base64Data: string): Promise<string | null> {
  try {
    const combined = base64ToBytes(base64Data);
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      ciphertext
    );

    return dec.decode(decrypted);
  } catch (e) {
    console.error('Decryption failed:', e);
    return null;
  }
}
