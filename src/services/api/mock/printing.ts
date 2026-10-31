/**
 * Mock of /api/v1/print-shop/vendor/* for development and e2e tests. Mirrors the server's rules (allowed actions per
 * status, pickup code checks with a 5-attempt lock, delivery request states) closely enough to exercise the UI.
 *
 * Seeded pickup codes: PRT-READY-PICKUP → 246810, PRT-VERIFY-ME → 135790.
 */
import type {
  PrintDeliveryBlock,
  PrintFulfilmentType,
  PrintOrderDetail,
  PrintOrderStatus,
  PrintRateCard,
  PrintShopSettings,
  PrintVendorAction,
} from '@/types/api';

type Result = [number, unknown];

const LABEL: Record<PrintOrderStatus, string> = {
  CREATED: 'Draft',
  QUOTATION_PENDING: 'Quotation Pending',
  AWAITING_APPROVAL: 'Awaiting Customer Approval',
  PAYMENT_PENDING: 'Payment Pending',
  NEW_REQUEST: 'New Request',
  RECEIVED: 'Confirmed',
  PRINTING: 'Printing in Progress',
  QUALITY_CHECK: 'Quality Check',
  READY_FOR_PICKUP: 'Ready for Pickup',
  PICKUP_VERIFIED: 'Pickup OTP Verified',
  READY_FOR_DELIVERY: 'Ready for Delivery',
  PARTNER_ASSIGNED: 'Delivery Partner Assigned',
  PICKED_UP: 'Picked Up',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

const BUCKETS: Record<string, PrintOrderStatus[]> = {
  new: ['NEW_REQUEST', 'QUOTATION_PENDING'],
  quotes: ['QUOTATION_PENDING', 'AWAITING_APPROVAL'],
  in_progress: ['RECEIVED', 'PRINTING', 'QUALITY_CHECK'],
  ready: ['READY_FOR_PICKUP', 'PICKUP_VERIFIED', 'READY_FOR_DELIVERY', 'PARTNER_ASSIGNED'],
  out: ['PICKED_UP', 'OUT_FOR_DELIVERY'],
  done: ['COMPLETED', 'DELIVERED'],
  closed: ['REJECTED', 'CANCELLED'],
};
const TERMINAL: PrintOrderStatus[] = ['DELIVERED', 'COMPLETED', 'REJECTED', 'CANCELLED'];
const VENDOR_CANCELLABLE: PrintOrderStatus[] = ['RECEIVED', 'PRINTING', 'QUALITY_CHECK', 'READY_FOR_PICKUP', 'READY_FOR_DELIVERY'];

// A one-page PDF, so the preview dialog has something to show.
const SAMPLE_PDF =
  'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDU5NSA4NDJdL1BhcmVudCAyIDAgUj4+CmVuZG9iagp0cmFpbGVyCjw8L1Jvb3QgMSAwIFI+PgolJUVPRgo=';

interface MockPrintOrder extends PrintOrderDetail {
  _code?: string;
}

const iso = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60000).toISOString();

