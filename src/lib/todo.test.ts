import { describe, expect, it } from 'vitest';

import { createTodo, normalizeTodo, toWire } from './todo';

describe('todo updated_at', () => {
  it('is stamped at creation, equal to created_at', () => {
    const todo = createTodo('write specs #dev');
    expect(todo.updated_at).toBe(todo.created_at);
  });

  it('falls back to created_at when absent on the wire', () => {
    const todo = normalizeTodo({ id: '1_1', text: 'old', created_at: 1000 });
    expect(todo.updated_at).toBe(1000);
  });

  it('keeps the wire value when present', () => {
    const todo = normalizeTodo({ id: '1_1', text: 'old', created_at: 1000, updated_at: 2000 });
    expect(todo.updated_at).toBe(2000);
  });

  it('survives toWire — it is a wire field, not local metadata', () => {
    const wire = toWire(createTodo('x'));
    expect(wire.updated_at).toBeDefined();
    expect('_dirty' in wire).toBe(false);
    expect('_origin' in wire).toBe(false);
  });
});
