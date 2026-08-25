import React from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp, Mail, Phone, Clock, PlusCircle, HelpCircle } from 'lucide-react';
import { Page } from '@/components/Page';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Button } from '@/components/ui/button';
import { useHelpPage } from '@/hooks/useHelpPage';
import type { FAQ, Category } from '@/hooks/useHelpPage';

interface HeaderProps {
  t: (key: string) => string;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
}

const HelpSearchHeader: React.FC<HeaderProps> = ({ t, searchQuery, setSearchQuery }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-5 border-b border-border bg-card gap-4">
    <div>
      <h1 className="text-sm font-bold text-foreground leading-none font-heading">{t('help.title')}</h1>
      <p className="text-xs text-muted-foreground mt-1">{t('help.subtitle')}</p>
    </div>
    <InputGroup size="sm" className="w-full md:max-w-xs shrink-0 bg-muted/40">
      <InputGroupInput
        placeholder={t('help.searchPlaceholder')}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
    </InputGroup>
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
        <Button
          key={cat.id}
          variant={isActive ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(cat.id)}
          className={`h-7 px-2.5 text-xs font-medium cursor-pointer select-none gap-1.5 ${
            isActive
              ? 'shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {cat.label}
        </Button>
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
      <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-border rounded-lg">
        <HelpCircle className="h-6 w-6 text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-foreground">{t('help.noResults')}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t('help.noResultsDesc')}</p>
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
            className="border border-border rounded-md overflow-hidden bg-card"
          >
            <Button
              variant="ghost"
              onClick={() => toggleFaq(faq.id)}
              className="w-full h-auto py-2.5 px-3 flex items-center justify-between text-left cursor-pointer hover:bg-muted transition-colors rounded-none justify-between"
            >
              <span className="text-xs font-semibold text-foreground pr-4 select-none">
                {faq.question}
              </span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </Button>
            {isOpen && (
              <div className="px-3 pb-3 pt-1 border-t border-border">
                <p className="text-xs text-muted-foreground leading-relaxed">
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
    <div className="p-4 border border-primary/20 rounded-lg bg-primary/5 flex flex-col gap-3">
      <div>
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-heading">{t('help.stillNeedAssistance')}</h3>
        <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{t('help.stillNeedAssistanceDesc')}</p>
      </div>
      <Link 
        to="/tickets" 
        className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-md transition-colors shadow-xs"
      >
        <PlusCircle className="h-3.5 w-3.5" />
        {t('help.createSupportTicket')}
      </Link>
    </div>

    {/* Contact Info Block */}
    <div className="p-4 border border-border rounded-lg bg-card space-y-4">
      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-heading">
        {t('help.emergencySupport')}
      </h4>
      
      <div className="space-y-3.5">
        <div className="flex gap-2.5 items-start">
          <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground leading-none">{t('help.phoneSupport')}</span>
            <span className="text-xs text-muted-foreground mt-1">{t('help.phoneValue')}</span>
          </div>
        </div>

        <div className="flex gap-2.5 items-start">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground leading-none">{t('help.emailSupport')}</span>
            <span className="text-xs text-muted-foreground mt-1">{t('help.emailValue')}</span>
          </div>
        </div>

        <div className="flex gap-2.5 items-start">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground leading-none">{t('help.supportHours')}</span>
            <span className="text-[11px] text-muted-foreground leading-tight mt-1">{t('help.hoursValue')}</span>
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
      <div className="border border-border bg-card rounded-xl overflow-hidden shadow-xs">
        <HelpSearchHeader t={t} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          {/* Main FAQ Content */}
          <div className="md:col-span-8 p-4 md:p-5 border-b md:border-b-0 md:border-r border-border bg-muted/20">
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
          <div className="md:col-span-4 p-4 md:p-5 bg-muted/30">
            <HelpSidebar t={t} />
          </div>
        </div>
      </div>
    </Page>
  );
}

export default HelpPage;
