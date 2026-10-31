import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/core/CollaborationDocument.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { resolveCollaborationDocumentId: resolve } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('room identity requires documentId even when a title or legacy name is supplied', () => {
  for (const options of [{}, { documentName: '标题' }, { documentName: '22222222-2222-4222-8222-222222222222' }, { name: 'legacy-room' }, { documentId: '' }, { documentId: '   ' }, { documentId: 123 }]) {
    assert.throws(() => resolve(options), /requires documentId/);
  }
});

test('titles never affect room identity: rename preserves ID, equal titles preserve distinct IDs', () => {
  assert.equal(resolve({ documentId: 'id-a', documentName: '原名称' }), 'id-a');
  assert.equal(resolve({ documentId: 'id-a', documentName: '改名后' }), 'id-a');
  assert.equal(resolve({ documentId: 'id-b', documentName: '原名称' }), 'id-b');
  assert.equal(resolve({ documentId: ' id-a ' }), 'id-a');
});
