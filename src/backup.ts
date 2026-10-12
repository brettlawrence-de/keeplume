import { MAX_BYTES, State, validate } from './model.js';
const utf8 = new TextEncoder(), decode = new TextDecoder('utf-8', { fatal: true });
const encode = (bytes: Uint8Array) => {
    let s = '';
    for (let i = 0; i < bytes.length; i += 32768)
        s += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(s);
};
const bytes = (value: string, max: number) => {
    if (typeof value !== 'string' || value.length > Math.ceil(max / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value))
        throw Error('Invalid encrypted backup.');
    const out = Uint8Array.from(atob(value), c => c.charCodeAt(0));
    if (out.length > max)
        throw Error('Backup is too large.');
    return out;
};
async function key(passphrase: string, salt: Uint8Array) { const raw = await crypto.subtle.importKey('raw', utf8.encode(passphrase), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: 600000 }, raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
export async function encrypt(state: State, passphrase: string): Promise<Blob> {
    if (passphrase.length < 12 || passphrase.length > 1024)
        throw Error('Choose a passphrase of at least 12 characters (up to 1,024).');
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const header = { format: 'Keeplume', version: 1, cipher: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iterations: 600000, salt: encode(salt), iv: encode(iv) };
    const aad = utf8.encode(JSON.stringify(header)), plain = utf8.encode(JSON.stringify(validate(state)));
    try {
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, await key(passphrase, salt), plain);
        return new Blob([JSON.stringify({ ...header, ciphertext: encode(new Uint8Array(ciphertext)) })], { type: 'application/json' });
    }
    finally {
        plain.fill(0);
    }
}
export async function decrypt(file: Blob, passphrase: string): Promise<State> {
    if (file.size > MAX_BYTES * 1.4 + 4096)
        throw Error('Backup exceeds the safety limit.');
    let envelope;
    try {
        envelope = JSON.parse(await file.text());
    }
    catch {
        throw Error('This is not a valid Keeplume backup.');
    }
    if (!envelope || envelope.format !== 'Keeplume' || envelope.version !== 1 || envelope.cipher !== 'AES-256-GCM' || envelope.kdf !== 'PBKDF2-SHA256' || envelope.iterations !== 600000)
        throw Error('Unsupported backup format. Nothing was changed.');
    if (passphrase.length > 1024)
        throw Error('Invalid passphrase length.');
    const salt = bytes(envelope.salt, 16), iv = bytes(envelope.iv, 12);
    if (salt.length !== 16 || iv.length !== 12)
        throw Error('Invalid encrypted backup.');
    const { format, version, cipher, kdf, iterations } = envelope;
    const aad = utf8.encode(JSON.stringify({ format, version, cipher, kdf, iterations, salt: envelope.salt, iv: envelope.iv }));
    let plain: Uint8Array;
    try {
        plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad, tagLength: 128 }, await key(passphrase, salt), bytes(envelope.ciphertext, MAX_BYTES + 16) as BufferSource));
    }
    catch {
        throw Error('Wrong passphrase or damaged backup. Nothing was changed.');
    }
    try {
        return validate(JSON.parse(decode.decode(plain)));
    }
    finally {
        plain.fill(0);
    }
}
