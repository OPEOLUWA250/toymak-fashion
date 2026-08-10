"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut } from "lucide-react";

export function AdminProfileMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-xl border-l border-neutral-200 py-1 pl-3 transition hover:bg-neutral-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          TT
        </span>
        <span className="hidden text-sm font-medium text-neutral-800 sm:inline">Toymak Team</span>
        <ChevronDown
          size={14}
          className={`hidden text-neutral-400 transition sm:inline-block ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl"
        >
          <div className="flex items-center gap-3 rounded-xl px-3 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              TT
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-900">Toymak Team</p>
              <p className="truncate text-xs text-neutral-500">admin@toymak.com</p>
            </div>
          </div>
          <div className="my-1 border-t border-neutral-100" />
          <Link
            href="/"
            role="menuitem"
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            <LogOut size={15} />
            Log out
          </Link>
        </div>
      )}
    </div>
  );
}
