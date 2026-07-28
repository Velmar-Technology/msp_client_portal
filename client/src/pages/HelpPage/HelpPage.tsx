import React from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp, Mail, Phone, Clock, PlusCircle, HelpCircle } from 'lucide-react';
import { Page } from '@/components/Page';
import { Input } from '@/components/ui/input';
import { useHelpPage } from '@/hooks/useHelpPage';
import type { FAQ, Category } from '@/hooks/useHelpPage';

interface HeaderProps {
  t: (key: string) => string;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
}

const HelpSearchHeader: React.FC<HeaderProps> = ({ t, searchQuery, setSearchQuery }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 gap-4">
    <div>
      <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-none">{t('help.title')}</h1>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('help.subtitle')}</p>
    </div>
    <div className="relative w-full md:max-w-xs shrink-0">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
      <Input
        type="text"
        placeholder={t('help.searchPlaceholder')}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full h-8 pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-md focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
      />
    </div>
  </div>
);

interface TabsProps {
  categories: Category[];
  selectedCategory: string;
  onSelect: (id: string) => void;
}

const HelpCategoryTabs: React.FC<TabsProps> = ({ categories, selectedCategory, onSelect }) => (
  <div className="flex flex-wrap gap-1.5 mb-4">
    {categories.map((cat) => {
      const Icon = cat.icon;
      const isActive = selectedCategory === cat.id;
      return (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer select-none ${
            isActive 
              ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 shadow-sm' 
              : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-900'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {cat.label}
        </button>
      );
    })}
  </div>
);

interface AccordionProps {
  faqs: FAQ[];
  openFaqId: number | null;
  toggleFaq: (id: number) => void;
  t: (key: string) => string;
}

const HelpFaqAccordion: React.FC<AccordionProps> = ({ faqs, openFaqId, toggleFaq, t }) => {
  if (faqs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
        <HelpCircle className="h-6 w-6 text-zinc-300 dark:text-zinc-600 mb-2" />
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t('help.noResults')}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t('help.noResultsDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {faqs.map((faq) => {
        const isOpen = openFaqId === faq.id;
        return (
          <div 
            key={faq.id} 
            className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden bg-white dark:bg-zinc-950"
          >
            <button
              onClick={() => toggleFaq(faq.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 pr-4 select-none">
                {faq.question}
              </span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
              )}
            </button>
            {isOpen && (
              <div className="px-3 pb-3 pt-1 border-t border-zinc-100 dark:border-zinc-800/50">
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface SidebarProps {
  t: (key: string) => string;
}

const HelpSidebar: React.FC<SidebarProps> = ({ t }) => (
  <div className="space-y-4">
    {/* CTA Block */}
    <div className="p-4 border border-blue-200 dark:border-blue-900/50 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 flex flex-col gap-3">
      <div>
        <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">{t('help.stillNeedAssistance')}</h3>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-tight">{t('help.stillNeedAssistanceDesc')}</p>
      </div>
      <Link 
        to="/tickets" 
        className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md transition-colors shadow-sm"
      >
        <PlusCircle className="h-3.5 w-3.5" />
        {t('help.createSupportTicket')}
      </Link>
    </div>

    {/* Contact Info Block */}
    <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 space-y-4">
      <h4 className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        {t('help.emergencySupport')}
      </h4>
      
      <div className="space-y-3.5">
        <div className="flex gap-2.5 items-start">
          <Phone className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-none">{t('help.phoneSupport')}</span>
            <span className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{t('help.phoneValue')}</span>
          </div>
        </div>

        <div className="flex gap-2.5 items-start">
          <Mail className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-none">{t('help.emailSupport')}</span>
            <span className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{t('help.emailValue')}</span>
          </div>
        </div>

        <div className="flex gap-2.5 items-start">
          <Clock className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-none">{t('help.supportHours')}</span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-1">{t('help.hoursValue')}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export function HelpPage() {
  const {
    t,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    handleCategorySelect,
    openFaqId,
    toggleFaq,
    filteredFaqs,
    categories,
  } = useHelpPage();

  return (
    <Page showBreadcrumbs={false} className="max-w-6xl mx-auto pt-6 pb-12">
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl overflow-hidden shadow-sm">
        <HelpSearchHeader t={t} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          {/* Main FAQ Content */}
          <div className="md:col-span-8 p-4 md:p-5 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10">
            <HelpCategoryTabs 
              categories={categories} 
              selectedCategory={selectedCategory} 
              onSelect={handleCategorySelect} 
            />
            <HelpFaqAccordion 
              faqs={filteredFaqs} 
              openFaqId={openFaqId} 
              toggleFaq={toggleFaq} 
              t={t} 
            />
          </div>
          
          {/* Sidebar */}
          <div className="md:col-span-4 p-4 md:p-5 bg-zinc-50 dark:bg-zinc-900/30">
            <HelpSidebar t={t} />
          </div>
        </div>
      </div>
    </Page>
  );
}
