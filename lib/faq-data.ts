import { contactEmail } from '@/lib/site-info'

export interface FaqQuestion {
  q: string
  a: string
}

export interface FaqSection {
  title: string
  questions: FaqQuestion[]
}

export const faqSections: FaqSection[] = [
  {
    title: 'Orders & Shipping',
    questions: [
      {
        q: 'How long does delivery take?',
        a: 'Standard delivery within the UK takes 2–4 business days. UK Express delivery arrives in 1 business day when you order Monday to Friday before 1pm, and its price is shown at checkout. International orders typically arrive within 7–14 business days depending on your location.',
      },
      {
        q: 'Is shipping free?',
        a: 'Yes — we offer free standard shipping on all UK orders over £50. Below that, and for express or international delivery, the shipping cost is shown at checkout before you pay. No VAT is added at checkout.',
      },
      {
        q: 'How can I track my order?',
        a: 'Once your order has been dispatched, you\'ll receive an email with a tracking number and a link to follow your parcel in real time. You can also check your order status any time on our Track Order page using your email and order number — no account needed.',
      },
      {
        q: 'Do you ship internationally?',
        a: 'Yes, we ship to select countries worldwide. We support multiple currencies including GBP, NGN, and USD. International duties and taxes may apply and are the responsibility of the buyer.',
      },
    ],
  },
  {
    title: 'Sizing & Fit',
    questions: [
      {
        q: 'How do I find my size?',
        a: 'Follow our Size Guide to measure your bust, waist, and hips, then open "Size Guide" or "Need help finding your fit?" on the product page to match your measurements to that product\'s sizes.',
      },
      {
        q: 'What if I\'m between sizes?',
        a: 'If you fall between two sizes, we generally recommend sizing up for comfort — especially with shapewear and waist trainers. Our compression fabrics provide a snug fit, so a little extra room goes a long way.',
      },
      {
        q: 'Are your products true to size?',
        a: 'Our pieces are designed to fit true to size based on standard UK sizing. However, because shapewear is meant to provide compression, the fit may feel snugger than regular clothing. Check individual product descriptions for specific fit notes.',
      },
    ],
  },
  {
    title: 'Returns & Exchanges',
    questions: [
      {
        q: 'What is your return policy?',
        a: 'We offer a 14-day return policy. Items must be unworn, unwashed, and in their original packaging with all tags attached. Sale items and hygiene-sealed products that have been opened are not eligible for return.',
      },
      {
        q: 'How do I start a return?',
        a: `Simply email us at ${contactEmail} with your order number and reason for return. We'll send you a prepaid return label within 24 hours.`,
      },
      {
        q: 'Can I exchange an item for a different size?',
        a: 'Absolutely. We offer free size exchanges on all full-price items. Contact us with your order number and the size you\'d like, and we\'ll arrange the swap as quickly as possible.',
      },
      {
        q: 'How long do refunds take?',
        a: 'Once we receive your returned item, refunds are processed within 5–7 business days to your original payment method. A refund processing fee of £5 may apply. You\'ll receive an email confirmation when the refund has been issued.',
      },
    ],
  },
  {
    title: 'Product & Care',
    questions: [
      {
        q: 'How should I care for my shapewear?',
        a: 'We recommend hand washing in cold water with a gentle detergent and laying flat to dry. Avoid wringing, bleaching, or tumble drying, as this can damage the compression fabric and reduce the lifespan of the garment.',
      },
      {
        q: 'Can I wear shapewear every day?',
        a: 'Yes — our shapewear is designed for comfortable, everyday wear. The breathable fabrics and seamless construction mean you can wear them under any outfit without discomfort. We recommend alternating between pieces to extend their lifespan.',
      },
      {
        q: 'What materials do you use?',
        a: 'We use a blend of premium nylon, spandex, and elastane for optimal stretch, compression, and breathability. All materials are skin-friendly and tested for comfort during extended wear.',
      },
    ],
  },
  {
    title: 'Payments & Discounts',
    questions: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit and debit cards (Visa, Mastercard, Amex) through Stripe, for every country including Nigeria. Apple Pay and Google Pay are also supported at checkout, and you can pay later with Klarna where it\'s available.',
      },
      {
        q: 'How do I apply a discount code?',
        a: 'Enter your discount code in the promo field at checkout and click "Apply." The discount will be reflected in your order total before payment. Only one code can be used per order.',
      },
      {
        q: 'Do you support multiple currencies?',
        a: 'Yes. We currently support GBP (£), NGN (₦), and USD ($). Your currency is automatically detected based on your location, but you can also switch currencies manually from any product page.',
      },
    ],
  },
]
