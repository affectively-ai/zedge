import { describe, test, expect, beforeEach, mock } from 'bun:test';

// Mock DashRelay
mock.module('@dashrelay/client', () => ({
  DashRelay: class {
    config: any;
    constructor(c: any) { this.config = c; }
    async connect() {}
    disconnect() {}
    on() {}
    off() {}
  },
}));

// Mock yjs with UndoManager
mock.module('yjs', () => {
  class T {
    _content = '';
    _doc: any = null;
    get length() { return this._content.length; }
    insert(i: number, t: string) { this._content = this._content.slice(0, i) + t + this._content.slice(i); }
    delete(i: number, l: number) { this._content = this._content.slice(0, i) + this._content.slice(i + l); }
    toString() { return this._content; }
    observe() {}
    unobserve() {}
  }
  class M {
    _map = new Map();
    set(k: string, v: any) { this._map.set(k, v); }
    get(k: string) { return this._map.get(k); }
    has(k: string) { return this._map.has(k); }
    delete(k: string) { return this._map.delete(k); }
    forEach(fn: Function) { this._map.forEach((v: any, k: string) => fn(v, k)); }
    values() { return this._map.values(); }
    keys() { return this._map.keys(); }
    get size() { return this._map.size; }
    observe() {}
    unobserve() {}
  }
  class A {
    _arr: any[] = [];
    push(items: any[]) { this._arr.push(...items); }
    delete(i: number, l: number) { this._arr.splice(i, l); }
    toArray() { return [...this._arr]; }
    get length() { return this._arr.length; }
    forEach(fn: any) { this._arr.forEach(fn); }
    observe() {}
    unobserve() {}
  }
  class D {
    clientID = Math.floor(Math.random() * 1e9);
    _texts = new Map();
    _maps = new Map();
    _arrays = new Map();
    _listeners = new Map<string, Function[]>();
    getText(n: string) {
      if (!this._texts.has(n)) { const t = new T(); (t as any)._doc = this; this._texts.set(n, t); }
      return this._texts.get(n)!;
    }
    getMap(n: string) {
      if (!this._maps.has(n)) this._maps.set(n, new M());
      return this._maps.get(n)!;
    }
    getArray(n: string) {
      if (!this._arrays.has(n)) this._arrays.set(n, new A());
      return this._arrays.get(n)!;
    }
    getXmlFragment() { return { insert() {}, delete() {}, get length() { return 0; }, toArray() { return []; } }; }
    transact(fn: Function, origin?: any) { fn(); (this._listeners.get('update') || []).forEach(cb => cb(new Uint8Array(0), origin)); }
    on(e: string, fn: Function) { if (!this._listeners.has(e)) this._listeners.set(e, []); this._listeners.get(e)!.push(fn); }
    off() {}
    destroy() { this._listeners.clear(); }
  }
  class U {
    _scope: any;
    constructor(s: any, o?: any) { this._scope = s; }
    undo() {}
    redo() {}
    destroy() {}
  }
  return {
    Doc: D, Text: T, Map: M, Array: A, UndoManager: U,
    encodeStateAsUpdate: () => new Uint8Array(0),
    encodeStateVector: () => new Uint8Array(0),
    applyUpdate: () => {},
    transact: (d: any, fn: Function, o?: any) => d.transact(fn, o),
  };
});

const { CrdtBridge } = await import('../crdt-bridge');
const { VfsCrdtAdapter } = await import('../vfs-crdt-adapter');

describe('VfsCrdtAdapter', () => {
  test('syncLocalToCrdt opens file and syncs content', async () => {
    const crdt = new CrdtBridge({ workspaceId: 'ws', peerId: 'p1', displayName: 'Alice' });
    await crdt.connect();
    const adapter = new VfsCrdtAdapter(null as any, crdt);

    await adapter.syncLocalToCrdt('src/main.ts', 'const x = 1;');

    const content = adapter.getCrdtContent('src/main.ts');
    expect(content).toBe('const x = 1;');
    expect(adapter.getSyncedFiles()).toContain('src/main.ts');
  });

  test('syncLocalToCrdt updates existing CRDT content', async () => {
    const crdt = new CrdtBridge({ workspaceId: 'ws', peerId: 'p1', displayName: 'Alice' });
    await crdt.connect();
    const adapter = new VfsCrdtAdapter(null as any, crdt);

    await adapter.syncLocalToCrdt('src/main.ts', 'v1');
    await adapter.syncLocalToCrdt('src/main.ts', 'v2');

    expect(adapter.getCrdtContent('src/main.ts')).toBe('v2');
  });

  test('getCrdtContent returns null for unopened file', async () => {
    const crdt = new CrdtBridge({ workspaceId: 'ws', peerId: 'p1', displayName: 'Alice' });
    await crdt.connect();
    const adapter = new VfsCrdtAdapter(null as any, crdt);

    expect(adapter.getCrdtContent('nope.ts')).toBeNull();
  });

  test('unbind clears state', async () => {
    const crdt = new CrdtBridge({ workspaceId: 'ws', peerId: 'p1', displayName: 'Alice' });
    await crdt.connect();
    const adapter = new VfsCrdtAdapter(null as any, crdt);

    await adapter.syncLocalToCrdt('a.ts', 'content');
    adapter.unbind();

    expect(adapter.getSyncedFiles()).toEqual([]);
  });

  test('bind sets mount ID', async () => {
    const crdt = new CrdtBridge({ workspaceId: 'ws', peerId: 'p1', displayName: 'Alice' });
    await crdt.connect();
    const adapter = new VfsCrdtAdapter(null as any, crdt);

    adapter.bind('mount-1');
    // No error
  });
});
