import React from 'react';
import { Shield, Lock, ChevronRight } from 'lucide-react';
import { Page } from '@/components/Page';
import { usePrivacyPage } from '@/hooks/usePrivacyPage';
import type { PrivacySection } from '@/hooks/usePrivacyPage';

interface HeaderProps {
  t: (key: string) => string;
  isSpanish: boolean;
}

const PrivacyHeader: React.FC<HeaderProps> = ({ t, isSpanish }) => (
  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 md:px-6 md:py-5 border-b border-border bg-card">
    <div>
      <h1 className="text-sm font-bold text-foreground leading-none font-heading">
        {t('legal.privacyTitle')}
      </h1>
      <p className="text-xs text-muted-foreground mt-1">
        {t('legal.lastUpdated')}: {isSpanish ? '18 de Junio, 2026' : 'June 18, 2026'}. {isSpanish ? 'Esta política describe cómo protegemos sus datos operativos y de cuenta.' : 'This policy describes how we protect your operational and account data.'}
      </p>
    </div>
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-md border border-border shrink-0">
      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t('legal.compliantText')}</span>
    </div>
  </div>
);

interface SidebarProps {
  sections: PrivacySection[];
  scrollToSection: (id: string) => void;
  t: (key: string) => string;
}

const PrivacySidebar: React.FC<SidebarProps> = ({ sections, scrollToSection, t }) => (
  <div className="sticky top-6">
    <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2 font-heading">
      {t('legal.tableOfContents')}
    </h2>
    <nav className="space-y-0.5 flex flex-col">
      {sections.map((sec) => (
        <button
          key={sec.id}
          onClick={() => scrollToSection(sec.id)}
          className="group flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left cursor-pointer"
        >
          <span className="truncate">{sec.title.split('. ')[1] || sec.title}</span>
          <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
        </button>
      ))}
    </nav>
  </div>
);

interface ContentProps {
  sections: PrivacySection[];
  sectionsRef: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  t: (key: string) => string;
}

const PrivacyContent: React.FC<ContentProps> = ({ sections, sectionsRef, t }) => (
  <div className="space-y-6">
    {/* Security Banner */}
    <div className="flex gap-2.5 bg-muted/40 border border-border rounded-md p-3 items-start">
      <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="text-xs text-muted-foreground leading-relaxed">
        <span className="font-semibold text-foreground mr-1">{t('legal.privacyAlertTitle')}</span> 
        {t('legal.privacyAlertText')}
      </div>
    </div>

    {/* Document Sections */}
    <div className="space-y-6 divide-y divide-border">
      {sections.map((sec) => (
        <div
          key={sec.id}
          ref={(el) => {
            sectionsRef.current[sec.id] = el;
          }}
          className="pt-6 first:pt-0 scroll-mt-24 space-y-2.5"
        >
          <h3 className="text-sm font-semibold text-foreground font-heading">
            {sec.title}
          </h3>
          <div className="text-xs text-muted-foreground leading-relaxed space-y-2.5 [&_ul]:space-y-1.5 [&_ul]:pl-4 [&_p]:m-0 [&_strong]:text-foreground">
            {sec.content}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export function PrivacyPage() {
  const { t, i18n, sectionsRef, scrollToSection, privacySections } = usePrivacyPage();
  const isSpanish = i18n.language === 'es_DO';

  return (
    <Page showBreadcrumbs={false} className="max-w-5xl mx-auto pt-6 pb-12">
      <div className="border border-border bg-card rounded-xl shadow-xs overflow-hidden">
        <PrivacyHeader t={t} isSpanish={isSpanish} />
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          {/* Sticky Left Sidebar Navigation */}
          <div className="hidden md:block md:col-span-3 p-4 md:p-5 border-r border-border bg-muted/20">
            <PrivacySidebar sections={privacySections} scrollToSection={scrollToSection} t={t} />
          </div>
          
          {/* Main Content Area */}
          <div className="md:col-span-9 p-5 md:p-8 bg-card">
            <PrivacyContent sections={privacySections} sectionsRef={sectionsRef} t={t} />
          </div>
        </div>
      </div>
    </Page>
  );
}

export default PrivacyPage;
