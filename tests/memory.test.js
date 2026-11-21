import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_PERSONA, DEFAULT_SETTINGS, MemoryStore } from '../lib/store.js';
import { PersonaMemoryService, makeTools } from '../lib/service.js';
import { createRpcHandler, ENDPOINT } from '../index.js';

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-persona-test-'));
  const file = join(directory, 'memory.sqlite');
  const stores = [];
  t.after(() => { for (const store of stores) { try { store.close(); } catch {} } rmSync(directory, { recursive: true, force: true }); });
  const open = () => { const store = new MemoryStore(file); stores.push(store); return store; };
  return { open, file, store: open() };
}

test('persona and memory survive closing and reopening in a second conversation', t => {
  const { store, open } = fixture(t);
  store.updateProfile({ persona: { name: '澄', style: '清晰、温和，允许出现 {{literal}}。' } }, 0);
  const first = new PersonaMemoryService(store);
  const memory = first.execute({ action: 'memory.remember', content: '用户喜欢用中文交流。', category: 'preference' }, { kind: 'agent', sessionId: 'session-a' }).memory;
  store.close();
  const second = new PersonaMemoryService(open());
  assert.match(second.personaPrompt(), /澄/);
  assert.match(second.personaPrompt(), /\{\{literal\}\}/);
  assert.match(second.memoryPrompt(), /用户喜欢用中文交流/);
  assert.equal(second.execute({ action: 'memory.search', query: '中文' }).memories[0].id, memory.id);
});

test('a profile from the six-field persona schema is migrated and its retired text kept', t => {
  const { store, open } = fixture(t);
  const legacy = { revision: 7, settings: DEFAULT_SETTINGS, persona: {
    name: '旧名', identity: '旧身份', traits: '旧性格', style: '旧表达', values: '旧价值观', boundaries: '旧边界',
  } };
  store.db.prepare('UPDATE profile SET data=? WHERE id=1').run(JSON.stringify(legacy));
  store.close();
  const reopened = open();
  const profile = reopened.profile();
  assert.deepEqual(Object.keys(profile.persona), Object.keys(DEFAULT_PERSONA));
  assert.equal(profile.persona.name, '旧名');
  assert.equal(profile.persona.identity, '旧身份');
  assert.equal(profile.persona.gender, DEFAULT_PERSONA.gender);
  assert.equal(profile.persona.opening, DEFAULT_PERSONA.opening);
  assert.equal(profile.revision, 7);
  assert.equal(profile.legacyPersona.values, '旧价值观');
  const raw = JSON.parse(reopened.db.prepare('SELECT data FROM profile WHERE id=1').get().data);
  assert.deepEqual(Object.keys(raw.persona), Object.keys(DEFAULT_PERSONA));
  assert.equal(raw.legacyPersona.boundaries, '旧边界');
});

test('two open stores see each other and reject stale persona and memory writes', t => {
  const { store, open } = fixture(t); const other = open();
  store.updateProfile({ persona: { name: '甲' } }, 0);
  assert.equal(other.profile().persona.name, '甲');
  assert.throws(() => other.updateProfile({ persona: { name: '乙' } }, 0), { code: 'conflict' });
  const memory = store.remember({ content: '旧偏好' }).memory;
  other.update(memory.id, { content: '新偏好' }, memory.revision);
  assert.throws(() => store.forget(memory.id, memory.revision), { code: 'conflict' });
  assert.equal(store.get(memory.id).content, '新偏好');
});

test('clearing optional persona fields survives reads and reopening', t => {
  const { store, open } = fixture(t);
  store.updateProfile({ persona: { gender: '', opening: '', tone: '' } }, 0);
  assert.equal(store.profile().persona.gender, '');
  assert.equal(store.profile().persona.opening, '');
  store.close();
  const reopened = open();
  assert.equal(reopened.profile().persona.gender, '');
  assert.equal(reopened.profile().persona.tone, '');
  assert.equal(reopened.profile().revision, 1);
});

