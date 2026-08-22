"use client";

import { useCallback, useEffect, useState } from "react";
import { ContactMessage } from "./types";

function reviveDates(messages: ContactMessage[]): ContactMessage[] {
  return messages.map((message) => ({ ...message, created_at: new Date(message.created_at) }));
}

/**
 * Reads contact-form submissions from the server (GET /api/contact) — there's
 * no localStorage layer here, since the customer who submits the form and
 * the admin reading it are never the same browser.
 */
export function useContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    setIsLoading(true);
    return fetch("/api/contact")
      .then((response) => response.json())
      .then((data: { messages: ContactMessage[] }) => {
        setMessages(reviveDates(data.messages ?? []));
      })
      .catch(() => {
        // best-effort — leave whatever was already loaded in place
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markAsRead = useCallback((id: string) => {
    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, status: "read" } : message)),
    );
    fetch(`/api/contact/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "read" }),
    }).catch(() => {
      // if this fails, the next refresh() will resync the true status
    });
  }, []);

  // Called when a "contact-message" event arrives over the admin SSE
  // stream — dedupes by id in case the initial fetch() already picked it up.
  const receiveMessage = useCallback((message: ContactMessage) => {
    setMessages((current) =>
      current.some((m) => m.id === message.id) ? current : [message, ...current],
    );
  }, []);

  return { messages, isLoading, refresh, markAsRead, receiveMessage };
}
