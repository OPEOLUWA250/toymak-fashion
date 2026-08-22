import Header from "@/components/header";
import Footer from "@/components/footer";
import Link from "next/link";

const LAST_UPDATED = "22 August 2026";

export const metadata = {
  title: "Privacy Policy — Toymak",
  description: "How Toymak collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <main className="bg-white">
      <Header />

      <section className="bg-tertiary/50 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-neutral md:text-5xl">Privacy Policy</h1>
          <p className="mx-auto mt-4 max-w-lg text-neutral/60">
            Last updated: {LAST_UPDATED}
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            Toymak Enterprise (&quot;Toymak&quot;, &quot;we&quot;, &quot;us&quot;, or
            &quot;our&quot;) respects your privacy and is committed to protecting your
            personal data. This policy explains what information we collect when you visit
            toymak.com or place an order, why we collect it, who we share it with, and the
            choices and rights you have over it.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">1. Who We Are</h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            Toymak Enterprise, 26 The Close Harbone, Birmingham, B17 8TU, United Kingdom, is
            the data controller responsible for your personal information. If you have any
            questions about this policy or how we handle your data, contact us at{" "}
            <a href="mailto:hello@toymak.com" className="text-primary hover:underline">
              hello@toymak.com
            </a>
            .
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">
            2. Information We Collect
          </h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            We only collect what we need to run the store, fulfil your orders, and (with your
            permission) keep you posted about new products.
          </p>
          <h3 className="mb-2 mt-6 text-lg font-semibold text-neutral">
            Information you give us
          </h3>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-neutral/70 sm:text-base">
            <li>
              <span className="font-medium text-neutral">At checkout:</span> your name,
              email address, phone number, and shipping address, so we can process and
              deliver your order.
            </li>
            <li>
              <span className="font-medium text-neutral">On your account page:</span> if you
              choose to save your details for faster checkout next time — this is stored only
              in your own browser on your own device, not on our servers.
            </li>
            <li>
              <span className="font-medium text-neutral">First-order discount signup:</span>{" "}
              your first name, last name, and email address, so we can send you your discount
              code and, if you&apos;d like, news about new drops and promotions.
            </li>
            <li>
              <span className="font-medium text-neutral">When you contact us:</span> whatever
              information you include in your message, so we can help you.
            </li>
          </ul>
          <h3 className="mb-2 mt-6 text-lg font-semibold text-neutral">
            Information collected automatically
          </h3>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            Like most websites, we automatically collect some technical information when you
            browse toymak.com — your IP address, browser and device type, pages viewed, and
            how you arrived at the site — through privacy-conscious analytics. This helps us
            understand how the store is used and fix problems.
          </p>
          <h3 className="mb-2 mt-6 text-lg font-semibold text-neutral">Payment information</h3>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            We never see or store your full card details. Payments are handled directly by
            our payment processors, Stripe and Paystack, who are independently certified to
            the highest level of card industry security (PCI-DSS). We only receive
            confirmation that a payment succeeded, along with a transaction reference.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">
            3. How We Use Your Information
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-neutral/70 sm:text-base">
            <li>To process, fulfil, and deliver your order, and to let you track it.</li>
            <li>To respond to questions, requests, and support enquiries.</li>
            <li>
              To send you a discount code you&apos;ve requested, and — only with your consent
              — occasional emails about new products, restocks, and promotions. You can
              unsubscribe at any time.
            </li>
            <li>To keep the store secure and prevent fraud or abuse.</li>
            <li>
              To understand how customers use the site, so we can improve it (using
              aggregated, non-identifying analytics wherever possible).
            </li>
            <li>To comply with our legal and tax obligations.</li>
          </ul>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">
            4. Legal Basis for Processing
          </h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            Under UK GDPR, we rely on the following legal bases: performance of a contract
            (fulfilling an order you&apos;ve placed), consent (marketing emails and the
            discount-code signup), and legitimate interests (keeping the site secure and
            understanding how it&apos;s used). Where we rely on consent, you may withdraw it
            at any time.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">5. Cookies</h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            We use a small number of cookies and similar technologies — to remember what
            you&apos;ve added to your cart or wishlist, to keep you signed out of the popup
            once you&apos;ve seen it, and to understand site traffic through analytics. None
            of these are used to build advertising profiles about you. You can control or
            delete cookies through your browser settings at any time; doing so may affect
            how some features of the site work.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">
            6. Who We Share Your Information With
          </h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            We don&apos;t sell your personal information. We share it only with the trusted
            service providers who help us run the store, each bound to only use it for the
            purpose we provide it:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-neutral/70 sm:text-base">
            <li>
              <span className="font-medium text-neutral">Stripe and Paystack</span> — to
              process payments securely.
            </li>
            <li>
              <span className="font-medium text-neutral">Resend</span> — to deliver
              transactional emails, such as your discount code.
            </li>
            <li>
              <span className="font-medium text-neutral">
                Our hosting and analytics providers
              </span>{" "}
              — to keep the site running and help us understand how it&apos;s used.
            </li>
            <li>
              <span className="font-medium text-neutral">Delivery couriers</span> — your name
              and shipping address only, to get your order to you.
            </li>
          </ul>
          <p className="mt-4 text-sm leading-7 text-neutral/70 sm:text-base">
            We may also disclose information where required by law, or to protect the
            rights, property, or safety of Toymak, our customers, or others.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">
            7. International Transfers
          </h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            Because we support both UK/international and Nigerian customers, some of your
            information may be processed by our payment and service providers outside the
            UK. Where this happens, we rely on providers who maintain appropriate safeguards,
            such as standard contractual clauses, to protect your information to UK GDPR
            standards.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">8. Data Retention</h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            We keep order information for as long as necessary to fulfil the order, handle
            any returns or disputes, and meet our tax and accounting obligations. If you
            asked us for a discount code, we keep your signup details until you ask us to
            delete them or unsubscribe. Details saved on your own device (via the account
            page) stay there until you clear them yourself, and are never sent to us unless
            you use them to place an order.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">9. Your Rights</h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            Under UK GDPR, you have the right to: access the personal data we hold about
            you; ask us to correct inaccurate data; ask us to delete your data; restrict or
            object to certain processing; receive your data in a portable format; and
            withdraw consent at any time where we rely on it. To exercise any of these
            rights, email{" "}
            <a href="mailto:hello@toymak.com" className="text-primary hover:underline">
              hello@toymak.com
            </a>
            . You also have the right to lodge a complaint with the UK Information
            Commissioner&apos;s Office (ICO) at{" "}
            <span className="text-neutral">ico.org.uk</span> if you believe we haven&apos;t
            handled your data properly.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">10. Children&apos;s Privacy</h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            Toymak is not directed at children, and we do not knowingly collect personal
            information from anyone under 16. If you believe a child has provided us with
            personal information, please contact us and we&apos;ll delete it.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">11. Security</h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            We use reasonable technical and organisational measures to protect your
            information, including encrypted connections (HTTPS) and access controls. No
            method of transmission or storage is 100% secure, but we work to keep your data
            protected at every step.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">
            12. Changes to This Policy
          </h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            We may update this policy from time to time as our store evolves. If we make
            material changes, we&apos;ll update the &quot;Last updated&quot; date at the top
            of this page. We encourage you to review this policy periodically.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">13. Contact Us</h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            If you have any questions about this Privacy Policy or how we handle your data,
            reach out to us at{" "}
            <a href="mailto:hello@toymak.com" className="text-primary hover:underline">
              hello@toymak.com
            </a>{" "}
            or by post at 26 The Close Harbone, Birmingham, B17 8TU, United Kingdom. See
            also our{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