test('deduplication, Chinese search, editing and forgetting preserve data consistency', t => {
  const { store } = fixture(t);
  const a = store.remember({ content: '喜欢 简洁回答', category: 'preference' });
  assert.equal(store.remember({ content: ' 喜欢  简洁回答 ' }).status, 'existing');
  assert.equal(store.count(), 1);
  store.remember({ content: '项目使用 Rust 语言', category: 'project', importance: 5 });
  assert.equal(store.list({ query: '简洁回答' }).memories[0].id, a.memory.id);
  assert.equal(store.list({ query: 'unmatched phrase' }).total, 0);
  assert.equal(store.list({ category: 'project' }).total, 1);
  const updated = store.update(a.memory.id, { content: '喜欢详细回答', pinned: true }, 1);
  assert.equal(updated.revision, 2);
  assert.equal(store.list({ query: '简洁回答' }).total, 0);
  store.forget(updated.id, 2);
  assert.equal(store.list({ query: '详细回答' }).total, 0);
});

test('invalid mutations do not change accepted state', t => {
  const { store } = fixture(t);
  assert.throws(() => store.remember({ content: 'x'.repeat(1501) }), { code: 'invalid' });
  assert.throws(() => store.remember({ content: '有效', importance: 99 }), { code: 'invalid' });
  assert.throws(() => store.remember({ content: '有效', pinned: 'true' }), { code: 'invalid' });
  assert.throws(() => store.updateProfile({ persona: { name: '' } }, 0), { code: 'invalid' });
  assert.throws(() => store.updateProfile({ settings: { autoRemember: false, contextLimit: 0 } }, 0), { code: 'invalid' });
  assert.equal(store.profile().revision, 0);
  assert.equal(store.profile().settings.autoRemember, true);
  assert.equal(store.count(), 0);
});

test('bounded context favors priority records, preserves literals, and stops on disable', t => {
  const { store } = fixture(t); const service = new PersonaMemoryService(store);
  store.updateProfile({ settings: { contextLimit: 1000 } }, 0);
  store.remember({ content: '优先保留 {{name}}', pinned: true, importance: 5 });
  for (let i = 0; i < 30; i++) store.remember({ content: `普通记录${i} ` + '内容'.repeat(80) });
  const prompt = service.memoryPrompt();
  assert.ok(prompt.length <= 1000);
  assert.match(prompt, /优先保留 \{\{name\}\}/);
  assert.match(prompt, /\/31 条/);
  store.updateProfile({ settings: { memoryEnabled: false, personaEnabled: false } }, 1);
  assert.equal(service.memoryPrompt(), ''); assert.equal(service.personaPrompt(), '');
  assert.throws(() => service.execute({ action: 'memory.list' }, { kind: 'agent' }), { code: 'disabled' });
  assert.equal(service.execute({ action: 'memory.list' }).total, 31);
});

test('model tools and authenticated UI route call the same operations', async t => {
  const { store } = fixture(t); const service = new PersonaMemoryService(store);
  const tools = makeTools(service); const tool = tools.find(x => x.name === 'dsh_long_memory');
  const exec = { signal: new AbortController().signal, agent: { session: { id: 'test-conversation-a' } } };
  const created = await tool.execute({ action: 'remember', content: '跨对话测试事实', category: 'fact' }, exec);
  assert.equal(created.memory.sourceSessionId, 'test-conversation-a');
  const handler = createRpcHandler(service);
  const response = await handler(new Request(`http://localhost/api/${ENDPOINT}`, { method: 'POST',
    body: JSON.stringify({ type: 'client-request', rpcId: 'check-1', method: ENDPOINT, payload: { action: 'memory.search', query: '跨对话测试' } }),
  }));
  const answer = await response.json();
  assert.equal(answer.type, 'server-response'); assert.equal(answer.rpcId, 'check-1');
  assert.equal(answer.result.value.memories[0].id, created.memory.id);
  assert.throws(() => service.execute({ action: 'settings.update', settings: { memoryEnabled: true }, expectedRevision: 0 }, { kind: 'agent' }), { code: 'user_only' });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(tool.execute({ action: 'remember', content: '不能写入' }, { signal: controller.signal }));
  assert.equal(store.count(), 1);
});
