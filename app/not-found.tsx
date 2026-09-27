import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";

export default function NotFound() {
  return (
    <main className="bg-white">
      <Header />
      <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-5 py-20 text-center">
        <p className="text-sm font-semibold tracking-[0.3em] text-primary">404</p>
        <h1 className="mt-4 text-3xl font-bold text-neutral sm:text-5xl">This page couldn&apos;t be found</h1>
        <p className="mt-5 max-w-md text-neutral/60">The link may have changed, or this page or product is no longer available.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="bg-primary px-6 py-3 font-medium text-white">Explore the shop</Link>
          <Link href="/" className="border border-neutral/20 px-6 py-3 font-medium text-neutral">Back to home</Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
