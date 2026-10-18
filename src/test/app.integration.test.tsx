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
        if (cfg.url?.startsWith('/api/v2/chat/rooms/')) {
          const response = { status: 500, statusText: 'err', data: '<html></html>', headers: {}, config: cfg };
          return Promise.reject(new AxiosError('fail', '500', cfg, null, response));
        }
        return undefined;
      },
    });
    expect(await screen.findByText('Chat service unavailable')).toBeInTheDocument();
  });

  it('denies access with a permission message on 403', async () => {
    renderApp('/chat/room-1', {
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
