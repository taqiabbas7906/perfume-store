

export default function CancellationPage() {

  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <section className="relative pt-32 pb-16 bg-[#fdf4e8]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="tracking-[0.35em] uppercase text-[10px] text-[#b89a6a] font-semibold mb-4">
              Orders
            </p>
            <h1 className="text-3xl md:text-5xl tracking-tight mb-4 text-[#1a1a1a] font-heading">
              Cancellation Policy
            </h1>
            <p className="text-xs text-gray-500 max-w-xl mx-auto leading-relaxed">
              We understand plans can change. Here&apos;s everything you need to know about canceling your Minzoshop order.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="space-y-14">
            {/* How to Cancel */}
            <article>
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 tracking-tight">
                How to Cancel an Order
              </h2>
              <div className="text-sm text-gray-600 leading-relaxed space-y-3">
                <p>
                  If you need to cancel your order, please contact us as soon as possible. Orders are typically processed
                  within <strong>1&ndash;2 hours</strong> during business days. Once an order has been packed and handed
                  over to the shipping carrier, it can no longer be canceled.
                </p>
                <p>To request a cancellation:</p>
                <ul className="list-disc pl-6 space-y-1.5">
                  <li>Email us at <a href="mailto:support@minzoshop.com" className="text-[#b89a6a] hover:underline cursor-pointer">support@minzoshop.com</a> with your order number</li>
                  <li>Include &ldquo;Cancellation Request&rdquo; in your subject line for fastest processing</li>
                </ul>
              </div>
            </article>

            {/* Time Window */}
            <article>
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 tracking-tight">
                Cancellation Window
              </h2>
              <div className="text-sm text-gray-600 leading-relaxed space-y-3">
                <p>You may cancel your order under the following conditions:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {[
                    { label: "Before Processing", detail: "Full refund, no questions asked", icon: "ri-checkbox-circle-line", color: "text-emerald-600" },
                    { label: "After Processing (Pre-Shipment)", detail: "Full refund minus a $5 restocking fee", icon: "ri-error-warning-line", color: "text-amber-600" },
                    { label: "After Shipment", detail: "Cannot be canceled; see our Returns Policy", icon: "ri-close-circle-line", color: "text-rose-600" },
                                      ].map((item) => (
                    <div key={item.label} className="border border-[#e8d5b7] p-4 bg-[#fdfbf7]">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <i className={`${item.icon} ${item.color} text-base`}></i>
                        </div>
                        <div>
                          <p className="font-semibold text-[#1a1a1a] text-xs tracking-wide uppercase">{item.label}</p>
                          <p className="text-gray-500 mt-1">{item.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            {/* Refund Timeline */}
            <article>
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 tracking-tight">
                Refund Timeline
              </h2>
              <div className="text-sm text-gray-600 leading-relaxed space-y-3">
                <p>Once your cancellation is approved, refunds are processed as follows:</p>
                <ul className="list-disc pl-6 space-y-1.5">
                  <li><strong>Credit/Debit Cards:</strong> 3&ndash;5 business days</li>
                </ul>
                <p className="mt-3 text-xs text-gray-400">
                  Please note that your bank or card issuer may take additional time to post the refund to your account.
                </p>
              </div>
            </article>

            {/* Contact */}
            <article>
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 tracking-tight">
                Need Help?
              </h2>
              <div className="text-sm text-gray-600 leading-relaxed space-y-3">
                <p>If you have any questions about canceling your order, our team is here to help.</p>
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      <i className="ri-mail-line text-[#b89a6a] text-sm"></i>
                    </div>
                    <a href="mailto:support@minzoshop.com" className="hover:text-[#b89a6a] transition-colors cursor-pointer">
                      support@minzoshop.com
                    </a>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}