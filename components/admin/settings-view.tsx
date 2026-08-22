import { CreditCard, Globe, Info, Truck, WalletCards } from "lucide-react";

export function SettingsView() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
        <Info size={18} className="mt-0.5 shrink-0 text-blue-600" />
        <p className="text-sm leading-6">
          These reflect the rules currently built into checkout — this is a read-only summary, not a live
          editor. Changing gateway routing, thresholds, or tax rates requires a code change in{" "}
          <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">app/checkout</code>.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard size={18} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Payment Gateway Routing</h2>
              <p className="text-sm text-neutral-500">Chosen automatically by shipping country</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                <WalletCards size={15} />
                Nigeria
              </span>
              <span className="bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                Paystack · NGN
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                <Globe size={15} />
                Everywhere else (default)
              </span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                Stripe · GBP
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Truck size={18} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Shipping</h2>
              <p className="text-sm text-neutral-500">Free-shipping thresholds by currency</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-neutral-100 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-neutral-700">GBP</span>
                <span className="text-neutral-500">Free over £50 · else £7.99</span>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-100 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-neutral-700">NGN</span>
                <span className="text-neutral-500">Free over ₦50,000 · else ₦7,999</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6 lg:col-span-2">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Globe size={18} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Tax</h2>
              <p className="text-sm text-neutral-500">Applied to order subtotal at checkout</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-100 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-neutral-700">United Kingdom (VAT)</span>
                <span className="text-neutral-500">20%</span>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-100 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-neutral-700">Nigeria (VAT)</span>
                <span className="text-neutral-500">7.5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
