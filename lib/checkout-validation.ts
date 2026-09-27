import type { Product, Currency } from './types';
import type { OrderItemInput } from './pricing';

export function validateCheckoutItems(items: unknown, products: Product[], currency: Currency): asserts items is OrderItemInput[] {
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) throw new Error('Choose between 1 and 100 items.');
  const quantities = new Map<string, number>();
  const variants = new Map<string, number>();
  for (const item of items) {
    if (!item || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) throw new Error('Quantities must be whole numbers between 1 and 999.');
    const product = products.find(p => p.id === item.product_id);
    if (!product || (product.status && product.status !== 'active')) throw new Error('An item is no longer available. Please refresh your bag.');
    const price = currency === 'GBP' ? product.price_gbp : currency === 'NGN' ? product.price_ngn : product.price_usd;
    if (price === undefined || !Number.isFinite(price) || price <= 0) throw new Error(`${product.name} is not available in ${currency}.`);
    if (typeof item.size !== 'string' || (product.sizes.length > 0 && !product.sizes.includes(item.size))) throw new Error(`Choose an available size for ${product.name}.`);
    if (typeof item.color !== 'string' || (product.colors.length > 0 && !product.colors.some(c => c.name === item.color))) throw new Error(`Choose an available colour for ${product.name}.`);
    const quantity = (quantities.get(product.id) ?? 0) + item.quantity;
    quantities.set(product.id, quantity);
    if (quantity > product.stock_qty) throw new Error(`Only ${product.stock_qty} of ${product.name} remain.`);
    if (product.variants?.length) {
      const variant = product.variants.find(v => v.size === item.size && v.color === item.color);
      const key = JSON.stringify([product.id, item.size, item.color]);
      const count = (variants.get(key) ?? 0) + item.quantity;
      variants.set(key, count);
      if (!variant || count > variant.stock) throw new Error(`The selected size and colour of ${product.name} are unavailable in that quantity.`);
    }
  }
}

export function validateCheckoutContact(body: { email?: string; customer?: { fullName?: string }; shipping?: { street?: string; city?: string; country?: string } }) {
  if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length > 254 || !body.customer?.fullName?.trim() || !body.shipping?.street?.trim() || !body.shipping?.city?.trim() || !body.shipping?.country?.trim()) throw new Error('Enter a valid email, name, and delivery address.');
}
