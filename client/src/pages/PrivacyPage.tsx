import { useRef } from 'react';
import { Shield, Lock, ChevronRight } from 'lucide-react';

interface PrivacySection {
  id: string;
  title: string;
  content: React.ReactNode;
}

export function PrivacyPage() {
  const sectionsRef = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToSection = (id: string) => {
    sectionsRef.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const privacySections: PrivacySection[] = [
    {
      id: "introduction",
      title: "1. Introduction",
      content: (
        <>
          <p>
            Velmar Technology SRL (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) respects your privacy and is committed to protecting the personal and operational data of our clients. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our MSP Client Portal.
          </p>
          <p className="mt-3">
            Please read this policy carefully. By accessing or using the portal, you consent to our practices regarding your information as described herein.
          </p>
        </>
      )
    },
    {
      id: "collection",
      title: "2. Information We Collect",
      content: (
        <>
          <p>
            To provide efficient IT management and support services, we collect information that falls into the following categories:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Account Details:</strong> Contact information, including names, business email addresses, phone numbers, and job roles.</li>
            <li><strong>System Telemetry:</strong> CPU usage, memory allocation, IP addresses, network topology, device names, and hardware specifications gathered via our local monitoring agents.</li>
            <li><strong>Support Logs:</strong> Ticket descriptions, chat transcripts, email attachments, and resolution histories containing problem assessments.</li>
            <li><strong>Billing Data:</strong> Transaction metadata, tax identifiers, billing addresses, and payment status details (we do not store raw credit card numbers directly on our servers).</li>
          </ul>
        </>
      )
    },
    {
      id: "usage",
      title: "3. How We Use Your Information",
      content: (
        <>
          <p>
            We process client data solely to fulfill our service agreements. Specifically, we use the collected information to:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Diagnose, troubleshoot, and resolve infrastructure issues logged in tickets.</li>
            <li>Trigger automatic ticket creation when monitored devices breach set capacity or health limits.</li>
            <li>Process payments and calculate applicable taxes on invoices.</li>
            <li>Send critical service notifications, such as ticket status updates (e.g., via email or WhatsApp integrations) and SLA escalation warnings.</li>
            <li>Enforce our Terms of Service and protect the security of our services.</li>
          </ul>
        </>
      )
    },
    {
      id: "security",
      title: "4. Data Storage and Protection",
      content: (
        <>
          <p>
            We deploy strict physical, technical, and administrative measures to secure client information.
          </p>
          <p className="mt-3">
            Our protection framework includes:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Encryption:</strong> Data is encrypted both in transit (using HTTPS/TLS protocols) and at rest within our PostgreSQL databases.</li>
            <li><strong>Access Controls:</strong> System configurations and client portal details are partitioned. Technicians only gain access to the data of clients assigned to their open tickets.</li>
            <li><strong>Monitoring:</strong> 24/7 security auditing of portal logs to detect unauthorized access attempts or suspicious activity.</li>
          </ul>
        </>
      )
    },
    {
      id: "sharing",
      title: "5. Sharing of Information",
      content: (
        <>
          <p>
            We do not sell, trade, or rent client personal data or technical configurations to third parties. We may share information only in the following scenarios:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Service Providers:</strong> Third-party integrations (e.g., email notification senders, billing gateways, SMS/WhatsApp engines) that perform operations on our behalf under strict confidentiality agreements.</li>
            <li><strong>Legal Requirements:</strong> When compelled by law, subpoena, or regulation to protect our rights, client safety, or cooperate with public authorities.</li>
          </ul>
        </>
      )
    },
    {
      id: "cookies",
      title: "6. Cookies and Sessions",
      content: (
        <>
          <p>
            The MSP Portal utilizes essential cookies and session tokens to keep you authenticated as you browse pages.
          </p>
          <p className="mt-3">
            These cookies allow the system to:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Maintain active login state (so you don&apos;t have to re-enter credentials on every action).</li>
            <li>Remember UI preferences such as sidebar expansion settings.</li>
          </ul>
          <p className="mt-3">
            You can disable cookies in your browser settings, but please note that the portal will not function correctly without session tracking enabled.
          </p>
        </>
      )
    },
    {
      id: "rights",
      title: "7. Client Rights (GDPR & CCPA)",
      content: (
        <>
          <p>
            Depending on your jurisdiction, you may have specific statutory rights regarding your personal information, including:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>The right to access the data we hold about your business.</li>
            <li>The right to request correction of inaccurate records.</li>
            <li>The right to request deletion of non-essential accounts and associated history (subject to regulatory holding requirements for billing documents).</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, please contact our privacy compliance officer.
          </p>
        </>
      )
    },
    {
      id: "contact",
      title: "8. Compliance Contact",
      content: (
        <>
          <p>
            If you have questions about this Privacy Policy or wish to request data correction/deletion, please reach out to us:
          </p>
          <div className="mt-3 p-4 bg-surface-container rounded-lg border border-outline-variant text-body-md space-y-1">
            <p className="font-semibold text-primary">Velmar Technology SRL</p>
            <p>Attn: Data Privacy Officer</p>
            <p>Email: privacy@velmartech.com</p>
            <p>Phone: +1 (800) 555-0199 ext. 4</p>
          </div>
        </>
      )
    }
  ];

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-12 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <h1 className="text-h1 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
            Privacy Policy
          </h1>
          <p className="text-body-lg text-on-surface-variant mt-1">
            Last updated: June 18, 2026. This policy describes how we protect your operational and account data.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-lg border border-outline-variant text-label-sm text-on-surface-variant">
          <Shield className="h-4 w-4 text-secondary" />
          <span>Compliant Standard</span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Sticky Left Sidebar Navigation */}
        <div className="lg:col-span-1 lg:sticky lg:top-24 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm hidden lg:block">
          <h2 className="text-label-md font-bold text-on-surface uppercase tracking-wider px-3 mb-3">
            Table of Contents
          </h2>
          <nav className="space-y-1">
            {privacySections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all text-left cursor-pointer group"
              >
                <span className="truncate">{sec.title.split('. ')[1] || sec.title}</span>
                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-secondary" />
              </button>
            ))}
          </nav>
        </div>

        {/* Scrolling Legal Text Content */}
        <div className="lg:col-span-3 space-y-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 shadow-sm">
          {/* Security Banner */}
          <div className="flex gap-3 bg-success/5 border border-success/20 rounded-xl p-4 text-body-md text-on-surface-variant">
            <Lock className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-primary">Secure Infrastructure:</span> We encrypt all server monitoring credentials, log files, and tickets using industry standard AES-256 protocols.
            </div>
          </div>

          <div className="space-y-8 divide-y divide-outline-variant/60">
            {privacySections.map((sec) => (
              <div
                key={sec.id}
                ref={(el) => {
                  sectionsRef.current[sec.id] = el;
                }}
                className="pt-6 first:pt-0 scroll-mt-24 space-y-3"
              >
                <h3 className="text-h3 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                  {sec.title}
                </h3>
                <div className="text-body-md text-on-surface-variant leading-relaxed space-y-2">
                  {sec.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
