import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { renderApp } from './renderApp';

describe('authentication', () => {
  it('redirects protected routes to login when signed out', async () => {
    const { router } = renderApp('/wallet');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('logs in with mobile number and OTP, then lands on the dashboard', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await user.type(await screen.findByLabelText(/^Mobile number/), '9876500000');
    await user.click(screen.getByRole('button', { name: 'Send OTP' }));
    await user.type(await screen.findByLabelText(/^One-time password/), '1234');
    await user.click(screen.getByRole('button', { name: 'Verify and sign in' }));
    expect(await screen.findByRole('heading', { name: /Welcome back/ })).toBeInTheDocument();
  });

  it('rejects an invalid mobile number before calling the server', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await user.type(await screen.findByLabelText(/^Mobile number/), '12345');
    await user.click(screen.getByRole('button', { name: 'Send OTP' }));
    expect(await screen.findByText('Enter a valid 10-digit mobile number.')).toBeInTheDocument();
  });

  it('shows an error for a wrong OTP', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await user.type(await screen.findByLabelText(/^Mobile number/), '9876500000');
    await user.click(screen.getByRole('button', { name: 'Send OTP' }));
    await user.type(await screen.findByLabelText(/^One-time password/), '9999');
    await user.click(screen.getByRole('button', { name: 'Verify and sign in' }));
    expect(await screen.findByText('Invalid or expired OTP')).toBeInTheDocument();
  });
});

describe('capability gating', () => {
  it('blocks product routes for service providers', async () => {
    renderApp('/inventory', { authenticated: true, businessType: 'service' });
    expect(await screen.findByText('Not available for your business type')).toBeInTheDocument();
  });
});

describe('wallet', () => {
  it('shows server balances and signed transaction amounts', async () => {
    renderApp('/wallet', { authenticated: true });
    expect(await screen.findByText('Available to withdraw')).toBeInTheDocument();
    expect(await screen.findByText('₹10,450.50')).toBeInTheDocument(); // 12,450.50 − 2,000 pending (server value)
    const table = await screen.findByRole('table');
    expect(within(table).getAllByText('Debit').length).toBeGreaterThan(0);
  });
});

describe('chat', () => {
  it('surfaces a backend failure instead of hiding it', async () => {
    renderApp('/chat', {
      authenticated: true,
      adapterOverride: (cfg) => {
        if (cfg.url?.startsWith('/api/v2/chat/conversations/')) {
          const response = { status: 500, statusText: 'err', data: '<html></html>', headers: {}, config: cfg };
          return Promise.reject(new AxiosError('fail', '500', cfg, null, response));
        }
        return undefined;
      },
    });
    expect(await screen.findByText('Chat service unavailable')).toBeInTheDocument();
  });

  it('denies access with a permission message on 403', async () => {
    renderApp('/chat/thread-1', {
      authenticated: true,
      adapterOverride: (cfg) => {
        if (cfg.url?.includes('/messages/')) {
          const response = { status: 403, statusText: 'Forbidden', data: { detail: 'You are not a participant.' }, headers: {}, config: { ...cfg, headers: new AxiosHeaders() } };
          return Promise.reject(new AxiosError('forbidden', '403', cfg, null, response));
        }
        return undefined;
      },
    });
    expect(await screen.findByText('You are not a participant.')).toBeInTheDocument();
  });
});

describe('scanner', () => {
  it('offers to create a product for an unknown barcode', async () => {
    const user = userEvent.setup();
    renderApp('/scanner', { authenticated: true });
    await user.type(await screen.findByLabelText('Barcode'), '0000000000');
    await user.click(screen.getByRole('button', { name: 'Look up' }));
    expect(await screen.findByRole('heading', { name: 'Unknown barcode' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create product with this barcode/ })).toHaveAttribute('href', '/products/new?barcode=0000000000');
  });

  it('looks up a known barcode and shows server stock', async () => {
    const user = userEvent.setup();
    renderApp('/scanner', { authenticated: true });
    await user.type(await screen.findByLabelText('Barcode'), '890100000101');
    await user.click(screen.getByRole('button', { name: 'Look up' }));
    expect(await screen.findByText('Stock on server')).toBeInTheDocument();
    expect(screen.getAllByText('Amul Butter 100g').length).toBeGreaterThan(0);
    expect(screen.getByText('Stock on server')).toBeInTheDocument();
  });
});

describe('orders', () => {
  it('lists orders and shows only permitted actions on detail', async () => {
    const user = userEvent.setup();
    renderApp('/orders?status=ready-for-pickup', { authenticated: true });
    const row = await screen.findByText('#1096');
    await user.click(row);
    expect(await screen.findByRole('button', { name: 'Cancel order' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept order' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Awaiting pickup', { selector: 'span' })).toBeInTheDocument());
  });
});

