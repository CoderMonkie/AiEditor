import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/core/CollaborationUrl.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { resolveCollaborationUrl: resolve } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('same-origin defaults retain public hostname/port and choose ws/wss', () => {
  assert.equal(resolve(undefined, 'http://rdvn.example:8080/gencode/page?x=1'), 'ws://rdvn.example:8080/kam-collab/ws');
  assert.equal(resolve('', 'https://kam.example/gencode/page'), 'wss://kam.example/kam-collab/ws');
  assert.equal(resolve('/custom/ws', 'https://kam.example/page'), 'wss://kam.example/custom/ws');
});
test('explicit service URLs override the same-origin default', () => {
  assert.equal(resolve('ws://127.0.0.1:4411', 'http://localhost:2728/'), 'ws://127.0.0.1:4411/');
  assert.equal(resolve('https://collab.example/ws', 'https://kam.example/'), 'wss://collab.example/ws');
});
test('invalid protocol, insecure HTTPS target and URL fragments fail clearly', () => {
  assert.throws(() => resolve('ftp://host/ws', 'http://kam.example/'), /must use/);
  assert.throws(() => resolve('ws://host/ws', 'https://kam.example/'), /require a secure/);
  assert.throws(() => resolve('/ws#fragment', 'https://kam.example/'), /fragment/);
});
