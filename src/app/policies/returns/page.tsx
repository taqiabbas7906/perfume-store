import Link from "next/link"

export default function ReturnsPage() {

  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <section className="relative pt-32 pb-16 bg-[#fdf4e8]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="tracking-[0.35em] uppercase text-[10px] text-[#b89a6a] font-semibold mb-4">
              Customer Care
            </p>
            <h1 className="text-3xl md:text-5xl tracking-tight mb-4 text-[#1a1a1a] font-heading">
              Returns &amp; Refund Policy
            </h1>
            <p className="text-xs text-gray-500 max-w-xl mx-auto leading-relaxed">
              We want you to love every fragrance you purchase from Minzoshop. If something isn&apos;t right, we&apos;re here to make it right.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="space-y-14">
            {/* Overview */}
            <article>
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 tracking-tight">
                Return Eligibility
              </h2>
              <div className="text-sm text-gray-600 leading-relaxed space-y-3">
                <p>
                  For hygiene and safety reasons, <strong>opened or used fragrance products cannot be returned or exchanged</strong>.
                  This policy protects all of our customers and ensures every bottle you receive is brand new and untouched.
                </p>
                <p>You may return an item if:</p>
                <ul className="list-disc pl-6 space-y-1.5">
                  <li>The item is <strong>unopened</strong> and in its original sealed packaging</li>
                  <li>The item is <strong>damaged or defective</strong> upon arrival</li>
                  <li>You received the <strong>wrong item</strong></li>
                  <li>The return request is submitted within <strong>7 days</strong> of delivery</li>
                </ul>
              </div>
            </article>

            {/* Process */}
            <article>
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 tracking-tight">
                How to Return an Item
              </h2>
              <div className="text-sm text-gray-600 leading-relaxed space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 flex items-center justify-center border border-[#b89a6a] rounded-full flex-shrink-0 text-[#b89a6a] font-bold text-sm bg-[#fdf4e8]">1</div>
                  <div>
                    <p className="font-semibold text-[#1a1a1a] mb-1">Contact Us</p>
                    <p>Email <a href="mailto:support@Minzoshop.com" className="text-[#b89a6a] hover:underline cursor-pointer">support@Minzoshop.com</a> with your order number and reason for return. For damaged items, please include clear photographs of the product and packaging.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 flex items-center justify-center border border-[#b89a6a] rounded-full flex-shrink-0 text-[#b89a6a] font-bold text-sm bg-[#fdf4e8]">2</div>
                  <div>
                    <p className="font-semibold text-[#1a1a1a] mb-1">Approval &amp; Instructions</p>
                    <p>Once approved, we will provide return shipping instructions and a prepaid return label (for defective or incorrect items).</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 flex items-center justify-center border border-[#b89a6a] rounded-full flex-shrink-0 text-[#b89a6a] font-bold text-sm bg-[#fdf4e8]">3</div>
                  <div>
                    <p className="font-semibold text-[#1a1a1a] mb-1">Ship It Back</p>
                    <p>Pack the item securely in its original packaging. Drop it off at the designated carrier location within 5 business days of receiving your return label.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 flex items-center justify-center border border-[#b89a6a] rounded-full flex-shrink-0 text-[#b89a6a] font-bold text-sm bg-[#fdf4e8]">4</div>
                  <div>
                    <p className="font-semibold text-[#1a1a1a] mb-1">Refund Issued</p>
                    <p>Once we receive and inspect the returned item, your refund will be processed to the original payment method within 3&ndash;5 business days.</p>
                  </div>
                </div>
              </div>
            </article>

            {/* Refunds */}
            <article>
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 tracking-tight">
                Refunds
              </h2>
              <div className="text-sm text-gray-600 leading-relaxed space-y-3">
                <p>Refunds are issued to the original payment method used at checkout. Here&apos;s what to expect:</p>
                <ul className="list-disc pl-6 space-y-1.5">
                  <li><strong>Full refund:</strong> For damaged, defective, or incorrect items</li>
                  <li><strong>Refund minus return shipping:</strong> For unopened items returned for personal reasons (buyer is responsible for return shipping cost in this case)</li>
                  <li><strong>Non-refundable:</strong> Opened or used fragrance products, items returned after the 7-day window, gift cards, and final sale items</li>
                </ul>
                <p className="mt-3 text-xs text-gray-400">
                  Original shipping charges are non-refundable unless the return is due to our error.
                </p>
              </div>
            </article>

            {/* Non-Returnable */}
            <article>
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 tracking-tight">
                Non-Returnable Items
              </h2>
              <div className="text-sm text-gray-600 leading-relaxed space-y-3">
                <p>The following items cannot be returned:</p>
                <ul className="list-disc pl-6 space-y-1.5">
                  <li>Opened or used fragrances (any bottle with a broken seal)</li>
                  <li>Gift cards and e-gift certificates</li>
                  <li>Final sale and clearance items</li>
                  <li>Sample vials and discovery sets (if opened)</li>
                  <li>Items marked &ldquo;Final Sale&rdquo; at the time of purchase</li>
                </ul>
              </div>
            </article>

            {/* Cross-link */}
            <article className="bg-[#fdf4e8] border border-[#e8d5b7] p-6">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="ri-information-line text-[#b89a6a] text-base"></i>
                </div>
                <div>
                  <p className="font-semibold text-[#1a1a1a] text-sm mb-1">Need to cancel instead?</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    If your order hasn&apos;t shipped yet, you may be able to cancel it. Check our{" "}
                    <Link href="/cancellation" className="text-[#b89a6a] hover:underline cursor-pointer font-medium">Cancellation Policy</Link>{" "}
                    for details.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}