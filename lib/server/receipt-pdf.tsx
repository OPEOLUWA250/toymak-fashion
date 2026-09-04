import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { Currency, Order } from "@/lib/types";
import { formatCurrency } from "@/lib/pricing";

/**
 * The PDF's base font (Helvetica, the PDF spec's built-in default) only
 * supports the WinAnsi/Latin-1 character set — £ and $ fall inside that
 * range and render fine, but the Naira sign (₦) doesn't and silently
 * renders as a broken glyph. Rather than bundle a custom font and hope it
 * happens to include that symbol, NGN amounts use the ISO code instead —
 * unambiguous, and standard practice on real invoices anyway.
 */
function formatPdfCurrency(amount: number, currency: Currency): string {
  if (currency === "NGN") {
    return `NGN ${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return formatCurrency(amount, currency);
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#101820", fontFamily: "Helvetica" },
  brand: { fontSize: 18, fontWeight: 700, letterSpacing: 1 },
  eyebrow: { fontSize: 9, color: "#6b6b6b", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  metaLabel: { fontSize: 8, color: "#6b6b6b", textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: 10, fontWeight: 700, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, color: "#6b6b6b" },
  addressLine: { fontSize: 10, lineHeight: 1.5 },
  table: { borderTop: "1px solid #e5e5e5" },
  tableHeaderRow: { flexDirection: "row", borderBottom: "1px solid #e5e5e5", paddingVertical: 6 },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #f3f3f3", paddingVertical: 8 },
  colProduct: { flex: 3 },
  colQty: { flex: 1, textAlign: "center" },
  colPrice: { flex: 1, textAlign: "right" },
  colSubtotal: { flex: 1, textAlign: "right" },
  headerCell: { fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#6b6b6b" },
  itemMeta: { fontSize: 8, color: "#6b6b6b", marginTop: 2 },
  totalsBlock: { marginTop: 16, alignItems: "flex-end" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", width: 200, marginTop: 4 },
  totalsLabel: { fontSize: 10, color: "#6b6b6b" },
  totalsValue: { fontSize: 10, fontWeight: 700 },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", width: 200, marginTop: 8, paddingTop: 8, borderTop: "1px solid #101820" },
  grandTotalLabel: { fontSize: 12, fontWeight: 700 },
  grandTotalValue: { fontSize: 12, fontWeight: 700 },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40, fontSize: 8, color: "#6b6b6b", textAlign: "center", borderTop: "1px solid #e5e5e5", paddingTop: 12 },
});

function ReceiptDocument({ order }: { order: Order }) {
  return (
    <Document title={`Toymak Receipt ${order.tracking_id}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>TOYMAK</Text>
            <Text style={styles.eyebrow}>Receipt</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Order ID</Text>
            <Text style={styles.metaValue}>{order.id}</Text>
            <Text style={[styles.metaLabel, { marginTop: 6 }]}>Tracking ID</Text>
            <Text style={styles.metaValue}>{order.tracking_id}</Text>
            <Text style={[styles.metaLabel, { marginTop: 6 }]}>Date</Text>
            <Text style={styles.metaValue}>
              {order.created_at.toLocaleDateString("en-GB", { dateStyle: "long" })}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billed To</Text>
          <Text style={styles.addressLine}>{order.customer_name}</Text>
          <Text style={styles.addressLine}>{order.customer_email}</Text>
          <Text style={styles.addressLine}>{order.customer_phone}</Text>
          <Text style={styles.addressLine}>{order.shipping_address.street}</Text>
          <Text style={styles.addressLine}>
            {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postalCode}
          </Text>
          <Text style={styles.addressLine}>{order.shipping_address.country}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.headerCell, styles.colProduct]}>Product</Text>
            <Text style={[styles.headerCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerCell, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.headerCell, styles.colSubtotal]}>Subtotal</Text>
          </View>
          {order.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={styles.colProduct}>
                <Text>{item.product_name}</Text>
                <Text style={styles.itemMeta}>
                  Size {item.size} · {item.color}
                </Text>
              </View>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatPdfCurrency(item.unit_price, order.currency)}</Text>
              <Text style={styles.colSubtotal}>{formatPdfCurrency(item.subtotal, order.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>
              {formatPdfCurrency(order.subtotal + order.discount_applied, order.currency)}
            </Text>
          </View>
          {order.discount_applied > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount</Text>
              <Text style={styles.totalsValue}>-{formatPdfCurrency(order.discount_applied, order.currency)}</Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Shipping</Text>
            <Text style={styles.totalsValue}>
              {order.shipping_cost === 0 ? "Free" : formatPdfCurrency(order.shipping_cost, order.currency)}
            </Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax</Text>
            <Text style={styles.totalsValue}>{formatPdfCurrency(order.tax, order.currency)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Paid</Text>
            <Text style={styles.grandTotalValue}>{formatPdfCurrency(order.total_amount, order.currency)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Toymak — premium shapewear for the modern woman. Questions about this order? Reach us
          at hello@toymak.com, quoting order {order.tracking_id}.
        </Text>
      </Page>
    </Document>
  );
}

export async function generateReceiptPdf(order: Order): Promise<Buffer> {
  return renderToBuffer(<ReceiptDocument order={order} />);
}
