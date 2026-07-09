'client'

interface PolicySection {
  id: string;
  title: string;
  content: string | React.ReactNode;
}

const sections: PolicySection[] = [
  {
    id: "collection",
    title: "1. Information We Collect",
    content: (
      <>
        <p className="mb-3">We may collect the following types of information:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Full name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>Billing and shipping addresses</li>
          <li>Payment information (processed securely through our payment providers; we do <strong>not</strong> store your complete payment card information)</li>
          <li>Order history</li>
          <li>IP address, browser type, and device information</li>
          <li>Cookies and similar tracking technologies</li>
        </ul>
      </>
    ),
  },
  {
    id: "usage",
    title: "2. How We Use Your Information",
    content: (
      <>
        <p className="mb-3">We use your information to:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Process and fulfill your orders</li>
          <li>Provide customer support</li>
          <li>Send order confirmations and shipping updates</li>
          <li>Improve our website, products, and services</li>
          <li>Prevent fraud and unauthorized transactions</li>
          <li>Comply with legal obligations</li>
          <li>Send promotional emails and special offers if you choose to receive them</li>
        </ul>
      </>
    ),
  },
  {
    id: "sharing",
    title: "3. Sharing Your Information",
    content: (
      <>
        <p className="mb-3">
          We <strong>do not sell</strong> your personal information.
        </p>
        <p className="mb-3">We may share your information with trusted third parties, including:</p>
        <ul className="list-disc pl-6 space-y-1.5 mb-3">
          <li>Payment processors</li>
          <li>Shipping and delivery providers</li>
          <li>Website hosting providers</li>
          <li>Analytics providers</li>
          <li>Marketing service providers</li>
          <li>Government authorities when required by law</li>
        </ul>
        <p>These third parties are only given the information necessary to perform their services.</p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "4. Cookies",
    content: (
      <p>
        Our website uses cookies and similar technologies to improve your browsing experience, remember your preferences,
        analyze website traffic, and enhance our services. You can control or disable cookies through your browser settings.
        Some website features may not function properly if cookies are disabled.
      </p>
    ),
  },
  {
    id: "security",
    title: "5. Data Security",
    content: (
      <p>
        We implement reasonable administrative, technical, and physical safeguards to protect your personal information.
        However, no method of transmitting data over the internet or storing electronic data is completely secure.
      </p>
    ),
  },
  {
    id: "rights",
    title: "6. Your Rights",
    content: (
      <>
        <p className="mb-3">Depending on your location, you may have the right to:</p>
        <ul className="list-disc pl-6 space-y-1.5 mb-3">
          <li>Access your personal information</li>
          <li>Correct inaccurate information</li>
          <li>Request deletion of your information</li>
          <li>Object to or restrict certain processing</li>
          <li>Withdraw consent for marketing communications at any time</li>
        </ul>
        <p>To exercise these rights, please contact us.</p>
      </>
    ),
  },
  {
    id: "third-party",
    title: "7. Third-Party Links",
    content: (
      <p>
        Our website may contain links to third-party websites. We are not responsible for the privacy practices or content
        of those websites.
      </p>
    ),
  },
  {
    id: "children",
    title: "8. Children&rsquo;s Privacy",
    content: (
      <p>
        Inscentives does not knowingly collect personal information from children under the age of 13. If we become aware
        that we have collected such information, we will promptly delete it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "9. Changes to This Privacy Policy",
    content: (
      <p>
        We may update this Privacy Policy from time to time. Any changes will be posted on this page along with the
        updated effective date.
      </p>
    ),
  },
  {
    id: "contact",
    title: "10. Contact Us",
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

export default function PrivacyPage() {

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
              Privacy Policy
            </h1>
            <p className="text-sm text-[var(--color-gold-deep)] tracking-wide">
              Effective Date: January 1, 2026
            </p>
            <p className="text-xs text-gray-500 mt-2 max-w-xl mx-auto leading-relaxed">
              Welcome to Inscentives. We value your privacy and are committed to protecting your personal information.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit
              our website or make a purchase.
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