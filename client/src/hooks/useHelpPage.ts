import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { faqsEn, faqsEs } from '@/lib/faqs';
import { HelpCircle, BookOpen, MessageSquare, CreditCard, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUrlState } from '@/hooks/useUrlState';

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
}

export interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
}

export function useHelpPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { getParam, getNumberParam, setParam, setParams } = useUrlState();

  const [searchQuery, setSearchQueryInternal] = useState(() => getParam('search', ''));
  const [selectedCategory, setSelectedCategoryInternal] = useState<string>(() => getParam('tab', getParam('category', 'all')));
  const [openFaqId, setOpenFaqIdInternal] = useState<number | null>(() => {
    const faqFromUrl = getNumberParam('faq', 0);
    return faqFromUrl > 0 ? faqFromUrl : null;
  });

  const faqs = i18n.language === 'es_DO' ? faqsEs : faqsEn;

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryInternal(query);
    setParam('search', query || null);
  }, [setParam]);

  const handleCategorySelect = useCallback((catId: string) => {
    setSelectedCategoryInternal(catId);
    setOpenFaqIdInternal(null);
    setParams({ tab: catId === 'all' ? null : catId, category: null, faq: null });
  }, [setParams]);

  const toggleFaq = useCallback((id: number) => {
    setOpenFaqIdInternal(prev => {
      const next = prev === id ? null : id;
      setParam('faq', next);
      return next;
    });
  }, [setParam]);

  useEffect(() => {
    const faqIdFromState = location.state?.expandFaqId ? Number(location.state.expandFaqId) : null;
    const faqIdFromUrl = getNumberParam('faq', 0);
    const targetFaqId = faqIdFromState || (faqIdFromUrl > 0 ? faqIdFromUrl : null);

    if (targetFaqId) {
      setOpenFaqIdInternal(targetFaqId);
      const faq = faqs.find((f: FAQ) => f.id === targetFaqId);
      if (faq) {
        setSelectedCategoryInternal(faq.category);
        setParams({ tab: faq.category, faq: targetFaqId });
      }
      if (location.state?.expandFaqId) {
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, faqs, getNumberParam, setParams]);

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq: FAQ) => {
      const matchesSearch = 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [faqs, searchQuery, selectedCategory]);

  const categories: Category[] = useMemo(() => [
    { id: 'all', label: i18n.language === 'es_DO' ? 'Faq Completas' : 'All FAQs', icon: HelpCircle },
    { id: 'general', label: i18n.language === 'es_DO' ? 'General' : 'General', icon: BookOpen },
    { id: 'tickets', label: i18n.language === 'es_DO' ? 'Tickets y Soporte' : 'Tickets & Support', icon: MessageSquare },
    { id: 'billing', label: i18n.language === 'es_DO' ? 'Facturación y Planes' : 'Billing & Plans', icon: CreditCard },
    { id: 'technical', label: i18n.language === 'es_DO' ? 'Técnico' : 'Technical', icon: Lock },
  ], [i18n.language]);

  return {
    t,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    handleCategorySelect,
    openFaqId,
    toggleFaq,
    filteredFaqs,
    categories,
  };
}

