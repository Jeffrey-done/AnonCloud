
/**
 * AnonCloud Crypto Service
 * 基于 Web Crypto API 的端到端加密实现
 */

const ITERATIONS = 100000;
const ALGO = 'AES-GCM';

// 将字符串转为 ArrayBuffer
const enc = new TextEncoder();
const dec = new TextDecoder();

/**
 * 从房间号和密码派生密钥
 * @param roomCode 房间号（作为 Salt 之一）
 * @param password 房间密码
 */
export async function deriveKey(roomCode: string, password: string): Promise<CryptoKey> {
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

  // 将 IV 和密文合并并转为 Base64
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
