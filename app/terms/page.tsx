import Header from "@/components/header";
import Footer from "@/components/footer";
import Link from "next/link";

const LAST_UPDATED = "22 August 2026";

export const metadata = {
  title: "Terms of Service — Toymak",
  description: "The terms and conditions that apply when you shop with Toymak.",
};

export default function TermsPage() {
  return (
    <main className="bg-white">
      <Header />

      <section className="bg-tertiary/50 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-neutral md:text-5xl">Terms of Service</h1>
          <p className="mx-auto mt-4 max-w-lg text-neutral/60">
            Last updated: {LAST_UPDATED}
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            These Terms of Service (&quot;Terms&quot;) govern your use of toymak.com and any
            purchase you make from Toymak Enterprise (&quot;Toymak&quot;, &quot;we&quot;,
            &quot;us&quot;, or &quot;our&quot;). By browsing our site or placing an order, you
            agree to these Terms. Please read them carefully.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">1. About Toymak</h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            Toymak Enterprise is registered at 26 The Close Harbone, Birmingham, B17 8TU,
            United Kingdom. We design and sell premium shapewear, waist trainers, bras, tops,
            and accessories.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">2. Eligibility</h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            You must be at least 18 years old, or have the permission of a parent or
            guardian, to place an order with us. By placing an order, you confirm that the
            information you provide is accurate and that you&apos;re authorised to use the
            payment method provided.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">
            3. Guest Checkout &amp; Your Account
          </h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            Toymak doesn&apos;t require you to create a password-protected account. You check
            out as a guest, and can track any order afterwards using the email address you
            checked out with. Any shipping details you choose to save for faster checkout are
            stored locally on your own device and are your responsibility to keep accurate
            and up to date.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">
            4. Products, Pricing &amp; Availability
          </h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            We try to describe and price our products as accurately as possible, and colours
            may vary slightly depending on your screen. Prices are displayed in Pounds
            Sterling (£) or Nigerian Naira (₦) depending on your checkout region, and may
            change at any time without notice — the price you pay is the price shown at the
            time you complete checkout. Products are subject to availability; if an item you
            ordered turns out to be out of stock, we&apos;ll contact you to offer a refund or
            an alternative.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">
            5. Orders &amp; Payment
          </h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            When you place an order, we&apos;ll take you to our payment partner — Stripe for
            UK and international orders, or Paystack for orders shipping within Nigeria — to
            complete payment securely. An order is only confirmed once payment has been
            successfully processed; you&apos;ll see a confirmation on screen and be given an
            order and tracking ID. We reserve the right to refuse or cancel any order,
            including in cases of suspected fraud, pricing errors, or stock issues, in which
            case you&apos;ll be refunded in full.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">
            6. Promotions &amp; Discount Codes
          </h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            From time to time we offer discount codes, such as the first-order code available
            through our homepage signup. Unless stated otherwise, discount codes are limited
            to one use per customer, cannot be combined with other offers, have no cash
            value, and may be withdrawn or amended at any time. We may decline to honour a
            code we reasonably believe has been obtained or used fraudulently.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">
            7. Shipping &amp; Delivery
          </h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            We aim to dispatch orders promptly and will provide a tracking link from our
            courier as soon as your order ships, viewable any time on your account page.
            Delivery times are estimates, not guarantees, and Toymak isn&apos;t responsible
            for delays caused by the courier or events outside our reasonable control.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">
            8. Returns, Exchanges &amp; Refunds
          </h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            Full details of what&apos;s eligible for return or exchange, and how the process
            works, are set out on our{" "}
            <Link href="/returns" className="text-primary hover:underline">
              Returns &amp; Exchanges
            </Link>{" "}
            page, which forms part of these Terms.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">
            9. Intellectual Property
          </h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            Everything on toymak.com — including our name, logo, product photography, and
            site content — belongs to Toymak or our licensors and is protected by
            intellectual property law. You may not copy, reproduce, or use any of it
            commercially without our written permission.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">10. Acceptable Use</h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            You agree not to misuse the site — including attempting to gain unauthorised
            access to any part of it, interfering with its operation, or using it for any
            unlawful or fraudulent purpose (including abusing discount codes or the returns
            process).
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">
            11. Third-Party Services
          </h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            Our checkout, payments, and email delivery are handled by trusted third-party
            providers (Stripe, Paystack, and Resend). Your use of those services as part of
            your order is also subject to their own terms and privacy policies.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">
            12. Disclaimer &amp; Limitation of Liability
          </h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            We provide our site and products &quot;as is&quot; and do not guarantee that the
            site will always be available, uninterrupted, or error-free. To the fullest
            extent permitted by law, Toymak is not liable for any indirect or consequential
            loss arising from your use of the site or your order. Nothing in these Terms
            limits or excludes our liability for anything that cannot legally be limited or
            excluded, including negligence causing personal injury or death, or fraud.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">
            13. Governing Law
          </h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            These Terms are governed by the laws of England and Wales. Any dispute arising
            from these Terms or your use of toymak.com will be subject to the exclusive
            jurisdiction of the courts of England and Wales. If you&apos;re a consumer
            resident elsewhere, you may also have the right to rely on mandatory consumer
            protection laws in your own country of residence.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">
            14. Changes to These Terms
          </h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            We may update these Terms from time to time to reflect changes to our business or
            the law. If we make material changes, we&apos;ll update the &quot;Last
            updated&quot; date at the top of this page. Continuing to use the site after any
            changes means you accept the updated Terms.
          </p>

          <h2 className="mb-4 mt-12 text-2xl font-bold text-neutral">15. Contact Us</h2>
          <p className="text-sm leading-7 text-neutral/70 sm:text-base">
            Questions about these Terms? Reach us at{" "}
            <a href="mailto:hello@toymak.com" className="text-primary hover:underline">
              hello@toymak.com
            </a>{" "}
            or by post at 26 The Close Harbone, Birmingham, B17 8TU, United Kingdom. See also
            our{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
