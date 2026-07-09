

interface PolicySection {
  id: string;
  title: string;
  content: React.ReactNode;
}

const sections: PolicySection[] = [
  {
    id: "about",
    title: "1. About Inscentives",
    content: (
      <p>
        Inscentives is an online retailer offering perfumes and fragrance-related products.
      </p>
    ),
  },
  {
    id: "eligibility",
    title: "2. Eligibility",
    content: (
      <p>
        By using our website, you confirm that you are at least 18 years old or are using the website under the
        supervision of a parent or legal guardian.
      </p>
    ),
  },
  {
    id: "orders",
    title: "3. Orders",
    content: (
      <>
        <p className="mb-3">All orders are subject to acceptance and product availability.</p>
        <p className="mb-3">We reserve the right to:</p>
        <ul className="list-disc pl-6 space-y-1.5 mb-3">
          <li>Refuse or cancel any order.</li>
          <li>Limit quantities purchased.</li>
          <li>Correct pricing, product descriptions, or typographical errors at any time.</li>
        </ul>
        <p>If your order is canceled after payment has been made, you will receive a full refund.</p>
      </>
    ),
  },
  {
    id: "pricing",
    title: "4. Pricing and Payment",
    content: (
      <>
        <p className="mb-3">All prices are listed in U.S. Dollars (USD) unless otherwise stated.</p>
        <p>Payment must be received before an order is processed and shipped. We accept approved payment methods displayed during checkout.</p>
      </>
    ),
  },
  {
    id: "shipping",
    title: "5. Shipping",
    content: (
      <>
        <p className="mb-3">Shipping times are estimates and may vary depending on your location and carrier delays.</p>
        <p className="mb-3">Once an order has been shipped, Inscentives is not responsible for delays caused by shipping carriers, weather conditions, or other circumstances beyond our control.</p>
        <p>Customers are responsible for providing accurate shipping information.</p>
      </>
    ),
  },
  {
    id: "returns",
    title: "6. Returns and Refunds",
    content: (
      <>
        <p className="mb-3">For hygiene and safety reasons, perfumes and fragrance products <strong>cannot be returned or exchanged</strong> if they have been opened or used.</p>
        <p className="mb-3">If you receive a damaged, defective, or incorrect item, please contact us within <strong>7 days of delivery</strong>. We may request photographs of the item and packaging before approving a replacement or refund.</p>
        <p>Approved refunds will be issued to the original payment method.</p>
      </>
    ),
  },
  {
    id: "product-info",
    title: "7. Product Information",
    content: (
      <>
        <p className="mb-3">We strive to ensure that product descriptions, images, and pricing are accurate. However, slight variations in packaging, bottle design, or color may occur due to manufacturer updates.</p>
        <p>Inscentives does not guarantee that every product description is completely free from errors.</p>
      </>
    ),
  },
  {
    id: "intellectual",
    title: "8. Intellectual Property",
    content: (
      <p>
        All content on this website, including text, images, logos, graphics, product descriptions, and designs, is the
        property of Inscentives or its licensors and may not be copied, reproduced, or distributed without prior written
        permission.
      </p>
    ),
  },
  {
    id: "prohibited",
    title: "9. Prohibited Use",
    content: (
      <>
        <p className="mb-3">You agree not to:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Use the website for any unlawful purpose.</li>
          <li>Attempt to gain unauthorized access to our systems.</li>
          <li>Interfere with the operation or security of the website.</li>
          <li>Upload malicious software or harmful code.</li>
        </ul>
      </>
    ),
  },
  {
    id: "liability",
    title: "10. Limitation of Liability",
    content: (
      <>
        <p className="mb-3">
          To the fullest extent permitted by law, Inscentives shall not be liable for any indirect, incidental, special,
          or consequential damages arising from the use of our website or products.
        </p>
        <p>Our total liability shall not exceed the amount paid for the product giving rise to the claim.</p>
      </>
    ),
  },
  {
    id: "disclaimer",
    title: "11. Disclaimer",
    content: (
      <>
        <p className="mb-3">All products are sold &ldquo;as is&rdquo; and &ldquo;as available.&rdquo;</p>
        <p>Customers are responsible for reviewing product ingredients and avoiding fragrances that may cause allergic reactions or sensitivities. Inscentives is not responsible for adverse reactions resulting from the use of our products.</p>
      </>
    ),
  },
  {
    id: "privacy-link",
    title: "12. Privacy",
    content: (
      <p>
        Your use of our website is also governed by our{" "}
        <a href="/policies/privacy" className="text-[var(--color-gold)] hover:underline transition-colors cursor-pointer font-medium">
          Privacy Policy
        </a>.
      </p>
    ),
  },
  {
    id: "changes",
    title: "13. Changes to These Terms",
    content: (
      <p>
        We reserve the right to update or modify these Terms &amp; Conditions at any time. Changes become effective
        immediately upon posting on this website.
      </p>
    ),
  },
  {
    id: "governing",
    title: "14. Governing Law",
    content: (
      <p>
        These Terms &amp; Conditions shall be governed by and interpreted in accordance with the laws of the State of
        New Jersey, United States, without regard to conflict of law principles.
      </p>
    ),
  },
  {
    id: "contact",
    title: "15. Contact Us",
    content: (
      <div className="space-y-3">
        <p className="font-semibold">Inscentives Perfume</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <i className="ri-mail-line text-[var(--color-gold)] text-sm"></i>
            </div>
            <a href="mailto:support@inscentives.com" className="hover:text-[var(--color-gold)] transition-colors cursor-pointer">
              support@inscentives.com
            </a>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
              <i className="ri-map-pin-2-line text-[var(--color-gold)] text-sm"></i>
            </div>
            <span>West Palm Beach, Florida, USA</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <i className="ri-phone-line text-[var(--color-gold)] text-sm"></i>
            </div>
            <span>+1 (561) 555-0194</span>
          </div>
        </div>
      </div>
    ),
  },
];

export default function TermsPage() {

  return (
    <div className="min-h-screen bg-white">

      {/* Hero Header */}
      <section className="relative pt-32 pb-16 bg-[var(--color-cream-300)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="tracking-[0.35em] uppercase text-[10px] text-[var(--color-gold)] font-semibold mb-4">
              Last Updated
            </p>
            <h1 className="text-3xl md:text-5xl tracking-tight mb-4 text-[var(--color-ink)] font-heading">
              Terms &amp; Conditions
            </h1>
            <p className="text-sm text-[var(--color-gold-deep)] tracking-wide">
              Effective Date: January 1, 2026
            </p>
            <p className="text-xs text-gray-500 mt-2 max-w-xl mx-auto leading-relaxed">
              Welcome to Inscentives. By accessing or using our website, you agree to be bound by these Terms &amp;
              Conditions. If you do not agree with these terms, please do not use our website.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="space-y-14">
            {sections.map((section) => (
              <article key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="text-lg font-semibold text-[var(--color-ink)] mb-4 tracking-tight">
                  {section.title}
                </h2>
                <div className="text-sm text-gray-600 leading-relaxed space-y-3">
                  {section.content}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}