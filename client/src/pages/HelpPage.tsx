import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
import { useTranslation } from 'react-i18next';
import { Page } from '@/components/Page';
import { Input } from '@/components/ui/input';
import { faqsEn, faqsEs } from '@/lib/faqs';

export function HelpPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);

  const toggleFaq = (id: number) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  const faqs = i18n.language === 'es_DO' ? faqsEs : faqsEn;

  useEffect(() => {
    if (location.state?.expandFaqId) {
      const faqId = Number(location.state.expandFaqId);
      const timer = setTimeout(() => {
        setOpenFaqId(faqId);
        const faq = faqs.find(f => f.id === faqId);
        if (faq) {
          setSelectedCategory(faq.category);
        }
        window.history.replaceState({}, document.title);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [location.state, faqs]);

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', label: i18n.language === 'es_DO' ? 'Faq Completas' : 'All FAQs', icon: HelpCircle },
    { id: 'general', label: i18n.language === 'es_DO' ? 'General' : 'General', icon: BookOpen },
    { id: 'tickets', label: i18n.language === 'es_DO' ? 'Tickets y Soporte' : 'Tickets & Support', icon: MessageSquare },
    { id: 'billing', label: i18n.language === 'es_DO' ? 'Facturación y Planes' : 'Billing & Plans', icon: CreditCard },
    { id: 'technical', label: i18n.language === 'es_DO' ? 'Técnico' : 'Technical', icon: Lock },
  ];

  return (
    <Page className="space-y-8 pb-12 text-on-surface">
      {/* Header & Search */}
      <div className="text-center py-8 px-4 bg-surface-container rounded-2xl border border-outline-variant relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-tr from-secondary/5 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <h1 className="text-h1 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
            {t('help.title')}
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            {t('help.subtitle')}
          </p>
          <div className="relative max-w-lg mx-auto mt-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant/60" />
            <Input
              id="help-faq-search"
              type="text"
              placeholder={t('help.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all shadow-sm placeholder:text-on-surface-variant/50 text-on-surface"
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
                <p className="text-body-lg font-medium">{t('help.noResults')}</p>
                <p className="text-body-md text-on-surface-variant/70 mt-1">
                  {t('help.noResultsDesc')}
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
                      <span className="ml-4 shrink-0 text-on-surface-variant">
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
        <div className="space-y-6 text-on-surface">
          {/* Create ticket shortcut */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-h3 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
              {t('help.stillNeedAssistance')}
            </h3>
            <p className="text-body-md text-on-surface-variant">
              {t('help.stillNeedAssistanceDesc')}
            </p>
            <Link 
              to="/tickets" 
              className="inline-flex items-center justify-center gap-2 w-full bg-secondary text-on-secondary py-3 px-4 rounded-xl text-label-md font-semibold hover:opacity-90 transition-opacity"
            >
              <PlusCircle className="h-4 w-4" />
              {t('help.createSupportTicket')}
            </Link>
          </div>

          {/* Business Support info */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-5">
            <h4 className="text-label-md font-semibold text-on-surface uppercase tracking-wider">
              {t('help.emergencySupport')}
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
                <div>
                  <p className="text-label-md text-on-surface font-semibold">{t('help.phoneSupport')}</p>
                  <p className="text-body-md text-on-surface-variant">{t('help.phoneValue')}</p>
                  <p className="text-label-sm text-on-surface-variant/70">{t('help.phoneDesc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
                <div>
                  <p className="text-label-md text-on-surface font-semibold">{t('help.emailSupport')}</p>
                  <p className="text-body-md text-on-surface-variant">{t('help.emailValue')}</p>
                  <p className="text-label-sm text-on-surface-variant/70">{t('help.emailDesc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
                <div>
                  <p className="text-label-md text-on-surface font-semibold">{t('help.supportHours')}</p>
                  <p className="text-body-md text-on-surface-variant">{t('help.hoursValue')}</p>
                  <p className="text-label-sm text-on-surface-variant/70">{t('help.hoursDesc')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
