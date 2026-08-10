import { Info, ShieldCheck } from "lucide-react";

interface AdminAccount {
  name: string;
  email: string;
  role: string;
}

const adminAccounts: AdminAccount[] = [
  { name: "Toymak Team", email: "admin@toymak.com", role: "Owner" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AdminManagementView() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
        <Info size={18} className="mt-0.5 shrink-0 text-blue-600" />
        <p className="text-sm leading-6">
          This is a placeholder for admin access management. Inviting teammates and setting
          permissions needs a real authentication backend, which this mock storefront doesn&apos;t
          have yet.
        </p>
      </div>

      <div className="rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)] lg:p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-neutral-900">Admin Accounts</h2>
          <p className="text-sm text-neutral-500">Who currently has access to this dashboard</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200">
          <div className="hidden grid-cols-[1.4fr_1.4fr_0.8fr] gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500 sm:grid">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
          </div>
          <div className="divide-y divide-neutral-200 bg-white">
            {adminAccounts.map((admin) => (
              <div
                key={admin.email}
                className="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-[1.4fr_1.4fr_0.8fr] sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {getInitials(admin.name)}
                  </span>
                  <p className="text-sm font-medium text-neutral-900">{admin.name}</p>
                </div>
                <p className="text-sm text-neutral-600">{admin.email}</p>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  <ShieldCheck size={12} />
                  {admin.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
