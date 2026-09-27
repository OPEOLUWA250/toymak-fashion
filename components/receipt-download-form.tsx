import { Download } from "lucide-react";

/**
 * Plain form POST so the browser handles the PDF download natively and the
 * email stays out of the URL.
 */
export function ReceiptDownloadForm({
  orderId,
  email,
  orderNumber,
  className,
  iconSize,
}: {
  orderId: string;
  email: string;
  orderNumber: string;
  className: string;
  iconSize: number;
}) {
  return (
    <form method="post" action={`/api/orders/${encodeURIComponent(orderId)}/receipt`}>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <button type="submit" className={className}>
        <Download size={iconSize} />
        Download Receipt
      </button>
    </form>
  );
}
