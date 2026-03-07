import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_KEY } from '../utils/constants';

interface PaymentOptions {
  amount: number;
  currency?: string;
  name?: string;
  description?: string;
  orderId?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
}

interface PaymentResult {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

class RazorpayServiceClass {
  async openPayment(options: PaymentOptions): Promise<PaymentResult> {
    const razorpayOptions = {
      key: RAZORPAY_KEY,
      amount: options.amount * 100, // Razorpay expects amount in paise
      currency: options.currency || 'INR',
      name: options.name || 'TheNearbyShop',
      description: options.description || 'Payment',
      order_id: options.orderId,
      prefill: {
        name: options.prefill?.name || '',
        email: options.prefill?.email || '',
        contact: options.prefill?.contact || '',
      },
      notes: options.notes || {},
      theme: {
        color: '#4A90D9',
      },
    };

    const result = await RazorpayCheckout.open(razorpayOptions);
    return result as PaymentResult;
  }

  async processSubscriptionPayment(
    planId: string,
    amount: number,
    vendorDetails: { name: string; email: string; phone: string }
  ): Promise<PaymentResult> {
    return this.openPayment({
      amount,
      description: 'Subscription Plan Payment',
      prefill: {
        name: vendorDetails.name,
        email: vendorDetails.email,
        contact: vendorDetails.phone,
      },
      notes: { planId, type: 'subscription' },
    });
  }

  async processWalletRecharge(
    amount: number,
    vendorDetails: { name: string; email: string; phone: string }
  ): Promise<PaymentResult> {
    return this.openPayment({
      amount,
      description: 'Wallet Recharge',
      prefill: {
        name: vendorDetails.name,
        email: vendorDetails.email,
        contact: vendorDetails.phone,
      },
      notes: { type: 'wallet_recharge' },
    });
  }
}

export const RazorpayService = new RazorpayServiceClass();
