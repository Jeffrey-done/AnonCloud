
/**
 * AnonCloud Crypto Service
 * 基于 Web Crypto API 的端到端加密实现
 */

// 10,000 次迭代对于移动端是较好的平衡点，100,000 次在旧手机上可能导致 5-10s 的卡顿
const ITERATIONS = 10000;
const ALGO = 'AES-GCM';

const enc = new TextEncoder();
const dec = new TextDecoder();

/**
 * 检查当前环境是否支持加密
 */
export function isCryptoSupported(): boolean {
  return !!(window.crypto && window.crypto.subtle);
}

/**
 * 从房间号和密码派生密钥
 */
export async function deriveKey(roomCode: string, password: string): Promise<CryptoKey> {
  if (!isCryptoSupported()) {
    throw new Error('当前环境不支持加密（需 HTTPS）');
  }

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
      salt: enc.encode(roomCode),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: ALGO, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 加密内容
 */
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
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * 解密内容
 */
export async function decryptContent(key: CryptoKey, base64Data: string): Promise<string | null> {
  try {
    const combined = new Uint8Array(atob(base64Data).split('').map(c => c.charCodeAt(0)));
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
