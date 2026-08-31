import { describe, expect, it } from 'vitest';
import { createHousehold } from '../../src/household/household.js';

describe('household domain', () => {
  it('rejects a household without timezone', () => {
    expect(() => createHousehold({ name: 'Home', timezone: '', locale: 'el-CY' })).toThrow(
      'timezone',
    );
  });

  it('creates an active household with normalized name', () => {
    const household = createHousehold({
      name: '  AGNES Home  ',
      timezone: 'Asia/Nicosia',
      locale: 'el-CY',
    });

    expect(household.name).toBe('AGNES Home');
    expect(household.status).toBe('active');
  });
});
