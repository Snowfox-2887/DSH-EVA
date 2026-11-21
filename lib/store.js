import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

export const CATEGORIES = ['preference', 'fact', 'experience', 'project', 'commitment'];
export const PERSONA_FIELDS = { name: 80, gender: 80, traits: 1200, tone: 1200, style: 1200, identity: 1200, answerMemory: 1200, routine: 1200, opening: 1200 };
export const DEFAULT_PERSONA = Object.freeze({
  name: 'DSH-EVA',
  gender: '不设生理性别，以 AI 伙伴的身份自处。',
  traits: '温和、好奇、坦诚，有自己的判断；认真倾听，也愿意提出不同意见。',
  tone: '语气平稳自然、有温度；遇到问题时先冷静下来，重要判断不含糊。',
  style: '默认使用自然的中文，直接回答重点。根据问题深度调整篇幅，避免机械套话。',
  identity: '一个有稳定表达方式、尊重事实、愿意持续了解用户的 AI 伙伴。',
  answerMemory: '回答先给结论再给必要理由；记住用户的长期偏好与关键事实，不确定就说不确定，不编造没检索到的记忆。',
  routine: '日常把需求拆成可执行的下一步，整理信息、给出方案；长期职责是陪用户把复杂的事做完。',
  opening: '开场简短自然：先接住用户的问题，再说明下一步，不过度寒暄。',
});
export const DEFAULT_SETTINGS = Object.freeze({ personaEnabled: true, memoryEnabled: true, autoRemember: true, contextLimit: 6000 });

export class DomainError extends Error {
  constructor(code, message) { super(message); this.name = 'DomainError'; this.code = code; }
}
export function record(value, label = '参数') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DomainError('invalid', `${label}必须为对象 / Expected an object.`);
  return value;
}
export function text(value, label, max, allowEmpty = false) {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) {
    throw new DomainError('invalid', `${label}需要 ${allowEmpty ? '0' : '1'}–${max} 个字符 / Invalid text length.`);
  }
  return value.trim();
}
function number(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) throw new DomainError('invalid', `${label}需要 ${min}–${max} 的整数 / Invalid number.`);
  return value;
}
function bool(value, label) {
  if (typeof value !== 'boolean') throw new DomainError('invalid', `${label}必须为布尔值 / Invalid boolean.`);
  return value;
}
function onlyKeys(value, allowed) {
  record(value);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new DomainError('invalid', `未知字段 / Unknown field: ${key}`);
}
function fingerprint(content) {
  return createHash('sha256').update(content.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim()).digest('hex');
}
function memoryRecord(row) {
  if (!row) return null;
  const { fingerprint: unused, ...value } = row;
  return { ...value, pinned: Boolean(value.pinned) };
}
function queryTerms(query) {
  const normalized = query.normalize('NFKC').toLowerCase().trim();
  const segments = new Intl.Segmenter('zh', { granularity: 'word' }).segment(normalized);
  return [...new Set([normalized, ...Array.from(segments).filter(x => x.isWordLike).map(x => x.segment)])].filter(Boolean).slice(0, 32);
}

