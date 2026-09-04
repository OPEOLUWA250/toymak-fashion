import { OrderStatus } from "@/lib/types";

export const statusStyles: Record<OrderStatus, string> = {
  unshipped: "bg-neutral-200 text-neutral-700",
  shipped: "bg-emerald-100 text-emerald-700",
};

export function StatCard({
  title,
  value,
  subLabel,
  icon: Icon,
}: {
  title: string;
  value: string | string[];
  subLabel: string;
  icon: React.ComponentType<{ size?: number }>;
}) {
  const lines = Array.isArray(value) ? value : [value];

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <Icon size={18} />
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600">
          {subLabel}
        </span>
      </div>
      <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
        {title}
      </p>
      <div className="mt-2">
        <p className="text-2xl font-semibold text-neutral-900">{lines[0]}</p>
        {lines.slice(1).map((line) => (
          <p key={line} className="mt-0.5 text-sm font-medium text-neutral-500">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex w-fit items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyles[status]}`}
    >
      {status.replace(/-/g, " ")}
    </span>
  );
}
