import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { CryptoService } from './cryptoService.ts';
import {
  VaultStatus,
  VaultCredentialItem,
  VaultUserItem,
  KeyRotationResult,
  EncryptedField,
  SnmpV3Config
} from '../src/types/power.ts';

export interface RawCredentialRow {
  id: string;
  label: string;
  snmp_version: string;
  community_ciphertext: string | null;
  community_iv: string | null;
  community_tag: string | null;
  v3_username: string | null;
  v3_security_level: string | null;
  v3_auth_protocol: string | null;
  v3_auth_key_ciphertext: string | null;
  v3_auth_key_iv: string | null;
  v3_auth_key_tag: string | null;
  v3_priv_protocol: string | null;
  v3_priv_key_ciphertext: string | null;
  v3_priv_key_iv: string | null;
  v3_priv_key_tag: string | null;
  v3_context: string | null;
  key_version: number;
  created_at: string;
  updated_at: string;
}

export interface RawAuthUserRow {
  id: string;
  username: string;
  password_hash: string;
  encrypted_password_ciphertext: string | null;
  encrypted_password_iv: string | null;
  encrypted_password_tag: string | null;
  key_version: number;
  role: string;
  created_at: string;
  updated_at: string;
}

export class VaultDb {
  private db: DatabaseSync;
  private dbPath: string;
  private cryptoService: CryptoService;

  constructor(configDir: string, cryptoService: CryptoService) {
    this.cryptoService = cryptoService;
    this.dbPath = path.join(configDir, 'vault.db');

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    this.db = new DatabaseSync(this.dbPath);
    this.initTables();
    this.seedDefaultCredentials();
  }

  private initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vault_metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS snmp_credentials (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        snmp_version TEXT NOT NULL,
        community_ciphertext TEXT,
        community_iv TEXT,
        community_tag TEXT,
        v3_username TEXT,
        v3_security_level TEXT,
        v3_auth_protocol TEXT,
        v3_auth_key_ciphertext TEXT,
        v3_auth_key_iv TEXT,
        v3_auth_key_tag TEXT,
        v3_priv_protocol TEXT,
        v3_priv_key_ciphertext TEXT,
        v3_priv_key_iv TEXT,
        v3_priv_key_tag TEXT,
        v3_context TEXT,
        key_version INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS auth_users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        encrypted_password_ciphertext TEXT,
        encrypted_password_iv TEXT,
        encrypted_password_tag TEXT,
        key_version INTEGER DEFAULT 1,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vault_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Ensure columns exist if table was created in a previous version
    try {
      this.db.exec(`ALTER TABLE auth_users ADD COLUMN encrypted_password_ciphertext TEXT;`);
    } catch {
      // Column already exists
    }
    try {
      this.db.exec(`ALTER TABLE auth_users ADD COLUMN encrypted_password_iv TEXT;`);
    } catch {
      // Column already exists
    }
    try {
      this.db.exec(`ALTER TABLE auth_users ADD COLUMN encrypted_password_tag TEXT;`);
    } catch {
      // Column already exists
    }
    try {
      this.db.exec(`ALTER TABLE auth_users ADD COLUMN key_version INTEGER DEFAULT 1;`);
    } catch {
      // Column already exists
    }

    // Ensure metadata defaults
    const versionRow = this.db.prepare('SELECT value FROM vault_metadata WHERE key = ?').get('key_version');
    if (!versionRow) {
      this.db.prepare('INSERT INTO vault_metadata (key, value) VALUES (?, ?)').run('key_version', '1');
    }
  }

