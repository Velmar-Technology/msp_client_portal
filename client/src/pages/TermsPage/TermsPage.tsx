import React from "react";
import { ShieldAlert, ChevronRight, Scale } from "lucide-react";
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { useTermsPage } from "@/hooks/useTermsPage";
import type { TermSection } from "@/hooks/useTermsPage";

interface HeaderProps {
  t: (key: string) => string;
  isSpanish: boolean;
}

const TermsHeader: React.FC<HeaderProps> = ({ t, isSpanish }) => (
  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 md:px-6 md:py-5 border-b border-border bg-card">
    <div>
      <h1 className="text-sm font-bold text-foreground leading-none font-heading">
        {t("legal.termsTitle")}
      </h1>
      <p className="text-xs text-muted-foreground mt-1">
        {t("legal.lastUpdated")}: {isSpanish ? "18 de Junio, 2026" : "June 18, 2026"}. {isSpanish ? "Al utilizar los servicios de Velmar Technology, usted acepta cumplir con estos términos." : "By using Velmar Technology services, you agree to be bound by these terms."}
      </p>
    </div>
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-md border border-border shrink-0">
      <Scale className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t("legal.bindingAgreement")}</span>
    </div>
  </div>
);

interface SidebarProps {
  sections: TermSection[];
  scrollToSection: (id: string) => void;
  t: (key: string) => string;
}

const TermsSidebar: React.FC<SidebarProps> = ({ sections, scrollToSection, t }) => (
  <div className="sticky top-6">
    <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2 font-heading">
      {t("legal.tableOfContents")}
    </h2>
    <nav className="space-y-0.5 flex flex-col">
      {sections.map((sec) => (
        <Button
          key={sec.id}
          variant="ghost"
          size="sm"
          onClick={() => scrollToSection(sec.id)}
          className="group flex items-center justify-between px-3 py-1.5 h-auto rounded-md text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left cursor-pointer w-full"
        >
          <span className="truncate">{sec.title.split(". ")[1] || sec.title}</span>
          <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground shrink-0" />
        </Button>
      ))}
    </nav>
  </div>
);

interface ContentProps {
  sections: TermSection[];
  sectionsRef: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  t: (key: string) => string;
  isSpanish: boolean;
}

const TermsContent: React.FC<ContentProps> = ({ sections, sectionsRef, t, isSpanish }) => (
  <div className="space-y-6">
    {/* Alert Banner */}
    <div className="flex gap-2.5 bg-muted/40 border border-border rounded-md p-3.5 items-start">
      <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="text-xs text-muted-foreground leading-relaxed">{t("legal.termsAlertText")}</div>
    </div>

    {/* Legal Preamble */}
    <div className="text-xs text-foreground bg-muted/30 p-3.5 rounded-lg border border-border leading-relaxed">
      {isSpanish ? (
        <>
          Este documento constituye un contrato legalmente vinculante entre <strong>VELMAR TECHNOLOGY SRL</strong> (en
          adelante, &quot;LA EMPRESA&quot;), sociedad comercial organizada y existente bajo las leyes de la República
          Dominicana, provista de su Registro Nacional de Contribuyentes (RNC) No. [Insertar RNC], con domicilio social
          y operaciones en San Pedro de Macorís, República Dominicana; y la persona física o jurídica que contrata o
          utiliza los servicios (en adelante, &quot;EL CLIENTE&quot;).
        </>
      ) : (
        <>
          This document constitutes a legally binding contract between <strong>VELMAR TECHNOLOGY SRL</strong>{" "}
          (hereinafter, &quot;THE COMPANY&quot;), a commercial entity organized and existing under the laws of the
          Dominican Republic, registered with Tax Identification Number (RNC) No. [Insert RNC], with registered office
          and operations in San Pedro de Macorís, Dominican Republic; and the physical or legal entity that contracts or
          uses the services (hereinafter, &quot;THE CLIENT&quot;).
        </>
      )}
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
          <h3 className="text-sm font-semibold text-foreground font-heading">{sec.title}</h3>
          <div className="text-xs text-muted-foreground leading-relaxed space-y-2.5 [&_ul]:space-y-1.5 [&_ul]:pl-4 [&_p]:m-0 [&_strong]:text-foreground">
            {sec.content}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export function TermsPage() {
  const { t, i18n, sectionsRef, scrollToSection, termSections } = useTermsPage();
  const isSpanish = i18n.language === "es_DO";

  return (
    <Page showBreadcrumbs={false} className="w-full pt-2 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="border border-border bg-card rounded-xl shadow-xs overflow-hidden">
        <TermsHeader t={t} isSpanish={isSpanish} />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          {/* Sticky Left Sidebar Navigation */}
          <div className="hidden md:block md:col-span-3 p-4 md:p-5 border-r border-border bg-muted/20">
            <TermsSidebar sections={termSections} scrollToSection={scrollToSection} t={t} />
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-9 p-5 md:p-8 bg-card">
            <TermsContent sections={termSections} sectionsRef={sectionsRef} t={t} isSpanish={isSpanish} />
          </div>
        </div>
      </div>
    </Page>
  );
}

export default TermsPage;
