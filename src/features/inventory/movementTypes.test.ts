import { describe, expect, it } from 'vitest';
import { movementSpec, validateAdjustment } from './movementTypes';

describe('stock adjustments', () => {
  it('maps business movement types onto server operations', () => {
    expect(movementSpec('restock').operation).toBe('add');
    expect(movementSpec('damaged').operation).toBe('subtract');
    expect(movementSpec('expired').operation).toBe('subtract');
    expect(movementSpec('correction').operation).toBe('set');
  });
  it('pre-checks obvious mistakes before calling the server', () => {
    expect(validateAdjustment(movementSpec('damaged'), 10, 4)).toMatch(/Only 4/);
    expect(validateAdjustment(movementSpec('restock'), 0, 4)).toMatch(/greater than zero/);
    expect(validateAdjustment(movementSpec('correction'), 0, 4)).toBeNull();
    expect(validateAdjustment(movementSpec('restock'), 1.5, 4)).toMatch(/whole number/);
  });
});
