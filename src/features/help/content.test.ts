import { describe, expect, it } from 'vitest';
import { capabilitiesFor } from '@/features/auth/capabilities';
import { HELP_TOPICS, searchTopics, visibleTopics } from './content';

const forType = (t: 'product' | 'service' | 'hybrid') => {
  const caps = capabilitiesFor(t);
  return visibleTopics((c) => caps.has(c));
};

describe('help content', () => {
  it('has unique ids, so /help#id links work', () => {
    const ids = HELP_TOPICS.flatMap((t) => [`topic-${t.id}`, ...t.questions.map((q) => q.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('shows each business type only its own topics', () => {
    const product = forType('product').map((t) => t.id);
    const service = forType('service').map((t) => t.id);
    const hybrid = forType('hybrid').map((t) => t.id);
    expect(product).toContain('pos');
    expect(product).not.toContain('bookings');
    expect(service).toContain('bookings');
    expect(service).not.toContain('pos');
    expect(hybrid).toEqual(expect.arrayContaining(['pos', 'bookings', 'billing']));
    expect(product).not.toContain('printing'); // only print shops
  });

  it('search matches every word in the question or answer, ignoring case', () => {
    const hits = searchTopics(HELP_TOPICS, 'Withdraw MINIMUM');
    expect(hits.flatMap((t) => t.questions.map((q) => q.id))).toEqual(['withdraw']);
    expect(searchTopics(HELP_TOPICS, '  ')).toBe(HELP_TOPICS);
    expect(searchTopics(HELP_TOPICS, 'zzzz-nothing')).toEqual([]);
  });

  it('links only to routes the portal has', () => {
    const routes = /^\/(orders|deliveries|printing(\/settings)?|products\/catalog|inventory(\/movements|\/low-stock)?|pos(\/sales)?|bookings|employees|availability|customers|chat|wallet\/withdrawals|bank-accounts|profile(\/documents|\/qr)?|billing|settings(\/printer)?|reports)(\?.*)?$/;
    for (const q of HELP_TOPICS.flatMap((t) => t.questions)) for (const l of q.links ?? []) expect(l.to).toMatch(routes);
  });
});
