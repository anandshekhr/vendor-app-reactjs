import { beforeEach, describe, expect, it, vi } from 'vitest';

const written: Uint8Array[] = [];
vi.mock('./transports', () => ({
  printHtml: vi.fn(async () => undefined),
  writeUsb: vi.fn(async (data: Uint8Array) => {
    written.push(data);
  }),
  writeSerial: vi.fn(async () => undefined),
}));

import { autoPrintNewOrders } from './autoPrint';
import { readPrintLog } from './printer';
import { resetPrinterSettingsCache, updatePrinterSettings } from './settings';

function fakeDispatch(found: number[]) {
  // Mimics `dispatch(ordersApi.endpoints.getOrder.initiate(id))` returning `{ unwrap }`.
  return ((action: unknown) => {
    const id = (action as { arg?: number }).arg;
    return {
      unwrap: async () => {
        found.push(id as number);
        return { id, customer_name: 'C', customer_phone: '', total_amount: '10.00', is_paid: true, created_at: '2026-11-14T10:00:00Z', items: [] };
      },
    };
  }) as never;
}

vi.mock('@/features/orders/api', () => ({
  ordersApi: { endpoints: { getOrder: { initiate: (id: number) => ({ arg: id }) } } },
}));

describe('auto-printing new orders', () => {
  beforeEach(() => {
    localStorage.clear();
    resetPrinterSettingsCache();
    written.length = 0;
  });

  it('does nothing while auto-print is off', async () => {
    const fetched: number[] = [];
    await autoPrintNewOrders(fakeDispatch(fetched), [5], null);
    expect(fetched).toEqual([]);
    expect(written).toHaveLength(0);
  });

  it('prints each new order once, oldest first, on the thermal printer', async () => {
    updatePrinterSettings({ autoPrint: true, connection: 'usb', copies: 2 });
    const fetched: number[] = [];
    await autoPrintNewOrders(fakeDispatch(fetched), [12, 11], null);
    expect(fetched).toEqual([11, 12]);
    expect(written).toHaveLength(4); // 2 orders x 2 copies
    await autoPrintNewOrders(fakeDispatch(fetched), [12], null); // seen again by another poll / tab
    expect(written).toHaveLength(4);
    expect(readPrintLog().map((e) => e.title)).toEqual(['Order #12', 'Order #11']);
  });

  it('respects the per-event switch', async () => {
    updatePrinterSettings({ autoPrint: true, connection: 'usb', events: { newOrder: false, acceptedOrder: false, posSale: true, newBooking: false } });
    const fetched: number[] = [];
    await autoPrintNewOrders(fakeDispatch(fetched), [20], null);
    expect(fetched).toEqual([]);
  });
});
