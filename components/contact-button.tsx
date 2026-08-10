import { Mail } from "lucide-react";

export function ContactButton() {
  return (
    <a
      href="mailto:hello@toymak.com"
      aria-label="Email us"
      className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:bg-primary/90 hover:scale-105"
    >
      <Mail size={22} />
    </a>
  );
}