function makeOrder(n: number, status: PrintOrderStatus, fulfilment: PrintFulfilmentType, extra: Partial<MockPrintOrder> = {}): MockPrintOrder {
  const delivery = fulfilment === 'DELIVERY';
  const fee = delivery ? '30.00' : '0.00';
  const subtotal = (20 * n).toFixed(2);
  const id = `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const order: MockPrintOrder = {
    id,
    order_number: extra.order_number ?? `PRT${String(4000 + n)}AB`,
    status,
    status_display: LABEL[status],
    fulfilment_type: fulfilment,
    fulfilment_type_display: delivery ? 'Home Delivery' : 'Self Pickup',
    payment_method: 'ONLINE',
    payment_method_display: 'Online',
    payment_status: 'PAID',
    total_pages: 10 * n,
    total_amount: (Number(subtotal) + Number(fee)).toFixed(2),
    quotation_required: false,
    created_at: iso(30 * n),
    ready_at: null,
    print_shop_name: 'Copy Corner',
    is_delivery: delivery,
    delivery_address_detail: delivery
      ? { id: 1, name: 'Home', address_line: '44 Sarabha Nagar', city: 'Ludhiana', state: 'Punjab', zip_code: '141002', phone_number: '9811111111', latitude: '30.91', longitude: '75.849' }
      : null,
    subtotal_amount: subtotal,
    delivery_fee: fee,
    quoted_amount: null,
    quotation: null,
    quotations: [],
    clarification_request: '',
    clarification_requested_at: null,
    special_instructions: n % 2 ? 'Please staple each file separately.' : '',
    accepted_at: null,
    pickup_verified_at: null,
    picked_up_at: null,
    delivered_at: null,
    completed_at: null,
    cancelled_at: null,
    cancellation_reason: '',
    rejected_at: null,
    rejection_reason: '',
    refund_status: 'NONE',
    refund_amount: '0.00',
    delivery: delivery ? deliveryBlock('not_requested') : null,
    pickup: delivery ? null : { waiting: false, code_expires_at: null, failed_attempts: 0, locked: false, verified_at: null, picked_up_at: null },
    customer: { name: ['Asha Verma', 'Rahul Singh', 'Neha Gupta', 'Imran Khan'][n % 4], phone: `98765${String(43210 + n)}` },
    files: [
      {
        id: n * 10 + 1,
        original_filename: n % 2 ? 'Assignment_Chapter3.pdf' : 'Project_Report.docx',
        file_type: n % 2 ? 'pdf' : 'docx',
        mime_type: n % 2 ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        file_size: 245_000 * n,
        copies: n % 3 ? 1 : 2,
        color_mode: n % 4 === 0 ? 'COLOR' : 'BW',
        paper_size: 'A4',
        sided: n % 2 ? 'DOUBLE' : 'SINGLE',
        binding: n % 3 === 0 ? 'SPIRAL' : 'NONE',
        page_range: n % 5 === 0 ? '1-5,8' : '',
        special_instructions: '',
        total_pages: 10 * n,
        page_count_status: 'AUTO_DETECTED',
        computed_price: subtotal,
        previewable: n % 2 === 1,
        is_deleted: false,
      },
    ],
    print_jobs: [],
    history: [{ from_status: 'PAYMENT_PENDING', to_status: status, to_status_display: LABEL[status], note: '', is_override: false, created_at: iso(30 * n - 5) }],
    allowed_actions: [],
    ...extra,
  };
  if (['RECEIVED', 'PRINTING', 'QUALITY_CHECK'].includes(status) || TERMINAL.includes(status) || status.startsWith('READY') || status === 'PICKUP_VERIFIED') {
    order.print_jobs = order.files.map((f, i) => ({
      id: n * 100 + i,
      file_id: f.id,
      file_name: f.original_filename,
      status: status === 'RECEIVED' ? 'QUEUED' : 'PRINTED',
      printer_name: '',
      retry_count: 0,
      last_error: '',
      printed_at: status === 'RECEIVED' ? null : iso(10),
    }));
  }
  return order;
}

function deliveryBlock(state: PrintDeliveryBlock['state'], extra: Partial<PrintDeliveryBlock> = {}): PrintDeliveryBlock {
  return { state, platform_status: null, delivery_order_id: null, rider: null, can_request: false, attempts: 0, fee: '30.00', distance_km: '3.20', eta_minutes: 52, ...extra };
}

function allowedActions(o: MockPrintOrder): PrintVendorAction[] {
  const s = o.status;
  const a: PrintVendorAction[] = [];
  if (s === 'NEW_REQUEST') a.push('accept', 'reject');
  if (s === 'QUOTATION_PENDING') a.push('quote', 'reject');
  if (s === 'AWAITING_APPROVAL') a.push('revise_quote');
  if (s === 'RECEIVED') a.push('start_printing');
  if (s === 'PRINTING') a.push('quality_check');
  if (s === 'QUALITY_CHECK') a.push('mark_ready', 'back_to_printing');
  if (o.delivery?.can_request) a.push('request_delivery');
  if (s === 'READY_FOR_PICKUP') a.push('verify_pickup');
  if (s === 'PICKUP_VERIFIED') a.push('hand_over');
  if (VENDOR_CANCELLABLE.includes(s)) a.push('cancel');
  if (!TERMINAL.includes(s) && s !== 'CREATED') a.push('request_clarification');
  return a;
}

export function createPrintingMock() {
  const settings: PrintShopSettings = {
    id: 1,
    shop_name: 'Copy Corner',
    is_accepting_orders: true,
    auto_accept_orders: false,
    supports_pickup: true,
    supports_delivery: true,
    accepts_cash: true,
    pickup_instructions: 'Counter 2, next to the stationery shelf',
    service_radius_km: 5,
    turnaround_minutes_min: 30,
    turnaround_minutes_max: 120,
    max_files_per_order: 10,
    max_file_size_mb: 25,
  };
  let nextCardId = 3;
  let rateCards: PrintRateCard[] = [
    { id: 1, color_mode: 'BW', paper_size: 'A4', sided: 'SINGLE', binding: 'NONE', price_per_page: '2.00', binding_fee: '0.00', is_active: true },
    { id: 2, color_mode: 'COLOR', paper_size: 'A4', sided: 'SINGLE', binding: 'NONE', price_per_page: '10.00', binding_fee: '0.00', is_active: true },
  ];

  const orders: MockPrintOrder[] = [
    makeOrder(1, 'NEW_REQUEST', 'PICKUP', { order_number: 'PRT-NEW-PICKUP', payment_method: 'COD', payment_method_display: 'Cash', payment_status: 'PENDING' }),
    makeOrder(2, 'QUOTATION_PENDING', 'DELIVERY', { order_number: 'PRT-NEEDS-QUOTE', quotation_required: true, payment_status: 'PENDING' }),
    makeOrder(3, 'QUALITY_CHECK', 'DELIVERY', { order_number: 'PRT-QC-DELIVERY' }),
    makeOrder(4, 'READY_FOR_PICKUP', 'PICKUP', {
      order_number: 'PRT-READY-PICKUP',
      _code: '246810',
      ready_at: iso(15),
      pickup: { waiting: true, code_expires_at: iso(-60 * 70), failed_attempts: 0, locked: false, verified_at: null, picked_up_at: null },
    }),
    makeOrder(5, 'PARTNER_ASSIGNED', 'DELIVERY', {
      order_number: 'PRT-RIDER-ASSIGNED',
      ready_at: iso(25),
      delivery: deliveryBlock('assigned', { attempts: 1, platform_status: 'ACCEPTED', rider: { name: 'Ravi Kumar', phone: '9822222222', vehicle_type: 'Bike' } }),
    }),
    makeOrder(6, 'READY_FOR_PICKUP', 'PICKUP', {
      order_number: 'PRT-VERIFY-ME',
      _code: '135790',
      payment_method: 'COD',
      payment_method_display: 'Cash',
      payment_status: 'PENDING',
      pickup: { waiting: true, code_expires_at: iso(-60 * 70), failed_attempts: 0, locked: false, verified_at: null, picked_up_at: null },
    }),
    makeOrder(7, 'COMPLETED', 'PICKUP', { order_number: 'PRT-DONE' }),
    makeOrder(8, 'RECEIVED', 'PICKUP', { order_number: 'PRT-CONFIRMED' }),
  ];

  const find = (id: string) => orders.find((o) => o.id === id);
  const view = (o: MockPrintOrder): PrintOrderDetail => {
    const rest = { ...o };
    delete rest._code;
    return { ...rest, allowed_actions: allowedActions(o) };
  };
  const move = (o: MockPrintOrder, to: PrintOrderStatus, note = '') => {
    o.history = [{ from_status: o.status, to_status: to, to_status_display: LABEL[to], note, is_override: false, created_at: new Date().toISOString() }, ...o.history];
    o.status = to;
    o.status_display = LABEL[to];
  };
  const conflict = (detail: string): Result => [409, { detail }];

  const listItem = (o: MockPrintOrder) => ({
    id: o.id,
    order_number: o.order_number,
    status: o.status,
    status_display: o.status_display,
    fulfilment_type: o.fulfilment_type,
    fulfilment_type_display: o.fulfilment_type_display,
    payment_method: o.payment_method,
    payment_status: o.payment_status,
    total_pages: o.total_pages,
    total_amount: o.total_amount,
    quotation_required: o.quotation_required,
    customer_name: o.customer.name,
    file_count: o.files.length,
    delivery_state: o.delivery?.state ?? null,
    created_at: o.created_at,
    ready_at: o.ready_at,
  });

  function verify(o: MockPrintOrder, code: string): Result {
    if (o.status !== 'READY_FOR_PICKUP' || !o.pickup) return conflict("This order isn't waiting for pickup.");
    if (o.pickup.locked) return [400, { detail: 'Too many wrong codes. Ask the customer to reopen the code in their app for a new one.' }];
    if (code !== o._code) {
      o.pickup.failed_attempts += 1;
      o.pickup.locked = o.pickup.failed_attempts >= 5;
      const left = 5 - o.pickup.failed_attempts;
      return [400, { detail: left > 0 ? `Wrong pickup code. ${left} attempt(s) left.` : 'Wrong pickup code. The code is now locked; the customer must reopen it for a new one.' }];
    }
    o.pickup.verified_at = new Date().toISOString();
    o.pickup.waiting = false;
    move(o, 'PICKUP_VERIFIED', 'Pickup verified by OTP.');
    return [200, view(o)];
  }

  function act(id: string, action: string, body: Record<string, unknown> = {}): Result {
    const o = find(id);
    if (!o) return [404, { detail: 'Not found.' }];
    const can = allowedActions(o);
    switch (action) {
      case 'accept':
        if (!can.includes('accept')) return conflict('Only new requests can be accepted.');
        move(o, 'RECEIVED', 'Accepted by the shop.');
        o.print_jobs = o.files.map((f, i) => ({ id: Date.now() + i, file_id: f.id, file_name: f.original_filename, status: 'QUEUED', printer_name: '', retry_count: 0, last_error: '', printed_at: null }));
        break;
      case 'reject':
        if (!can.includes('reject')) return conflict('Only new requests and quotation requests can be rejected.');
        if (!body.reason) return [400, { reason: ['This field is required.'] }];
        o.rejection_reason = String(body.reason);
        move(o, 'REJECTED', String(body.reason));
        break;
      case 'cancel':
        if (!can.includes('cancel')) return conflict("The order can't be cancelled once it has left the shop.");
        o.cancellation_reason = String(body.reason ?? '');
        if (o.payment_status === 'PAID') Object.assign(o, { refund_status: 'PENDING', refund_amount: o.total_amount });
        move(o, 'CANCELLED', o.cancellation_reason);
        break;
      case 'quote': {
        if (!can.includes('quote') && !can.includes('revise_quote')) return conflict('A quotation can only be sent while the order is waiting for one.');
        const q = { id: Date.now(), quoted_amount: String(body.quoted_amount), details: String(body.details ?? ''), estimated_completion_minutes: (body.estimated_completion_minutes as number) ?? null, status: 'PENDING' as const, created_at: new Date().toISOString(), responded_at: null };
        o.quotations = [q, ...o.quotations.map((x) => (x.status === 'PENDING' ? { ...x, status: 'SUPERSEDED' as const } : x))];
        o.quotation = q;
        move(o, 'AWAITING_APPROVAL', `Quotation: Rs ${q.quoted_amount}.`);
        break;
      }
      case 'request-clarification':
        o.clarification_request = String(body.message ?? '');
        o.clarification_requested_at = new Date().toISOString();
        break;
      case 'status': {
        const to = body.status as PrintOrderStatus;
        const ok = (to === 'PRINTING' && ['RECEIVED', 'QUALITY_CHECK'].includes(o.status)) || (to === 'QUALITY_CHECK' && o.status === 'PRINTING');
        if (!ok) return conflict(`Cannot move print order from '${o.status_display}' to '${LABEL[to] ?? to}'.`);
        move(o, to);
        break;
      }
      case 'ready':
        if (!can.includes('mark_ready')) return conflict('The order must pass the quality check first.');
        o.ready_at = new Date().toISOString();
        if (o.fulfilment_type === 'PICKUP') {
          o._code = '112233';
          o.pickup = { waiting: true, code_expires_at: new Date(Date.now() + 72 * 3600_000).toISOString(), failed_attempts: 0, locked: false, verified_at: null, picked_up_at: null };
          move(o, 'READY_FOR_PICKUP');
        } else {
          move(o, 'READY_FOR_DELIVERY');
          o.delivery = deliveryBlock('searching', { attempts: 1, platform_status: 'ASSIGNMENT_PENDING' });
        }
        break;
      case 'request-delivery':
        if (!o.delivery?.can_request) return conflict('A delivery partner has already been requested for this order.');
        o.delivery = deliveryBlock('searching', { attempts: o.delivery.attempts + 1 });
        break;
      case 'verify-pickup': {
        const code = body.qr_payload ? String(body.qr_payload).split(':').pop() ?? '' : String(body.code ?? '');
        return verify(o, code);
      }
      case 'hand-over':
        if (o.status !== 'PICKUP_VERIFIED') return conflict("Verify the customer's pickup code before handing over the documents.");
        if (o.payment_method === 'COD' && o.payment_status !== 'PAID') {
          if (!body.cash_collected) return conflict(`Collect Rs ${o.total_amount} in cash before handing over.`);
          o.payment_status = 'PAID';
        }
        o.picked_up_at = new Date().toISOString();
        if (o.pickup) o.pickup.picked_up_at = o.picked_up_at;
        move(o, 'PICKED_UP', 'Documents handed to the customer.');
        move(o, 'COMPLETED', 'Picked up.');
        break;
      default:
        return [404, { detail: 'Unknown action.' }];
    }
    return [200, view(o)];
  }

  function jobAction(id: string, jobId: number, action: string, body: Record<string, unknown>): Result {
    const o = find(id);
    const job = o?.print_jobs.find((j) => j.id === jobId);
    if (!o || !job) return [404, { detail: 'Not found.' }];
    if (action === 'printed') {
      Object.assign(job, { status: 'PRINTED', printed_at: new Date().toISOString(), printer_name: String(body.printer_name ?? '') });
      if (o.status === 'RECEIVED') move(o, 'PRINTING', 'Printing started.');
    } else if (action === 'failed') {
      Object.assign(job, { status: 'FAILED', last_error: String(body.error || 'Printer error') });
    } else {
      if (!body.reason) return conflict('Give a reason for the reprint.');
      Object.assign(job, { status: 'QUEUED', retry_count: job.retry_count + 1, printed_at: null });
      if (o.status === 'QUALITY_CHECK') move(o, 'PRINTING', `Reprint: ${String(body.reason)}`);
    }
    return [200, view(o)];
  }

  return {
    settings: (): Result => [200, settings],
    updateSettings: (body: Partial<PrintShopSettings>): Result => {
      Object.assign(settings, body);
      return [200, settings];
    },
    rateCards: (): Result => [200, rateCards],
    saveRateCard: (body: Partial<PrintRateCard>, id?: number): Result => {
      const clash = rateCards.find((c) => c.id !== id && c.color_mode === body.color_mode && c.paper_size === body.paper_size && c.sided === body.sided && c.binding === body.binding);
      if (clash) return [400, { non_field_errors: ['You already have a price for this combination. Edit that one instead.'] }];
      if (id) {
        const card = rateCards.find((c) => c.id === id);
        if (!card) return [404, { detail: 'Not found.' }];
        Object.assign(card, body);
        return [200, card];
      }
      const card = { ...(body as PrintRateCard), id: nextCardId++ };
      rateCards = [...rateCards, card];
      return [201, card];
    },
    deleteRateCard: (id: number): Result => {
      rateCards = rateCards.filter((c) => c.id !== id);
      return [204, null];
    },
    summary: (): Result => {
      const count = (statuses: PrintOrderStatus[]) => orders.filter((o) => statuses.includes(o.status)).length;
      return [
        200,
        {
          ...Object.fromEntries(Object.entries(BUCKETS).map(([k, v]) => [k, count(v)])),
          awaiting_pickup: count(['READY_FOR_PICKUP']),
          delivery_attention: orders.filter((o) => o.status === 'READY_FOR_DELIVERY' && o.delivery?.can_request).length,
        },
      ];
    },
    list: (query: URLSearchParams) => {
      const bucket = query.get('bucket');
      const fulfilment = query.get('fulfilment_type');
      const q = (query.get('q') ?? '').toLowerCase();
      return orders
        .filter((o) => !bucket || BUCKETS[bucket]?.includes(o.status))
        .filter((o) => !fulfilment || o.fulfilment_type === fulfilment)
        .filter((o) => !q || o.order_number.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q))
        .map(listItem);
    },
    detail: (id: string): Result => {
      const o = find(id);
      return o ? [200, view(o)] : [404, { detail: 'Not found.' }];
    },
    act,
    jobAction,
    verifyAny: (body: Record<string, unknown>): Result => {
      if (body.qr_payload) {
        const [, orderId, code] = String(body.qr_payload).split(':');
        const o = find(orderId);
        return o ? verify(o, code) : [400, { detail: "This pickup code belongs to another shop's order." }];
      }
      const o = orders.find((x) => x.status === 'READY_FOR_PICKUP' && x._code === body.code && !x.pickup?.locked);
      return o ? verify(o, String(body.code)) : [400, { detail: 'No order waiting for pickup matches this code.' }];
    },
    link: (id: string, fileId: number, disposition: string): Result => {
      const file = find(id)?.files.find((f) => f.id === fileId);
      if (!file) return [404, { detail: 'Not found.' }];
      const inline = disposition === 'inline' && file.previewable;
      return [200, { url: SAMPLE_PDF, disposition: inline ? 'inline' : 'attachment', expires_at: new Date(Date.now() + 300_000).toISOString(), previewable: inline }];
    },
  };
}
