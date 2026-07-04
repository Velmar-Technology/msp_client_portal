import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { faqsEn, faqsEs } from '@/lib/faqs';
import { HelpCircle, BookOpen, MessageSquare, CreditCard, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);

  const faqs = i18n.language === 'es_DO' ? faqsEs : faqsEn;

  useEffect(() => {
    if (location.state?.expandFaqId) {
      const faqId = Number(location.state.expandFaqId);
      const timer = setTimeout(() => {
        setOpenFaqId(faqId);
        const faq = faqs.find((f: FAQ) => f.id === faqId);
        if (faq) {
          setSelectedCategory(faq.category);
        }
        window.history.replaceState({}, document.title);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [location.state, faqs]);

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

  const toggleFaq = (id: number) => {
    setOpenFaqId(prev => (prev === id ? null : id));
  };

  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id);
    setOpenFaqId(null);
  };

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