  private seedDefaultCredentials(): void {
    const existingCreds = this.db.prepare('SELECT COUNT(*) as count FROM snmp_credentials').get() as { count: number };
    const now = new Date().toISOString();

    if (!existingCreds || existingCreds.count === 0) {
      console.log('[VaultDb] Seeding initial encrypted SNMP credentials into SQLite vault...');

      // 1. Standard Public v2c community (AES-256-GCM encrypted)
      const pubEnc = this.cryptoService.encrypt('public');
      this.db.prepare(`
        INSERT INTO snmp_credentials (
          id, label, snmp_version, community_ciphertext, community_iv, community_tag,
          key_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run('cred-public-v2', 'Standard Public Community (Read-Only)', '2c', pubEnc.ciphertext, pubEnc.iv, pubEnc.tag, now, now);

      // 2. Standard Private v2c community (AES-256-GCM encrypted)
      const privEnc = this.cryptoService.encrypt('private');
      this.db.prepare(`
        INSERT INTO snmp_credentials (
          id, label, snmp_version, community_ciphertext, community_iv, community_tag,
          key_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run('cred-private-v2', 'Standard Private Community (Read-Write Outlets)', '2c', privEnc.ciphertext, privEnc.iv, privEnc.tag, now, now);

      // 3. Sample SNMP v3 Admin Profile with AuthPriv (SHA + AES encrypted)
      const v3AuthEnc = this.cryptoService.encrypt('AuthPass1234!');
      const v3PrivEnc = this.cryptoService.encrypt('PrivPass5678!');
      this.db.prepare(`
        INSERT INTO snmp_credentials (
          id, label, snmp_version,
          v3_username, v3_security_level, v3_auth_protocol, v3_auth_key_ciphertext, v3_auth_key_iv, v3_auth_key_tag,
          v3_priv_protocol, v3_priv_key_ciphertext, v3_priv_key_iv, v3_priv_key_tag, v3_context,
          key_version, created_at, updated_at
        ) VALUES (?, ?, '3', ?, 'authPriv', 'sha', ?, ?, ?, 'aes', ?, ?, ?, '', 1, ?, ?)
      `).run(
        'cred-v3-admin',
        'APC Smart-UPS v3 Security Profile (SHA/AES)',
        'snmpadmin',
        v3AuthEnc.ciphertext,
        v3AuthEnc.iv,
        v3AuthEnc.tag,
        v3PrivEnc.ciphertext,
        v3PrivEnc.iv,
        v3PrivEnc.tag,
        now,
        now
      );
    }

    // Seed default admin user with encrypted login credentials
    const usersCount = (this.db.prepare('SELECT COUNT(*) as count FROM auth_users').get() as { count: number }).count;
    if (usersCount === 0) {
      console.log('[VaultDb] Seeding default admin login credential into SQLite vault...');
      const defaultPassword = 'lynceus2026';
      const hashed = this.cryptoService.hashPassword(defaultPassword);
      const passEnc = this.cryptoService.encrypt(defaultPassword);

      this.db.prepare(`
        INSERT INTO auth_users (
          id, username, password_hash,
          encrypted_password_ciphertext, encrypted_password_iv, encrypted_password_tag,
          key_version, role, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 'admin', ?, ?)
      `).run(
        'user-admin-1',
        'admin',
        hashed,
        passEnc.ciphertext,
        passEnc.iv,
        passEnc.tag,
        now,
        now
      );
    } else {
      // Check if existing admin user needs ciphertext encryption filled
      const adminRow = this.db.prepare('SELECT * FROM auth_users WHERE username = ?').get('admin') as unknown as RawAuthUserRow | undefined;
      if (adminRow && !adminRow.encrypted_password_ciphertext) {
        const passEnc = this.cryptoService.encrypt('lynceus2026');
        this.db.prepare(`
          UPDATE auth_users SET
            encrypted_password_ciphertext = ?,
            encrypted_password_iv = ?,
            encrypted_password_tag = ?,
            key_version = 1
          WHERE id = ?
        `).run(passEnc.ciphertext, passEnc.iv, passEnc.tag, adminRow.id);
      }
    }
  }

  public getVaultStatus(): VaultStatus {
    const versionRow = this.db.prepare('SELECT value FROM vault_metadata WHERE key = ?').get('key_version') as { value?: string } | undefined;
    const rotatedRow = this.db.prepare('SELECT value FROM vault_metadata WHERE key = ?').get('last_rotated_at') as { value?: string } | undefined;
    const countRow = this.db.prepare('SELECT COUNT(*) as count FROM snmp_credentials').get() as { count: number };
    const usersCountRow = this.db.prepare('SELECT COUNT(*) as count FROM auth_users').get() as { count: number };

    return {
      masterKeyConfigured: true,
      masterKeySource: this.cryptoService.getKeySource(),
      activeKeyVersion: versionRow ? parseInt(versionRow.value || '1', 10) : 1,
      keyFingerprint: this.cryptoService.getKeyFingerprint(),
      credentialsCount: countRow ? countRow.count : 0,
      usersCount: usersCountRow ? usersCountRow.count : 0,
      lastRotatedAt: rotatedRow?.value,
      cipherAlgorithm: 'AES-256-GCM (12-byte IV + 16-byte AuthTag)',
      sqlitePath: this.dbPath,
    };
  }

  public listCredentials(): VaultCredentialItem[] {
    const rows = this.db.prepare(`
      SELECT
        id, label, snmp_version,
        (community_ciphertext IS NOT NULL) AS has_community,
        v3_username, v3_security_level, v3_auth_protocol,
        (v3_auth_key_ciphertext IS NOT NULL) AS has_v3_auth,
        v3_priv_protocol,
        (v3_priv_key_ciphertext IS NOT NULL) AS has_v3_priv,
        v3_context,
        key_version, created_at, updated_at
      FROM snmp_credentials
      ORDER BY updated_at DESC
    `).all() as unknown as Array<{
      id: string;
      label: string;
      snmp_version: string;
      has_community: number;
      v3_username: string | null;
      v3_security_level: string | null;
      v3_auth_protocol: string | null;
      has_v3_auth: number;
      v3_priv_protocol: string | null;
      has_v3_priv: number;
      v3_context: string | null;
      key_version: number;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      snmpVersion: r.snmp_version as '1' | '2c' | '3',
      hasCommunity: Boolean(r.has_community),
      v3Username: r.v3_username || undefined,
      v3SecurityLevel: (r.v3_security_level as 'noAuthNoPriv' | 'authNoPriv' | 'authPriv') || undefined,
      v3AuthProtocol: (r.v3_auth_protocol as 'md5' | 'sha') || undefined,
      hasV3AuthKey: Boolean(r.has_v3_auth),
      v3PrivProtocol: (r.v3_priv_protocol as 'des' | 'aes') || undefined,
      hasV3PrivKey: Boolean(r.has_v3_priv),
      v3Context: r.v3_context || undefined,
      keyVersion: r.key_version,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Decrypts and resolves credentials by ID for SNMP poller execution
   */
  public getDecryptedCredential(id: string): {
    community?: string;
    v3?: SnmpV3Config;
  } | null {
    const row = this.db.prepare('SELECT * FROM snmp_credentials WHERE id = ?').get(id) as unknown as RawCredentialRow | undefined;
    if (!row) return null;

    try {
      if (row.snmp_version === '1' || row.snmp_version === '2c') {
        if (!row.community_ciphertext || !row.community_iv || !row.community_tag) {
          return null;
        }
        const community = this.cryptoService.decrypt({
          ciphertext: row.community_ciphertext,
          iv: row.community_iv,
          tag: row.community_tag,
          version: row.key_version,
        });
        return { community };
      } else if (row.snmp_version === '3') {
        let authKey: string | undefined;
        let privKey: string | undefined;

        if (row.v3_auth_key_ciphertext && row.v3_auth_key_iv && row.v3_auth_key_tag) {
          authKey = this.cryptoService.decrypt({
            ciphertext: row.v3_auth_key_ciphertext,
            iv: row.v3_auth_key_iv,
            tag: row.v3_auth_key_tag,
            version: row.key_version,
          });
        }

        if (row.v3_priv_key_ciphertext && row.v3_priv_key_iv && row.v3_priv_key_tag) {
          privKey = this.cryptoService.decrypt({
            ciphertext: row.v3_priv_key_ciphertext,
            iv: row.v3_priv_key_iv,
            tag: row.v3_priv_key_tag,
            version: row.key_version,
          });
        }

        return {
          v3: {
            username: row.v3_username || '',
            securityLevel: (row.v3_security_level as 'noAuthNoPriv' | 'authNoPriv' | 'authPriv') || 'noAuthNoPriv',
            authProtocol: (row.v3_auth_protocol as 'md5' | 'sha') || undefined,
            authKey,
            privProtocol: (row.v3_priv_protocol as 'des' | 'aes') || undefined,
            privKey,
            context: row.v3_context || undefined,
          },
        };
      }
    } catch (err) {
      console.error(`[VaultDb] Failed to decrypt credential "${id}":`, err);
    }
    return null;
  }

  /**
   * Save or Update an Encrypted SNMP Credential in SQLite
   */
  public saveCredential(cred: {
    id: string;
    label: string;
    snmpVersion: '1' | '2c' | '3';
    community?: string;
    v3Username?: string;
    v3SecurityLevel?: 'noAuthNoPriv' | 'authNoPriv' | 'authPriv';
    v3AuthProtocol?: 'md5' | 'sha';
    v3AuthKey?: string;
    v3PrivProtocol?: 'des' | 'aes';
    v3PrivKey?: string;
    v3Context?: string;
  }): void {
    const now = new Date().toISOString();
    const versionRow = this.db.prepare('SELECT value FROM vault_metadata WHERE key = ?').get('key_version') as { value?: string } | undefined;
    const currentVersion = versionRow ? parseInt(versionRow.value || '1', 10) : 1;

    let commEnc: EncryptedField | null = null;
    let authEnc: EncryptedField | null = null;
    let privEnc: EncryptedField | null = null;

    if (cred.community) {
      commEnc = this.cryptoService.encrypt(cred.community, undefined, currentVersion);
    }
    if (cred.v3AuthKey) {
      authEnc = this.cryptoService.encrypt(cred.v3AuthKey, undefined, currentVersion);
    }
    if (cred.v3PrivKey) {
      privEnc = this.cryptoService.encrypt(cred.v3PrivKey, undefined, currentVersion);
    }

    const exists = this.db.prepare('SELECT id FROM snmp_credentials WHERE id = ?').get(cred.id);
    if (exists) {
      this.db.prepare(`
        UPDATE snmp_credentials SET
          label = ?,
          snmp_version = ?,
          community_ciphertext = COALESCE(?, community_ciphertext),
          community_iv = COALESCE(?, community_iv),
          community_tag = COALESCE(?, community_tag),
          v3_username = ?,
          v3_security_level = ?,
          v3_auth_protocol = ?,
          v3_auth_key_ciphertext = COALESCE(?, v3_auth_key_ciphertext),
          v3_auth_key_iv = COALESCE(?, v3_auth_key_iv),
          v3_auth_key_tag = COALESCE(?, v3_auth_key_tag),
          v3_priv_protocol = ?,
          v3_priv_key_ciphertext = COALESCE(?, v3_priv_key_ciphertext),
          v3_priv_key_iv = COALESCE(?, v3_priv_key_iv),
          v3_priv_key_tag = COALESCE(?, v3_priv_key_tag),
          v3_context = ?,
          key_version = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        cred.label,
        cred.snmpVersion,
        commEnc?.ciphertext ?? null,
        commEnc?.iv ?? null,
        commEnc?.tag ?? null,
        cred.v3Username ?? null,
        cred.v3SecurityLevel ?? null,
        cred.v3AuthProtocol ?? null,
        authEnc?.ciphertext ?? null,
        authEnc?.iv ?? null,
        authEnc?.tag ?? null,
        cred.v3PrivProtocol ?? null,
        privEnc?.ciphertext ?? null,
        privEnc?.iv ?? null,
        privEnc?.tag ?? null,
        cred.v3Context ?? '',
        currentVersion,
        now,
        cred.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO snmp_credentials (
          id, label, snmp_version,
          community_ciphertext, community_iv, community_tag,
          v3_username, v3_security_level, v3_auth_protocol,
          v3_auth_key_ciphertext, v3_auth_key_iv, v3_auth_key_tag,
          v3_priv_protocol,
          v3_priv_key_ciphertext, v3_priv_key_iv, v3_priv_key_tag,
          v3_context, key_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        cred.id,
        cred.label,
        cred.snmpVersion,
        commEnc?.ciphertext ?? null,
        commEnc?.iv ?? null,
        commEnc?.tag ?? null,
        cred.v3Username ?? null,
        cred.v3SecurityLevel ?? null,
        cred.v3AuthProtocol ?? null,
        authEnc?.ciphertext ?? null,
        authEnc?.iv ?? null,
        authEnc?.tag ?? null,
        cred.v3PrivProtocol ?? null,
        privEnc?.ciphertext ?? null,
        privEnc?.iv ?? null,
        privEnc?.tag ?? null,
        cred.v3Context ?? '',
        currentVersion,
        now,
        now
      );
    }
  }

  public deleteCredential(id: string): boolean {
    const res = this.db.prepare('DELETE FROM snmp_credentials WHERE id = ?').run(id);
    return res.changes > 0;
  }

  // ==========================================
  // Login & Dashboard User Credentials Methods
  // ==========================================

  public listAuthUsers(): VaultUserItem[] {
    const rows = this.db.prepare(`
      SELECT
        id, username, role,
        (encrypted_password_ciphertext IS NOT NULL) as has_encrypted_password,
        key_version, created_at, updated_at
      FROM auth_users
      ORDER BY username ASC
    `).all() as unknown as Array<{
      id: string;
      username: string;
      role: string;
      has_encrypted_password: number;
      key_version: number;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      role: (r.role as 'admin' | 'operator' | 'viewer') || 'admin',
      hasEncryptedPassword: Boolean(r.has_encrypted_password),
      keyVersion: r.key_version || 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  public saveAuthUser(user: {
    id?: string;
    username: string;
    password?: string;
    role?: 'admin' | 'operator' | 'viewer';
  }): { id: string } {
    const now = new Date().toISOString();
    const versionRow = this.db.prepare('SELECT value FROM vault_metadata WHERE key = ?').get('key_version') as { value?: string } | undefined;
    const currentVersion = versionRow ? parseInt(versionRow.value || '1', 10) : 1;

    const existingByUsername = this.db.prepare('SELECT * FROM auth_users WHERE username = ?').get(user.username.trim()) as unknown as RawAuthUserRow | undefined;
    const userId = user.id || existingByUsername?.id || `user-${Date.now()}`;
    const role = user.role || existingByUsername?.role || 'admin';

    let passwordHash: string | undefined;
    let passEnc: EncryptedField | undefined;

    if (user.password && user.password.trim().length > 0) {
      passwordHash = this.cryptoService.hashPassword(user.password.trim());
      passEnc = this.cryptoService.encrypt(user.password.trim(), undefined, currentVersion);
    }

    if (existingByUsername || user.id) {
      this.db.prepare(`
        UPDATE auth_users SET
          username = ?,
          password_hash = COALESCE(?, password_hash),
          encrypted_password_ciphertext = COALESCE(?, encrypted_password_ciphertext),
          encrypted_password_iv = COALESCE(?, encrypted_password_iv),
          encrypted_password_tag = COALESCE(?, encrypted_password_tag),
          role = ?,
          key_version = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        user.username.trim(),
        passwordHash ?? null,
        passEnc?.ciphertext ?? null,
        passEnc?.iv ?? null,
        passEnc?.tag ?? null,
        role,
        currentVersion,
        now,
        userId
      );
    } else {
      if (!passwordHash || !passEnc) {
        throw new Error('Password is required for creating a new user.');
      }
      this.db.prepare(`
        INSERT INTO auth_users (
          id, username, password_hash,
          encrypted_password_ciphertext, encrypted_password_iv, encrypted_password_tag,
          key_version, role, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        user.username.trim(),
        passwordHash,
        passEnc.ciphertext,
        passEnc.iv,
        passEnc.tag,
        currentVersion,
        role,
        now,
        now
      );
    }

    return { id: userId };
  }

  public deleteAuthUser(id: string): boolean {
    const adminCount = (this.db.prepare("SELECT COUNT(*) as count FROM auth_users WHERE role = 'admin'").get() as { count: number }).count;
    const targetUser = this.db.prepare('SELECT * FROM auth_users WHERE id = ?').get(id) as unknown as RawAuthUserRow | undefined;

    if (!targetUser) return false;
    if (targetUser.role === 'admin' && adminCount <= 1) {
      throw new Error('Cannot delete the only remaining admin account.');
    }

    const res = this.db.prepare('DELETE FROM auth_users WHERE id = ?').run(id);
    return res.changes > 0;
  }

  public authenticateUser(username: string, password: string): {
    success: boolean;
    user?: { id: string; username: string; role: string };
    error?: string;
  } {
    const userRow = this.db.prepare('SELECT * FROM auth_users WHERE username = ?').get(username.trim()) as unknown as RawAuthUserRow | undefined;
    if (!userRow) {
      return { success: false, error: 'Invalid username or password' };
    }

    const isValid = this.cryptoService.verifyPassword(password, userRow.password_hash);
    if (!isValid) {
      return { success: false, error: 'Invalid username or password' };
    }

    return {
      success: true,
      user: {
        id: userRow.id,
        username: userRow.username,
        role: userRow.role,
      },
    };
  }

  /**
   * Master Key Rotation Entrypoint:
   * 1. Derives old key & new key
   * 2. Decrypts and tests all SNMP credentials with old key
   * 3. Decrypts and tests all login user credentials with old key
   * 4. Re-encrypts every secret with new key and fresh, unique 12-byte IV
   * 5. Atomically commits updates to SQLite in a single ACID transaction
   * 6. Promotes new key in CryptoService
   */
  public rotateMasterKey(oldRawKey: string, newRawKey: string): KeyRotationResult {
    const oldKey = this.cryptoService.deriveKey(oldRawKey);
    const newKey = this.cryptoService.deriveKey(newRawKey);

    const snmpRows = this.db.prepare('SELECT * FROM snmp_credentials').all() as unknown as RawCredentialRow[];
    const userRows = this.db.prepare('SELECT * FROM auth_users WHERE encrypted_password_ciphertext IS NOT NULL').all() as unknown as RawAuthUserRow[];

    const reEncryptedSnmpRows: Array<{
      id: string;
      commEnc: EncryptedField | null;
      authEnc: EncryptedField | null;
      privEnc: EncryptedField | null;
    }> = [];

    const reEncryptedUserRows: Array<{
      id: string;
      passEnc: EncryptedField;
    }> = [];

    const versionRow = this.db.prepare('SELECT value FROM vault_metadata WHERE key = ?').get('key_version') as { value?: string } | undefined;
    const currentVer = versionRow ? parseInt(versionRow.value || '1', 10) : 1;
    const nextVer = currentVer + 1;

    // Step 1: Decrypt and Re-encrypt all SNMP credentials in memory
    for (const row of snmpRows) {
      let commEnc: EncryptedField | null = null;
      let authEnc: EncryptedField | null = null;
      let privEnc: EncryptedField | null = null;

      try {
        if (row.community_ciphertext && row.community_iv && row.community_tag) {
          const plain = this.cryptoService.decrypt(
            {
              ciphertext: row.community_ciphertext,
              iv: row.community_iv,
              tag: row.community_tag,
              version: row.key_version,
            },
            oldKey
          );
          commEnc = this.cryptoService.encrypt(plain, newKey, nextVer);
        }

        if (row.v3_auth_key_ciphertext && row.v3_auth_key_iv && row.v3_auth_key_tag) {
          const plain = this.cryptoService.decrypt(
            {
              ciphertext: row.v3_auth_key_ciphertext,
              iv: row.v3_auth_key_iv,
              tag: row.v3_auth_key_tag,
              version: row.key_version,
            },
            oldKey
          );
          authEnc = this.cryptoService.encrypt(plain, newKey, nextVer);
        }

        if (row.v3_priv_key_ciphertext && row.v3_priv_key_iv && row.v3_priv_key_tag) {
          const plain = this.cryptoService.decrypt(
            {
              ciphertext: row.v3_priv_key_ciphertext,
              iv: row.v3_priv_key_iv,
              tag: row.v3_priv_key_tag,
              version: row.key_version,
            },
            oldKey
          );
          privEnc = this.cryptoService.encrypt(plain, newKey, nextVer);
        }

        reEncryptedSnmpRows.push({ id: row.id, commEnc, authEnc, privEnc });
      } catch (err: unknown) {
        throw new Error(`Failed to decrypt SNMP credential "${row.id}" with provided old key: ${(err as Error).message}`);
      }
    }

    // Step 2: Decrypt and Re-encrypt all Login User credentials in memory
    for (const u of userRows) {
      if (u.encrypted_password_ciphertext && u.encrypted_password_iv && u.encrypted_password_tag) {
        try {
          const plain = this.cryptoService.decrypt(
            {
              ciphertext: u.encrypted_password_ciphertext,
              iv: u.encrypted_password_iv,
              tag: u.encrypted_password_tag,
              version: u.key_version || currentVer,
            },
            oldKey
          );
          const passEnc = this.cryptoService.encrypt(plain, newKey, nextVer);
          reEncryptedUserRows.push({ id: u.id, passEnc });
        } catch (err: unknown) {
          throw new Error(`Failed to decrypt login credentials for user "${u.username}" with provided old key: ${(err as Error).message}`);
        }
      }
    }

    // Step 3: Atomic SQLite write in a single transaction
    this.db.exec('BEGIN TRANSACTION');
    try {
      const now = new Date().toISOString();

      // Update SNMP credentials
      const updateSnmpStmt = this.db.prepare(`
        UPDATE snmp_credentials SET
          community_ciphertext = ?, community_iv = ?, community_tag = ?,
          v3_auth_key_ciphertext = ?, v3_auth_key_iv = ?, v3_auth_key_tag = ?,
          v3_priv_key_ciphertext = ?, v3_priv_key_iv = ?, v3_priv_key_tag = ?,
          key_version = ?, updated_at = ?
        WHERE id = ?
      `);

      for (const item of reEncryptedSnmpRows) {
        updateSnmpStmt.run(
          item.commEnc?.ciphertext ?? null,
          item.commEnc?.iv ?? null,
          item.commEnc?.tag ?? null,
          item.authEnc?.ciphertext ?? null,
          item.authEnc?.iv ?? null,
          item.authEnc?.tag ?? null,
          item.privEnc?.ciphertext ?? null,
          item.privEnc?.iv ?? null,
          item.privEnc?.tag ?? null,
          nextVer,
          now,
          item.id
        );
      }

      // Update User credentials
      const updateUserStmt = this.db.prepare(`
        UPDATE auth_users SET
          encrypted_password_ciphertext = ?,
          encrypted_password_iv = ?,
          encrypted_password_tag = ?,
          key_version = ?,
          updated_at = ?
        WHERE id = ?
      `);

      for (const u of reEncryptedUserRows) {
        updateUserStmt.run(
          u.passEnc.ciphertext,
          u.passEnc.iv,
          u.passEnc.tag,
          nextVer,
          now,
          u.id
        );
      }

      this.db.prepare('UPDATE vault_metadata SET value = ? WHERE key = ?').run(String(nextVer), 'key_version');
      this.db.prepare('INSERT OR REPLACE INTO vault_metadata (key, value) VALUES (?, ?)').run('last_rotated_at', now);

      this.db.exec('COMMIT');

      // Update active master key in runtime memory
      this.cryptoService.setMasterKey(newKey, 'env');

      const totalRotated = reEncryptedSnmpRows.length + reEncryptedUserRows.length;
      console.log(
        `[VaultDb] Key rotation successful: ${totalRotated} total records (${reEncryptedSnmpRows.length} SNMP, ${reEncryptedUserRows.length} User logins) rotated to version ${nextVer}`
      );

      return {
        success: true,
        recordsRotated: totalRotated,
        snmpRecordsRotated: reEncryptedSnmpRows.length,
        userRecordsRotated: reEncryptedUserRows.length,
        newVersion: nextVer,
        message: `Successfully rotated master key. Re-encrypted ${reEncryptedSnmpRows.length} SNMP credentials and ${reEncryptedUserRows.length} login credentials with fresh AES-256-GCM IVs.`,
      };
    } catch (err: unknown) {
      this.db.exec('ROLLBACK');
      throw new Error(`Transaction failed during key rotation: ${(err as Error).message}`);
    }
  }
}
