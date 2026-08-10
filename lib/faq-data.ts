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
        a: 'Standard delivery within the UK takes 3–5 business days. Express delivery is available for 1–2 business day shipping. International orders typically arrive within 7–14 business days depending on your location.',
      },
      {
        q: 'Is shipping free?',
        a: 'Yes — we offer free standard shipping on all UK orders over £50. For orders under £50, a flat rate of £3.95 applies. International shipping rates are calculated at checkout.',
      },
      {
        q: 'How can I track my order?',
        a: 'Once your order has been dispatched, you\'ll receive an email with a tracking number and a link to follow your parcel in real time. You can also check your order status in your account dashboard.',
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
        a: 'We recommend using our detailed Size Guide to find your perfect fit. Measure your bust, waist, and hips, then match your measurements to our size chart. Each product page also includes fit-specific guidance.',
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
        a: 'We offer a 30-day return policy. Items must be unworn, unwashed, and in their original packaging with all tags attached. Sale items and hygiene-sealed products that have been opened are not eligible for return.',
      },
      {
        q: 'How do I start a return?',
        a: 'Simply email us at hello@toymak.com with your order number and reason for return. We\'ll send you a prepaid return label within 24 hours.',
      },
      {
        q: 'Can I exchange an item for a different size?',
        a: 'Absolutely. We offer free size exchanges on all full-price items. Contact us with your order number and the size you\'d like, and we\'ll arrange the swap as quickly as possible.',
      },
      {
        q: 'How long do refunds take?',
        a: 'Once we receive your returned item, refunds are processed within 5–7 business days to your original payment method. You\'ll receive an email confirmation when the refund has been issued.',
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
        a: 'We accept all major credit and debit cards (Visa, Mastercard, Amex) via Stripe for international payments, and Paystack for Nigerian customers. Apple Pay and Google Pay are also supported at checkout.',
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
