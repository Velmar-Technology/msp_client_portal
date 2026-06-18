import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Mail, 
  Phone, 
  Clock, 
  PlusCircle, 
  BookOpen, 
  MessageSquare,
  Lock,
  CreditCard
} from 'lucide-react';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: 'general' | 'tickets' | 'billing' | 'technical';
}

const faqs: FAQ[] = [
  {
    id: 1,
    question: "How do I create a new support ticket?",
    answer: "To create a support ticket, navigate to the 'Tickets' section in the sidebar menu and click on the 'New Ticket' button. Fill out the form with your issue details, select a category and priority, and submit. You can also track updates and add comments on that same ticket.",
    category: "tickets"
  },
  {
    id: 2,
    question: "What is the 1-hour SLA guarantee?",
    answer: "For critical infrastructure issues and specific hardware warranties under our premium plans, we guarantee a first-response resolution effort or assessment within 1 hour. If we do not respond within this timeframe, the ticket is auto-escalated to tier-2 engineers and service credits may apply.",
    category: "general"
  },
  {
    id: 3,
    question: "How do I view and pay my invoices?",
    answer: "You can view your billing history by clicking on the 'Billing' link in the sidebar or footer. There you will see a history of all invoices, tax breakdowns, and payment statuses. Payments are processed securely via standard institutional protocols configured on your account.",
    category: "billing"
  },
  {
    id: 4,
    question: "How is my server/system configuration monitored?",
    answer: "Our monitoring agents check server health, CPU load, disk space, and network latency every 60 seconds. If a metric crosses a critical threshold, our system automatically creates a high-priority ticket and alerts your dedicated network administrator.",
    category: "technical"
  },
  {
    id: 5,
    question: "Can I upgrade or downgrade my support plan?",
    answer: "Yes, you can browse available plans under the 'Plans' tab in the sidebar. To request a plan change, you can submit a ticket under the 'Billing / Plan Update' category, and our account managers will execute the transition at the end of the billing cycle.",
    category: "billing"
  },
  {
    id: 6,
    question: "What happens if a ticket is marked resolved but the issue persists?",
    answer: "If the issue returns, you can reopen the ticket within 72 hours by commenting on it directly. After 72 hours, tickets are permanently closed to maintain accurate logging; in that case, please create a new ticket and reference the old ticket number.",
    category: "tickets"
  },
  {
    id: 7,
    question: "Is multi-factor authentication (MFA) supported?",
    answer: "Absolutely. Security is our priority. You can configure multi-factor authentication (MFA) from your Profile page to add an extra layer of protection to your client portal account.",
    category: "technical"
  },
  {
    id: 8,
    question: "How do I update my profile details?",
    answer: "Go to the 'Profile' section via the sidebar or by clicking your avatar in the top-right menu. You can update your display name, email, and security settings there.",
    category: "general"
  }
];

export function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);

  const toggleFaq = (id: number) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', label: 'All FAQs', icon: HelpCircle },
    { id: 'general', label: 'General', icon: BookOpen },
    { id: 'tickets', label: 'Tickets & Support', icon: MessageSquare },
    { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
    { id: 'technical', label: 'Technical', icon: Lock },
  ];

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header & Search */}
      <div className="text-center py-8 px-4 bg-surface-container rounded-2xl border border-outline-variant relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-secondary/5 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <h1 className="text-h1 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
            Help & Documentation
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Find answers to common questions, learn about our service level agreements, or contact support directly.
          </p>
          <div className="relative max-w-lg mx-auto mt-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant/60" />
            <input
              type="text"
              placeholder="Search help topics, FAQs, and more..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all shadow-sm placeholder:text-on-surface-variant/50"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Categories and FAQs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Category Navigation Tabs */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-outline-variant">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setOpenFaqId(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-label-md transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-primary text-on-primary shadow-sm' 
                      : 'hover:bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Accordion list */}
          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center text-on-surface-variant">
                <HelpCircle className="h-12 w-12 mx-auto text-on-surface-variant/40 mb-3" />
                <p className="text-body-lg font-medium">No results found</p>
                <p className="text-body-md text-on-surface-variant/70 mt-1">
                  Try adjusting your search terms or selecting another category.
                </p>
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div 
                    key={faq.id} 
                    className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm hover:border-outline transition-all"
                  >
                    <button
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full flex items-center justify-between p-5 text-left cursor-pointer transition-colors hover:bg-surface-container-low/30"
                    >
                      <span className="text-label-md md:text-body-lg font-semibold text-on-surface select-none">
                        {faq.question}
                      </span>
                      <span className="ml-4 flex-shrink-0 text-on-surface-variant">
                        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </span>
                    </button>
                    
                    <div 
                      className={`transition-all duration-200 ease-in-out ${
                        isOpen ? 'max-h-[500px] border-t border-outline-variant/60 opacity-100 p-5' : 'max-h-0 opacity-0 overflow-hidden'
                      }`}
                    >
                      <p className="text-body-md text-on-surface-variant leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Support & Contact Details */}
        <div className="space-y-6">
          {/* Create ticket shortcut */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-h3 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
              Still need assistance?
            </h3>
            <p className="text-body-md text-on-surface-variant">
              If you can't find what you are looking for in our documentation, you can create a direct support ticket.
            </p>
            <Link 
              to="/tickets" 
              className="inline-flex items-center justify-center gap-2 w-full bg-secondary text-on-secondary py-3 px-4 rounded-xl text-label-md font-semibold hover:opacity-90 transition-opacity"
            >
              <PlusCircle className="h-4 w-4" />
              Create Support Ticket
            </Link>
          </div>

          {/* Business Support info */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-5">
            <h4 className="text-label-md font-semibold text-on-surface uppercase tracking-wider">
              Emergency & Direct Support
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-label-md text-on-surface font-semibold">Phone Support</p>
                  <p className="text-body-md text-on-surface-variant">+1 (800) 555-0199</p>
                  <p className="text-label-sm text-on-surface-variant/70">Toll-free emergency hotline</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-label-md text-on-surface font-semibold">Email Support</p>
                  <p className="text-body-md text-on-surface-variant">support@velmartech.com</p>
                  <p className="text-label-sm text-on-surface-variant/70">Responses within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-label-md text-on-surface font-semibold">Support Hours</p>
                  <p className="text-body-md text-on-surface-variant">Mon - Fri: 8:00 AM - 6:00 PM EST</p>
                  <p className="text-label-sm text-on-surface-variant/70">24/7 Monitoring & Critical Incident response</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
