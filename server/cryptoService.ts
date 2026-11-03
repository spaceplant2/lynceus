import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { EncryptedField } from '../src/types/power.ts';

export class CryptoService {
  private configDir: string;
  private currentMasterKey: Buffer;
  private keySource: 'env' | 'fallback_file';
  private keyVersion: number = 1;

  constructor(configDir: string) {
    this.configDir = configDir;
    const { key, source } = this.resolveMasterKey();
    this.currentMasterKey = key;
    this.keySource = source;
  }

  private resolveMasterKey(): { key: Buffer; source: 'env' | 'fallback_file' } {
    const envKey = process.env.LYNCEUS_MASTER_KEY || process.env.MASTER_KEY;
    if (envKey && envKey.trim().length > 0) {
      const derived = crypto.createHash('sha256').update(envKey.trim()).digest();
      return { key: derived, source: 'env' };
    }

    // Fallback: file stored in secure config dir
    const keyFilePath = path.join(this.configDir, '.master.key');
    if (fs.existsSync(keyFilePath)) {
      try {
        const fileContent = fs.readFileSync(keyFilePath, 'utf-8').trim();
        const derived = crypto.createHash('sha256').update(fileContent).digest();
        return { key: derived, source: 'fallback_file' };
      } catch (err) {
        console.error('[CryptoService] Failed to read fallback key file:', err);
      }
    }

    // Auto-generate a secure random 32-byte key if no env var or file exists
    console.warn(
      '[CryptoService] No LYNCEUS_MASTER_KEY environment variable detected. Generating persistent key in config/.master.key.'
    );
    const generated = crypto.randomBytes(32).toString('hex');
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      fs.writeFileSync(keyFilePath, generated, { mode: 0o600, encoding: 'utf-8' });
    } catch (err) {
      console.error('[CryptoService] Failed to persist fallback master key:', err);
    }

    const derived = crypto.createHash('sha256').update(generated).digest();
    return { key: derived, source: 'fallback_file' };
  }

  public deriveKey(rawKey: string): Buffer {
    return crypto.createHash('sha256').update(rawKey.trim()).digest();
  }

  public getCurrentKey(): Buffer {
    return this.currentMasterKey;
  }

  public setMasterKey(newKey: Buffer, source: 'env' | 'fallback_file'): void {
    this.currentMasterKey = newKey;
    this.keySource = source;
  }

  public getKeySource(): 'env' | 'fallback_file' {
    return this.keySource;
  }

  public getKeyFingerprint(key?: Buffer): string {
    const target = key || this.currentMasterKey;
    const hash = crypto.createHash('sha256').update(target).digest('hex');
    return `SHA256:${hash.slice(0, 8)}...${hash.slice(-8)}`;
  }

  /**
   * AES-256-GCM Per-Record Encryption
   * Uses a fresh, non-reusable 12-byte (96-bit) IV for every record
   * Returns ciphertext, IV, authentication tag, and key version
   */
  public encrypt(plaintext: string, key?: Buffer, version: number = 1): EncryptedField {
    const keyToUse = key || this.currentMasterKey;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyToUse, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      version,
    };
  }

  /**
   * AES-256-GCM Per-Record Decryption with Tamper Verification
   */
  public decrypt(field: EncryptedField, key?: Buffer): string {
    const keyToUse = key || this.currentMasterKey;
    const iv = Buffer.from(field.iv, 'hex');
    const tag = Buffer.from(field.tag, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyToUse, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(field.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Password Hashing (PBKDF2 with SHA-512) for Dashboard Login
   */
  public hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  public verifyPassword(password: string, stored: string): boolean {
    const [salt, originalHash] = stored.split(':');
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
  }
}