describe('withdrawals', () => {
  it('validates the minimum amount', async () => {
    const user = userEvent.setup();
    renderApp('/wallet/withdrawals?new=1', { authenticated: true });
    await user.type(await screen.findByLabelText(/^Amount \(₹\)/), '20');
    await user.click(screen.getByRole('button', { name: 'Review' }));
    expect(await screen.findByText('Minimum withdrawal is ₹100')).toBeInTheDocument();
  });
});

describe('product creation', () => {
  it('creates a product and registers its barcode through the server', async () => {
    const user = userEvent.setup();
    const { db, router } = renderApp('/products/new?barcode=8900000099999', { authenticated: true });
    await user.type(await screen.findByLabelText(/^Product name/), 'Test Ghee 500ml');
    await user.type(screen.getByLabelText(/^Selling price/), '310');
    await user.type(screen.getByLabelText(/^MRP/), '320');
    await user.clear(screen.getByLabelText(/^Initial stock/));
    await user.type(screen.getByLabelText(/^Initial stock/), '8');
    expect(screen.getByLabelText(/^Barcode$/)).toHaveValue('8900000099999');
    await user.click(screen.getByRole('button', { name: 'Create product' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'));
    const created = db.products.find((p) => p.name === 'Test Ghee 500ml')!;
    expect(created).toMatchObject({ stock: 8, barcode: '8900000099999' });
    expect(created.sku).toMatch(/^SKU-/); // server-generated
  });

  it('shows validation errors without calling the server', async () => {
    const user = userEvent.setup();
    const { db } = renderApp('/products/new', { authenticated: true });
    const before = db.products.length;
    await user.type(await screen.findByLabelText(/^Product name/), 'X Item');
    await user.type(screen.getByLabelText(/^Selling price/), '100');
    await user.type(screen.getByLabelText(/^MRP/), '90');
    await user.click(screen.getByRole('button', { name: 'Create product' }));
    expect(await screen.findByText('MRP cannot be lower than the selling price')).toBeInTheDocument();
    expect(db.products.length).toBe(before);
  });
});

describe('POS checkout', () => {
  it('checks out a cash sale and decrements server stock', async () => {
    const user = userEvent.setup();
    const { db } = renderApp('/pos', { authenticated: true });
    const milk = db.products.find((p) => p.barcode === '890100000100')!;
    const before = milk.stock;
    await user.type(await screen.findByLabelText('Barcode'), '890100000100');
    await user.click(screen.getByRole('button', { name: 'Look up' }));
    const charge = (await screen.findAllByRole('button', { name: /Charge/ }))[0];
    await waitFor(() => expect(charge).toBeEnabled());
    await user.click(charge);
    expect(await screen.findByRole('heading', { name: /Sale #\d+ completed/ })).toBeInTheDocument();
    expect(milk.stock).toBe(before - 1);
  });

  it('requires cashier confirmation before charging UPI', async () => {
    const user = userEvent.setup();
    renderApp('/pos', { authenticated: true });
    await user.type(await screen.findByLabelText('Barcode'), '890100000100');
    await user.click(screen.getByRole('button', { name: 'Look up' }));
    await screen.findAllByLabelText('Quantity of Amul Taaza Milk 500ml');
    const method = (await screen.findAllByLabelText(/^Payment method/))[0];
    await user.selectOptions(method, 'upi');
    const charge = screen.getAllByRole('button', { name: /Charge/ })[0];
    expect(charge).toBeDisabled();
    await user.click(screen.getAllByRole('checkbox')[0]);
    expect(charge).toBeEnabled();
  });
});

describe('booking management', () => {
  it('starts a scheduled booking after confirmation', async () => {
    const user = userEvent.setup();
    const { db } = renderApp('/bookings/300', { authenticated: true, businessType: 'service' });
    await user.click(await screen.findByRole('button', { name: 'Mark in progress' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Mark in progress' }));
    await waitFor(() => expect(db.bookings.find((b) => b.id === 300)!.status).toBe('IN_PROGRESS'));
    expect(await screen.findByRole('button', { name: 'Mark completed' })).toBeInTheDocument();
  });
});

describe('master catalogue import', () => {
  it('adds selected products with the vendor price and opening stock', async () => {
    const user = userEvent.setup();
    const { db, router } = renderApp('/products/catalog', { authenticated: true });
    await user.click(await screen.findByLabelText('Select Tata Salt 1kg'));
    await user.click(screen.getByLabelText('Select Maggi Noodles 280g'));
    const price = screen.getByLabelText('Selling price for Tata Salt 1kg');
    await user.clear(price);
    await user.type(price, '29');
    const stock = screen.getByLabelText('Opening stock for Tata Salt 1kg');
    await user.clear(stock);
    await user.type(stock, '40');
    await user.click(screen.getByRole('button', { name: /Add 2 to my shop/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'));
    expect(db.products.find((p) => p.name === 'Tata Salt 1kg')).toMatchObject({ price: '29.00', stock: 40 });
    expect(db.products.find((p) => p.name === 'Maggi Noodles 280g')).toMatchObject({ price: '56.00', stock: 0 });
  });

  it('blocks a selling price above MRP and marks catalogue items already in the shop', async () => {
    const user = userEvent.setup();
    const { db } = renderApp('/products/catalog', { authenticated: true });
    expect(await screen.findByLabelText('Select Amul Taaza Milk 500ml')).toBeDisabled();
    await user.type(screen.getByLabelText('Search catalogue'), 'Bisleri');
    await user.click(await screen.findByLabelText('Select Bisleri 1L'));
    const price = screen.getByLabelText('Selling price for Bisleri 1L');
    await user.clear(price);
    await user.type(price, '25');
    expect(screen.getByText('Above MRP ₹20.00')).toBeInTheDocument();
    const before = db.products.length;
    await user.click(screen.getByRole('button', { name: /Add 1 to my shop/ }));
    expect(await screen.findByText('Fix the highlighted prices or stock first')).toBeInTheDocument();
    expect(db.products.length).toBe(before);
  });
});

describe('invoice', () => {
  it('prints delivery charges and a grand total that adds up', async () => {
    renderApp('/orders/1100/invoice', { authenticated: true });
    expect(await screen.findByText('INVOICE')).toBeInTheDocument();
    const totals = screen.getByText('Delivery charges').closest('dl')!;
    expect(within(totals).getByText('25.00')).toBeInTheDocument();
    expect(within(totals).getByText('Grand total')).toBeInTheDocument();
    expect(within(totals).queryByText('Adjustment')).not.toBeInTheDocument();
    expect(screen.getByText(/^Rupees .* Only$/)).toBeInTheDocument();
  });

  it('is reachable from the order page', async () => {
    renderApp('/orders/1100', { authenticated: true });
    expect(await screen.findByRole('link', { name: /Print invoice/ })).toHaveAttribute('href', '/orders/1100/invoice');
    expect(await screen.findByText('Delivery charges')).toBeInTheDocument();
  });
});

describe('shop QR code', () => {
  it('creates a QR code and offers printing', async () => {
    const user = userEvent.setup();
    renderApp('/profile/qr', { authenticated: true });
    await user.click(await screen.findByRole('button', { name: 'Create my shop QR code' }));
    const img = await screen.findByAltText(/^QR code [A-Z0-9]{8} for Sharma General Store$/);
    expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(screen.getByRole('link', { name: /^Print$/ }).getAttribute('href')).toMatch(/^\/profile\/qr\/print\?code=/);
  });

  it('explains when the server lacks the QR endpoint', async () => {
    renderApp('/profile/qr', {
      authenticated: true,
      adapterOverride: (cfg) => {
        if (cfg.url === '/vendor/dashboard/api/store/qr/') {
          const response = { status: 404, statusText: 'Not Found', data: { detail: 'Not found.' }, headers: {}, config: cfg };
          return Promise.reject(new AxiosError('nf', '404', cfg, null, response));
        }
        return undefined;
      },
    });
    expect(await screen.findByText('Your API server does not have the shop QR endpoint yet')).toBeInTheDocument();
  });
});

describe('delivery rider search', () => {
  it('shows rider-search state and restarts the search when no rider was found', async () => {
    const user = userEvent.setup();
    renderApp('/orders/1096', { authenticated: true });
    expect(await screen.findByText('No rider found')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Search for a rider again' }));
    expect(await screen.findByText('Searching for rider')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign partner' })).not.toBeInTheDocument();
  });

  it('shows the assigned rider with a phone link', async () => {
    renderApp('/orders/1095', { authenticated: true });
    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /9900000001/ })).toHaveAttribute('href', 'tel:9900000001');
  });
});

describe('chat conversations', () => {
  it('lists threads with unread counts, opens one and sends a message', async () => {
    const user = userEvent.setup();
    renderApp('/chat', { authenticated: true });
    expect(await screen.findByLabelText('1 unread')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Priya Sharma/ }));
    expect(await screen.findByText('Is the paneer fresh today?')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Message'), 'Yes, made this morning');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText('Yes, made this morning')).toBeInTheDocument();
  });

  it('opens the conversation linked to an order', async () => {
    const { router } = renderApp('/chat?order=5000', { authenticated: true });
    await waitFor(() => expect(router.state.location.pathname).toBe('/chat/thread-1'));
  });
});
