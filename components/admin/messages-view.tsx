"use client";

import { useState } from "react";
import { Mail, MailOpen, MessageSquare, Phone, RefreshCw } from "lucide-react";
import { ContactMessage } from "@/lib/types";

export function MessagesView({
  messages,
  isLoading,
  onRefresh,
  onMarkAsRead,
}: {
  messages: ContactMessage[];
  isLoading: boolean;
  onRefresh: () => void;
  onMarkAsRead: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const unreadCount = messages.filter((m) => m.status === "new").length;

  const handleExpand = (message: ContactMessage) => {
    const opening = expandedId !== message.id;
    setExpandedId(opening ? message.id : null);
    if (opening && message.status === "new") {
      onMarkAsRead(message.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                Contact messages
              </p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">
                {messages.length}
                {unreadCount > 0 && (
                  <span className="ml-2 text-sm font-medium text-primary">
                    {unreadCount} unread
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-600 transition hover:border-primary hover:text-primary disabled:opacity-50"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-neutral-900">Messages</h2>
          <p className="text-sm text-neutral-500">
            Everyone who&apos;s messaged you through the homepage contact form.
          </p>
        </div>

        {messages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-sm text-neutral-500">
            {isLoading
              ? "Loading messages…"
              : "No messages yet — they'll appear here as soon as someone writes in from the homepage."}
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const expanded = expandedId === message.id;
              return (
                <div
                  key={message.id}
                  className="overflow-hidden rounded-2xl border border-neutral-200"
                >
                  <button
                    type="button"
                    onClick={() => handleExpand(message)}
                    className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-neutral-50 sm:items-center"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full sm:mt-0 ${
                        message.status === "new" ? "bg-primary" : "bg-neutral-200"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <p className="text-sm font-semibold text-neutral-900">{message.name}</p>
                        <span className="text-xs text-neutral-400">{message.email}</span>
                      </div>
                      <p className="truncate text-sm text-neutral-600">{message.subject}</p>
                    </div>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {message.created_at.toLocaleDateString("en-GB", {
                        dateStyle: "medium",
                      })}
                    </span>
                  </button>

                  {expanded && (
                    <div className="space-y-4 border-t border-neutral-100 bg-neutral-50 px-4 py-4">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                        {message.message}
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <a
                          href={`mailto:${message.email}?subject=${encodeURIComponent(
                            `Re: ${message.subject}`,
                          )}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90"
                        >
                          <Mail size={13} />
                          Reply by email
                        </a>
                        {message.phone && (
                          <a
                            href={`tel:${message.phone}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-600 transition hover:border-primary hover:text-primary"
                          >
                            <Phone size={13} />
                            {message.phone}
                          </a>
                        )}
                        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
                          <MailOpen size={13} />
                          {message.status === "new" ? "Marked read on open" : "Read"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
