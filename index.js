import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { MemoryStore, DomainError, record } from './lib/store.js';
import { PersonaMemoryService, makeTools } from './lib/service.js';

export const name = 'dsh-persona-memory';
export const inject = ['tools', 'systemPrompt'];
export const ENDPOINT = 'dsh-persona-memory/dispatch';

export function createRpcHandler(service) {
  return async request => {
    let rpcId = '';
    try {
      const input = record(await request.json());
      if (input.type !== 'client-request' || input.method !== ENDPOINT || typeof input.rpcId !== 'string' || input.rpcId.length > 200) {
        throw new DomainError('invalid', 'Invalid RPC envelope');
      }
      rpcId = input.rpcId;
      request.signal.throwIfAborted();
      const value = service.execute(record(input.payload), { kind: 'user' });
      return Response.json({ type: 'server-response', rpcId, result: { ok: true, value } }, { headers: { 'cache-control': 'no-store' } });
    } catch (error) {
      return Response.json({ type: 'server-response', rpcId, result: { ok: false, error: {
        code: error instanceof DomainError ? error.code : 'storage_error',
        message: error instanceof Error ? error.message : 'Operation failed', details: {},
      } } }, { headers: { 'cache-control': 'no-store' } });
    }
  };
}

export function apply(ctx, config = {}) {
  const file = join(resolve(config.dataDir || join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'persona-memory')), 'memory.sqlite');
  let service;
  ctx.effect(() => {
    const store = new MemoryStore(file);
    service = new PersonaMemoryService(store);
    return () => store.close();
  }, 'persona-memory: storage');
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'dsh-persona-memory:persona', order: 10500, interpolate: false, text: () => service.personaPrompt(),
  }), 'persona-memory: persona');
  ctx.effect(() => ctx.systemPrompt.context({
    name: 'dsh-persona-memory:memories', order: 650, interpolate: false, text: () => service.memoryPrompt(),
  }), 'persona-memory: remembered context');
  for (const tool of makeTools(service)) ctx.effect(() => ctx.tools.register(tool), `persona-memory: ${tool.name}`);
  ctx.inject(['connection'], transport => {
    transport.effect(() => transport.connection.fetch.register({
      path: `/api/${ENDPOINT}`, methods: ['POST'], requestBody: 'buffered', fetch: createRpcHandler(service),
    }), 'persona-memory: authenticated settings API');
  });
}
