import ShopView from "@/components/shop-view";
import { getAllProducts } from "@/lib/server/products";

// Same reasoning as the product page: admin edits show up within a minute.
export const revalidate = 60;

export default async function ShopPage() {
  // An unreachable catalog still renders the page; the client retries.
  const products = await getAllProducts().catch(() => []);
  return <ShopView initialProducts={products} />;
}