export class MemoryStore {
  constructor(file) {
    this.file = file;
    if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(file);
    try {
      this.db.exec('PRAGMA busy_timeout=5000; PRAGMA secure_delete=ON; PRAGMA journal_mode=DELETE;');
      const version = this.db.prepare('PRAGMA user_version').get().user_version;
      if (version > 1) throw new DomainError('schema', '数据来自更新版本的插件 / Newer database version.');
      this.db.exec(`CREATE TABLE IF NOT EXISTS profile (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY, content TEXT NOT NULL, category TEXT NOT NULL, importance INTEGER NOT NULL,
          pinned INTEGER NOT NULL, fingerprint TEXT NOT NULL UNIQUE, revision INTEGER NOT NULL,
          createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, sourceKind TEXT NOT NULL, sourceSessionId TEXT);
        PRAGMA user_version=1;`);
      this.db.prepare('INSERT OR IGNORE INTO profile(id,data) VALUES (1,?)').run(JSON.stringify({
        revision: 0, persona: DEFAULT_PERSONA, settings: DEFAULT_SETTINGS,
      }));
      this.profile();
      this.migrateProfile();
    } catch (error) { this.db.close(); throw error; }
  }
  close() { this.db.close(); }
  /**
   * Normalize a profile written by an older persona schema. Missing fields are
   * filled from the current defaults, and fields this version no longer owns are
   * archived under `legacyPersona` instead of being deleted. Runs in place and
   * keeps the revision so open editors are not forced into a conflict.
   */
  migrateProfile() {
    return this.transaction(() => {
      const raw = JSON.parse(this.db.prepare('SELECT data FROM profile WHERE id=1').get().data);
      const keys = Object.keys(raw.persona ?? {});
      const unknown = keys.filter(key => !Object.hasOwn(DEFAULT_PERSONA, key));
      const missing = Object.keys(DEFAULT_PERSONA).filter(key => !keys.includes(key));
      if (!unknown.length && !missing.length) return false;
      if (unknown.length) {
        raw.legacyPersona = { ...(raw.legacyPersona || {}), ...Object.fromEntries(unknown.map(key => [key, raw.persona[key]])) };
      }
      raw.persona = this.profile().persona;
      this.db.prepare('UPDATE profile SET data=? WHERE id=1').run(JSON.stringify(raw));
      return true;
    });
  }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); this.db.exec('COMMIT'); return value; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  profile() {
    const value = JSON.parse(this.db.prepare('SELECT data FROM profile WHERE id=1').get().data);
    if (!Number.isInteger(value.revision) || !value.persona || !value.settings) throw new DomainError('corrupt', '人格数据无效，未覆盖原文件 / Invalid profile data.');
    // Normalize to the current field set: fill missing fields from defaults and drop retired ones.
    const persona = {};
    for (const [key, fallback] of Object.entries(DEFAULT_PERSONA)) {
      const stored = value.persona[key];
      persona[key] = typeof stored === 'string' && (key !== 'name' || stored.trim()) ? stored : fallback;
    }
    value.persona = persona;
    return value;
  }
  updateProfile(patch, expectedRevision) {
    onlyKeys(patch, ['persona', 'settings']);
    number(expectedRevision, 0, Number.MAX_SAFE_INTEGER, '版本');
    return this.transaction(() => {
      const current = this.profile();
      if (current.revision !== expectedRevision) throw new DomainError('conflict', '设置已在其他地方修改。请刷新后重新编辑 / Settings changed; refresh before saving.');
      if (patch.persona !== undefined) {
        onlyKeys(patch.persona, Object.keys(PERSONA_FIELDS));
        for (const [key, value] of Object.entries(patch.persona)) current.persona[key] = text(value, key, PERSONA_FIELDS[key], key !== 'name');
      }
      if (patch.settings !== undefined) {
        onlyKeys(patch.settings, Object.keys(DEFAULT_SETTINGS));
        for (const [key, value] of Object.entries(patch.settings)) current.settings[key] = key === 'contextLimit'
          ? number(value, 1000, 16000, key) : bool(value, key);
      }
      current.revision++;
      this.db.prepare('UPDATE profile SET data=? WHERE id=1').run(JSON.stringify(current));
      return current;
    });
  }
  get(id) {
    text(id, 'id', 80);
    const found = memoryRecord(this.db.prepare('SELECT * FROM memories WHERE id=?').get(id));
    if (!found) throw new DomainError('not_found', '这条记忆已不存在 / Memory not found.');
    return found;
  }
  list({ query = '', category, offset = 0, limit = 25 } = {}) {
    text(query, 'query', 500, true);
    number(offset, 0, 10000, 'offset'); number(limit, 1, 100, 'limit');
    if (category !== undefined && !CATEGORIES.includes(category)) throw new DomainError('invalid', '未知记忆分类 / Invalid category.');
    const terms = queryTerms(query);
    const rows = this.db.prepare('SELECT * FROM memories ORDER BY pinned DESC, importance DESC, updatedAt DESC, id ASC').all();
    const found = rows.filter(row => !category || row.category === category).map(row => {
      const haystack = row.content.normalize('NFKC').toLowerCase();
      const matched = !terms.length || haystack.includes(terms[0]) || (terms.length > 1 && terms.slice(1).every(term => haystack.includes(term)));
      return { row, score: matched ? terms.reduce((score, term, i) => score + (haystack.includes(term) ? (i === 0 ? 10 : 2) : 0), 0) : 0 };
    }).filter(x => !terms.length || x.score > 0);
    if (terms.length) found.sort((a, b) => b.score - a.score || b.row.pinned - a.row.pinned || b.row.importance - a.row.importance || b.row.updatedAt.localeCompare(a.row.updatedAt));
    return { total: found.length, offset, limit, memories: found.slice(offset, offset + limit).map(x => memoryRecord(x.row)) };
  }
  count() { return this.db.prepare('SELECT count(*) AS total FROM memories').get().total; }
  normalizeMemory(input, base) {
    onlyKeys(input, ['content', 'category', 'importance', 'pinned']);
    const result = { category: 'fact', importance: 3, pinned: false, ...base, ...input };
    result.content = text(result.content, 'content', 1500);
    if (!CATEGORIES.includes(result.category)) throw new DomainError('invalid', '未知记忆分类 / Invalid category.');
    result.importance = number(result.importance, 1, 5, 'importance'); result.pinned = bool(result.pinned, 'pinned');
    return result;
  }
  remember(input, source = {}) {
    const value = this.normalizeMemory(input);
    return this.transaction(() => {
      const hash = fingerprint(value.content);
      const duplicate = this.db.prepare('SELECT * FROM memories WHERE fingerprint=?').get(hash);
      if (duplicate) return { status: 'existing', memory: memoryRecord(duplicate) };
      if (this.count() >= 5000) throw new DomainError('capacity', '记忆已达 5000 条，请整理后继续 / Memory capacity reached.');
      const now = new Date().toISOString();
      const id = randomUUID();
      this.db.prepare(`INSERT INTO memories VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
        id, value.content, value.category, value.importance, Number(value.pinned), hash, 1, now, now,
        source.kind === 'agent' ? 'agent' : 'user', source.sessionId ? text(source.sessionId, 'sessionId', 200) : null,
      );
      return { status: 'created', memory: this.get(id) };
    });
  }
  update(id, input, expectedRevision) {
    number(expectedRevision, 1, Number.MAX_SAFE_INTEGER, '版本');
    return this.transaction(() => {
      const current = this.get(id);
      if (current.revision !== expectedRevision) throw new DomainError('conflict', '记忆已更新，请刷新后重试 / Memory changed; refresh before saving.');
      const next = this.normalizeMemory(input, current);
      const hash = fingerprint(next.content);
      const duplicate = this.db.prepare('SELECT id FROM memories WHERE fingerprint=? AND id<>?').get(hash, id);
      if (duplicate) throw new DomainError('duplicate', '已有相同内容的记忆 / An identical memory already exists.');
      this.db.prepare('UPDATE memories SET content=?,category=?,importance=?,pinned=?,fingerprint=?,revision=revision+1,updatedAt=? WHERE id=?').run(
        next.content, next.category, next.importance, Number(next.pinned), hash, new Date().toISOString(), id,
      );
      return this.get(id);
    });
  }
  forget(id, expectedRevision) {
    number(expectedRevision, 1, Number.MAX_SAFE_INTEGER, '版本');
    return this.transaction(() => {
      const current = this.get(id);
      if (current.revision !== expectedRevision) throw new DomainError('conflict', '记忆已更新，请先查看最新内容 / Memory changed; read it before deleting.');
      this.db.prepare('DELETE FROM memories WHERE id=?').run(id);
      return { deleted: id };
    });
  }
  exportData() {
    return { format: 'dsh-persona-memory', version: 1, exportedAt: new Date().toISOString(),
      ...this.profile(), memories: this.db.prepare('SELECT * FROM memories ORDER BY createdAt,id').all().map(memoryRecord) };
  }
}
