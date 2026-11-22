import type { Capability } from '@/features/auth/capabilities';

/**
 * Vendor help: questions and answers shown on /help.
 *
 * To add or change an answer, edit this file. Keep answers short and in the vendor's words. `needs` hides a topic
 * from vendors who don't have that feature (e.g. bookings for a product-only shop). `links` become buttons that open
 * the screen the answer is about.
 */
export interface HelpLink {
  label: string;
  to: string;
}

export interface HelpQuestion {
  /** Stable id, used in the URL (/help#id) to share an answer. */
  id: string;
  q: string;
  /** Paragraphs. */
  a: string[];
  links?: HelpLink[];
}

export interface HelpTopic {
  id: string;
  title: string;
  needs?: Capability;
  questions: HelpQuestion[];
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    questions: [
      {
        id: 'sign-in',
        q: 'How do I sign in?',
        a: [
          'Enter the mobile number registered for your shop and the one-time password (OTP) we send to it. If the OTP doesn’t arrive or has expired, ask for a new one.',
          'Use the same number on every device. You stay signed in until you sign out or your session expires.',
        ],
      },
      {
        id: 'menu-differs',
        q: 'Why does my menu look different from another shop’s?',
        a: [
          'The portal shows the features for what your shop offers. A shop that sells products sees POS, Products, Inventory and Orders. A shop that provides services sees Services, Bookings and Employees. A shop that does both sees everything.',
          'What your shop offers follows its categories. You can change them under Business profile → Categories.',
        ],
        links: [{ label: 'Business profile', to: '/profile' }],
      },
      {
        id: 'offline',
        q: 'Can I use the portal without internet?',
        a: [
          'Yes, for counter sales: the Point of Sale keeps working offline and saves sales on this device. They are uploaded automatically when you are back online. Everything else (orders, bookings, wallet) needs a connection; a banner at the top tells you when you are offline.',
        ],
      },
    ],
  },
  {
    id: 'categories',
    title: 'Categories and what your shop offers',
    needs: 'profile',
    questions: [
      {
        id: 'several-categories',
        q: 'Can my shop be in more than one category?',
        a: [
          'Yes. Go to Business profile → Categories → Change categories and tick every category you sell or serve in (up to 20).',
        ],
        links: [{ label: 'Change categories', to: '/profile' }],
      },
      {
        id: 'products-and-services',
        q: 'I sell products and also provide services. Can I do both?',
        a: [
          'Yes. Choose at least one product category and one service category. Your shop then offers “Products and services”: you can sell at the counter and online, and take bookings, from one account. The menu updates as soon as you save.',
        ],
        links: [{ label: 'Business profile', to: '/profile' }],
      },
      {
        id: 'category-cost',
        q: 'Do categories cost money?',
        a: [
          'Some categories have a subscription (per day, week or month). The category list shows the price of each one, and before you save, the portal shows how your monthly cost changes. Subscriptions are taken from your wallet — see Subscription & billing.',
        ],
        links: [{ label: 'Subscription & billing', to: '/billing' }],
      },
      {
        id: 'cannot-remove-category',
        q: 'Why can’t I remove a category?',
        a: [
          'You can’t remove all your product categories while you still have active products, or all your service categories while you still offer services — customers could otherwise order something you no longer show. Deactivate those products or pause those services first.',
        ],
      },
    ],
  },
  {
    id: 'orders',
    title: 'Online orders and delivery',
    needs: 'orders',
    questions: [
      {
        id: 'new-order',
        q: 'How do I know when a new order arrives?',
        a: [
          'New orders appear in Orders and in Notifications, with a count next to Orders in the menu. Turn on push notifications (Settings → Notifications) to be told even when the portal is closed, and auto-print (Settings → Printer) to print a slip automatically.',
        ],
        links: [
          { label: 'Orders', to: '/orders?status=created' },
          { label: 'Notification settings', to: '/settings' },
        ],
      },
      {
        id: 'order-steps',
        q: 'What do I do with a new order?',
        a: [
          'Open it and choose Accept order (or Reject, with a reason the customer sees). Then Start preparing, and Ready for pickup when it is packed. A delivery partner is assigned automatically; you can follow them on the order page.',
        ],
      },
      {
        id: 'no-rider',
        q: 'No delivery partner was found. What now?',
        a: [
          'On the order page, use Search for a rider again, or Stop searching if you will deliver it yourself or the customer collects it.',
        ],
        links: [{ label: 'Deliveries', to: '/deliveries' }],
      },
      {
        id: 'customer-phone-hidden',
        q: 'Why is the customer’s phone number hidden?',
        a: [
          'To protect customers, their phone number and email are shown only while an order is open and for 72 hours after it is delivered or cancelled. After that you see a masked number. You can still message them from Messages.',
        ],
        links: [{ label: 'Messages', to: '/chat' }],
      },
      {
        id: 'invoice',
        q: 'How do I print an invoice?',
        a: ['Open the order and choose Print invoice for an A4 invoice with delivery charges, or Print slip for a short receipt-printer slip.'],
      },
    ],
  },
  {
    id: 'pos',
    title: 'Point of Sale (counter sales)',
    needs: 'pos',
    questions: [
      {
        id: 'pos-sell',
        q: 'How do I make a counter sale?',
        a: [
          'Open Point of Sale, scan or type a barcode (or tap a product), choose the payment method and press Charge. Stock goes down automatically and the receipt can be printed.',
        ],
        links: [{ label: 'Point of Sale', to: '/pos' }],
      },
      {
        id: 'pos-discount',
        q: 'Can I give a discount?',
        a: ['Yes, enter a discount in rupees in the cart before charging (online only). It can’t be more than the bill.'],
      },
      {
        id: 'pos-pay-later',
        q: 'The customer will pay later (or UPI hasn’t come through). What do I do?',
        a: [
          'Tick “Not paid yet” before charging. The sale is saved as payment pending. When the money arrives, open the sale from POS → Sales and press Mark as paid (you can add the UPI transaction ID).',
        ],
        links: [{ label: 'POS sales', to: '/pos/sales' }],
      },
      {
        id: 'pos-network-error',
        q: 'The network failed while charging. Will the sale be recorded twice?',
        a: [
          'No. Each sale has its own reference, so pressing Retry checkout records it only once. Sales saved offline are uploaded with the time they happened.',
        ],
      },
      {
        id: 'pos-offline-payment',
        q: 'Why can’t I take card or UPI offline?',
        a: ['Without internet the portal can’t confirm card or UPI payments, so offline sales are cash only.'],
      },
    ],
  },
  {
    id: 'products',
    title: 'Products and stock',
    needs: 'products',
    questions: [
      {
        id: 'add-product',
        q: 'What is the fastest way to add products?',
        a: [
          'Use Products → Add from master catalogue: pick ready-made products (name, photo, MRP) and set your own price and opening stock. You can also create your own product and register its barcode.',
        ],
        links: [{ label: 'Add from master catalogue', to: '/products/catalog' }],
      },
      {
        id: 'adjust-stock',
        q: 'How do I correct stock (damaged, expired, new delivery)?',
        a: [
          'In Inventory, press Adjust on the product, choose what happened (restock, damaged, expired, return, stock count…) and add a reason. Every change is kept in Stock history with who made it and why.',
        ],
        links: [
          { label: 'Inventory', to: '/inventory' },
          { label: 'Stock history', to: '/inventory/movements' },
        ],
      },
      {
        id: 'low-stock',
        q: 'How do I see what is running out?',
        a: ['Inventory → Low stock lists products at or below their own low-stock threshold. Set the threshold on each product.'],
        links: [{ label: 'Low stock', to: '/inventory/low-stock' }],
      },
    ],
  },
  {
    id: 'bookings',
    title: 'Services, bookings and staff',
    needs: 'bookings',
    questions: [
      {
        id: 'booking-steps',
        q: 'What do I do with a new booking?',
        a: [
          'Open it and press Accept booking, or Reject with a reason for the customer. Assign a staff member, then use Mark in progress and Mark completed on the day. If the customer pays the balance at the shop, use Record balance collected.',
        ],
        links: [{ label: 'Bookings', to: '/bookings' }],
      },
      {
        id: 'reschedule',
        q: 'How do I change a booking’s time?',
        a: [
          'Open the booking and choose Reschedule. The portal won’t let you pick a time in the past or a time when the assigned staff member already has another booking.',
        ],
      },
      {
        id: 'add-staff',
        q: 'How do I add or remove staff?',
        a: [
          'Employees → Add employee needs only their name, mobile number and email. To remove someone, reassign their upcoming bookings first, then use the remove button. Set working hours under Availability.',
        ],
        links: [
          { label: 'Employees', to: '/employees' },
          { label: 'Availability', to: '/availability' },
        ],
      },
    ],
  },
  {
    id: 'printing',
    title: 'Printing and photocopy orders',
    needs: 'printing',
    questions: [
      {
        id: 'print-orders',
        q: 'How do printing orders work?',
        a: [
          'Customers upload documents and choose copies, colour and paper. You see them under Printing orders, send a quote when needed, print, and hand over by pickup code or to a delivery partner. Prices come from your rate cards in Printing settings.',
        ],
        links: [
          { label: 'Printing orders', to: '/printing' },
          { label: 'Printing settings', to: '/printing/settings' },
        ],
      },
    ],
  },
  {
    id: 'customers',
    title: 'Customers and messages',
    needs: 'customers',
    questions: [
      {
        id: 'customer-list',
        q: 'Where can I see my regular customers?',
        a: [
          'Customers lists everyone who ordered or booked at your shop, with how often they came and how much they spent. Sort by highest spend or most visits, and open a customer to see their history with you.',
        ],
        links: [{ label: 'Customers', to: '/customers' }],
      },
      {
        id: 'chat',
        q: 'How do I reply to a customer’s message?',
        a: ['Open Messages. Customers start conversations from the TheNearByShop app; you can reply, send photos and see when they have read your message.'],
        links: [{ label: 'Messages', to: '/chat' }],
      },
    ],
  },
  {
    id: 'money',
    title: 'Wallet, withdrawals and bank accounts',
    needs: 'wallet',
    questions: [
      {
        id: 'withdraw',
        q: 'How do I withdraw money to my bank?',
        a: [
          'Go to Withdrawals → Withdraw funds, enter the amount (minimum ₹100) and choose a verified bank account. The amount is set aside straight away and our finance team pays it out; you get a notification when it is paid or if it is rejected.',
        ],
        links: [{ label: 'Withdrawals', to: '/wallet/withdrawals' }],
      },
      {
        id: 'bank-not-verified',
        q: 'Why can’t I choose my bank account?',
        a: ['Only verified accounts can receive payouts. After you add an account, our team verifies it; until then it isn’t offered for withdrawals.'],
        links: [{ label: 'Bank accounts', to: '/bank-accounts' }],
      },
      {
        id: 'available-balance',
        q: 'Why is my available balance lower than my wallet balance?',
        a: ['Money you have already asked to withdraw is set aside until it is paid out or rejected, so it isn’t counted as available.'],
      },
      {
        id: 'withdraw-network',
        q: 'My withdrawal request didn’t confirm. Should I try again?',
        a: ['Yes — pressing Try again sends the same request, so it can never be paid twice.'],
      },
    ],
  },
  {
    id: 'billing',
    title: 'Subscription and billing',
    needs: 'wallet',
    questions: [
      {
        id: 'when-charged',
        q: 'When are subscriptions charged?',
        a: [
          'Every morning at about 6 AM, each of your categories that has a plan is charged from your wallet (daily, weekly or monthly, as the plan says). Every charge is listed under Subscription & billing.',
        ],
        links: [{ label: 'Subscription & billing', to: '/billing' }],
      },
      {
        id: 'not-enough-balance',
        q: 'What happens if my wallet doesn’t have enough money?',
        a: [
          'The charge stays unpaid and is tried again every morning, and right after money reaches your wallet. If it stays unpaid longer than the plan’s grace days, your shop stops taking orders until it is paid. A red banner tells you when this happens.',
        ],
      },
      {
        id: 'reopen-shop',
        q: 'My shop stopped taking orders because of dues. How do I reopen it?',
        a: ['Open Subscription & billing and press Pay from wallet. As soon as all dues are paid, your shop reopens on its own.'],
        links: [{ label: 'Pay dues', to: '/billing' }],
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications and printing',
    questions: [
      {
        id: 'push',
        q: 'How do I get notifications when the portal is closed?',
        a: [
          'Settings → Notifications → Push notifications on this device → Turn on, and allow notifications when the browser asks. Do this on every phone or computer that should ring. Signing out stops notifications on that device.',
        ],
        links: [{ label: 'Settings', to: '/settings' }],
      },
      {
        id: 'push-blocked',
        q: 'It says notifications are blocked.',
        a: [
          'Your browser was told not to allow notifications for this site. Click the lock icon next to the web address, allow Notifications, reload, then turn them on again in Settings. On iPhone, first add the portal to your Home Screen.',
        ],
      },
      {
        id: 'auto-print',
        q: 'Can new orders print automatically?',
        a: [
          'Yes. Settings → Printer: connect a USB or Bluetooth receipt printer (Chrome or Edge on a computer) and turn on automatic printing for new orders, accepted orders, POS receipts or bookings. Each order prints once, even with several tabs open. The print log lets you reprint.',
        ],
        links: [{ label: 'Printer settings', to: '/settings/printer' }],
      },
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    needs: 'reports',
    questions: [
      {
        id: 'reports-range',
        q: 'How do I see sales for a particular period?',
        a: [
          'Open Reports and choose a period (today, yesterday, last 7 or 30 days, this or last month) or pick your own dates. You see revenue compared with the period before, best sellers, payment methods and, for services, staff performance. Use CSV to download the figures.',
        ],
        links: [{ label: 'Reports', to: '/reports' }],
      },
      {
        id: 'revenue-meaning',
        q: 'What counts as revenue?',
        a: ['Delivered orders and completed bookings. Cancelled, rejected and pending ones are counted separately, not as revenue.'],
      },
    ],
  },
  {
    id: 'shop',
    title: 'Shop profile and documents',
    needs: 'profile',
    questions: [
      {
        id: 'shop-hours',
        q: 'How do I change my opening hours or pause orders?',
        a: ['Business profile → Opening hours sets your weekly hours. Use the “Accepting orders” switch on the same page to pause or resume orders at any time.'],
        links: [{ label: 'Business profile', to: '/profile' }],
      },
      {
        id: 'documents',
        q: 'A document was rejected or has expired. How do I send a new one?',
        a: [
          'Business profile → Documents → Document files: choose the document type, attach a PDF or photo (up to 10 MB) and press Upload. It shows “In review” until our team verifies it.',
        ],
        links: [{ label: 'Documents', to: '/profile/documents' }],
      },
      {
        id: 'shop-qr',
        q: 'How do customers find my shop in the app?',
        a: ['Print your Shop QR code and put it on your counter or door. Customers scan it to open your shop in the TheNearByShop app and order.'],
        links: [{ label: 'Shop QR code', to: '/profile/qr' }],
      },
    ],
  },
  {
    id: 'account',
    title: 'Account and security',
    questions: [
      {
        id: 'sign-out',
        q: 'I used the portal on someone else’s device. What should I do?',
        a: [
          'Sign out there (Settings → Sign out). Signing out ends that session on our server too and stops notifications to that device. Offline sales not yet uploaded stay on the device and upload the next time you sign in there.',
        ],
      },
      {
        id: 'change-number',
        q: 'How do I change my registered mobile number or bank details?',
        a: ['For your safety these changes are made by our team. Contact support with your shop name and the new details.'],
      },
    ],
  },
];

/** Topics this vendor should see. */
export function visibleTopics(can: (c: Capability) => boolean): HelpTopic[] {
  return HELP_TOPICS.filter((t) => !t.needs || can(t.needs));
}

/** Questions matching every word of the search, in the question or its answer. */
export function searchTopics(topics: HelpTopic[], query: string): HelpTopic[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return topics;
  return topics
    .map((t) => ({
      ...t,
      questions: t.questions.filter((q) => {
        const text = `${t.title} ${q.q} ${q.a.join(' ')}`.toLowerCase();
        return words.every((w) => text.includes(w));
      }),
    }))
    .filter((t) => t.questions.length > 0);
}
