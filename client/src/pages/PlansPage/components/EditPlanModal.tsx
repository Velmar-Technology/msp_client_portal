import React, { useState } from 'react';
import {
  X,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Globe,
  SlidersHorizontal,
  Package,
  Layers,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Plan, PlanFeature } from "@/services/planService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { FEATURE_CATALOG } from "@/constants/featureCatalog";

export interface EditPlanModalProps {
  editingPlan: Plan;
  isCreateMode: boolean;
  editId: string;
  setEditId: (val: string) => void;
  editClientType: string;
  setEditClientType: (val: string) => void;
  editName: Record<string, string>;
  setEditName: (val: Record<string, string>) => void;
  editDescription: Record<string, string>;
  setEditDescription: (val: Record<string, string>) => void;
  editPrice: number;
  setEditPrice: (val: number) => void;
  editRecommended: boolean;
  setEditRecommended: (val: boolean) => void;
  editActive: boolean;
  setEditActive: (val: boolean) => void;
  editFeatures: PlanFeature[];
  saveLoading: boolean;
  draggedIndex: number | null;
  dragOverIndex: number | null;
  onClose: () => void;
  onSave: () => Promise<void>;
  onAddFeature: () => void;
  onDeleteFeature: (index: number) => void;
  onToggleFeatureIncluded: (index: number, included: boolean) => void;
  onEditFeatureText: (index: number, lang: 'en_US' | 'es_DO', textVal: string) => void;
  onUpdateFeatureCode?: (index: number, code: string) => void;
  onUpdateFeatureParam?: (index: number, paramKey: string, value: string | number | boolean) => void;
  onDeleteFeatureParam?: (index: number, paramKey: string) => void;
  onMoveFeature: (index: number, direction: -1 | 1) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDeletePlan?: (planId: string) => void;
}

export function EditPlanModal({
  editingPlan,
  isCreateMode,
  editId,
  setEditId,
  editClientType,
  setEditClientType,
  editName,
  setEditName,
  editDescription,
  setEditDescription,
  editPrice,
  setEditPrice,
  editRecommended,
  setEditRecommended,
  editActive,
  setEditActive,
  editFeatures,
  saveLoading,
  draggedIndex,
  dragOverIndex,
  onClose,
  onSave,
  onAddFeature,
  onDeleteFeature,
  onToggleFeatureIncluded,
  onEditFeatureText,
  onUpdateFeatureCode,
  onUpdateFeatureParam,
  onDeleteFeatureParam,
  onMoveFeature,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onDeletePlan,
}: EditPlanModalProps) {
  const { t } = useTranslation();
  const [activeLang, setActiveLang] = useState<'en_US' | 'es_DO'>('en_US');
  const [featureLangTab, setFeatureLangTab] = useState<'en_US' | 'es_DO'>('en_US');

  const titleText = isCreateMode
    ? t('plans.addNewPlan')
    : t('plans.editPlanTitle', { id: editingPlan.id });

  return (
    <Sheet open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-xl md:max-w-2xl h-full p-0 flex flex-col bg-background text-foreground border-l border-border shadow-2xl overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-xl data-[side=right]:md:max-w-2xl"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-border flex flex-row justify-between items-center bg-zinc-50/70 dark:bg-zinc-900/40 space-y-0 text-left shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
              <Package className="size-3.5" />
            </div>
            <div>
              <SheetTitle className="text-sm font-bold tracking-tight text-foreground font-heading">
                {titleText}
              </SheetTitle>
              <SheetDescription className="text-[11px] text-muted-foreground">
                {isCreateMode ? t('plans.createSubtitle') : t('plans.editSubtitle')}
              </SheetDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            className="cursor-pointer text-muted-foreground hover:text-foreground rounded-md"
            aria-label={t('common.close')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </SheetHeader>

        {/* Scrollable Body with Flat Semantic Sections & Hairline Dividers */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Section 1: Plan Specifications */}
          <section aria-label={t('plans.generalInfo')} className="space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                {t('plans.generalInfo')}
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-medium text-foreground">
                  <Checkbox
                    checked={editRecommended}
                    onCheckedChange={(checked) => setEditRecommended(checked === true)}
                    className="size-3.5 cursor-pointer"
                  />
                  <span className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    {t('plans.recommended')}
                  </span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-medium text-foreground">
                  <Checkbox
                    checked={editActive}
                    onCheckedChange={(checked) => setEditActive(checked === true)}
                    className="size-3.5 cursor-pointer"
                  />
                  <span className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    {t('plans.active')}
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
              {/* Plan ID */}
              <div className="sm:col-span-4 space-y-1">
                <Label htmlFor="edit-id" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t('plans.planId')}
                </Label>
                <Input
                  id="edit-id"
                  type="text"
                  value={editId}
                  disabled={!isCreateMode}
                  onChange={(e) => setEditId(e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                  placeholder={t('plans.planIdPlaceholder')}
                  className="font-mono text-xs disabled:opacity-60"
                />
              </div>

              {/* Client Type */}
              <div className="sm:col-span-5 space-y-1">
                <Label htmlFor="edit-client-type" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t('plans.clientType')}
                </Label>
                <Select
                  value={editClientType}
                  onValueChange={(val) => setEditClientType(val)}
                >
                  <SelectTrigger id="edit-client-type" className="w-full text-xs font-medium">
                    <SelectValue placeholder={t('plans.clientType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENT">{t('plans.clientTypes.standard')}</SelectItem>
                    <SelectItem value="ENTERPRISE">{t('plans.clientTypes.enterprise')}</SelectItem>
                    <SelectItem value="STUDENT">{t('plans.clientTypes.student')}</SelectItem>
                    <SelectItem value="OTHER">{t('plans.clientTypes.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Monthly Price */}
              <div className="sm:col-span-3 space-y-1">
                <Label htmlFor="edit-price" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t('plans.priceUsdPerMo')}
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="edit-price"
                    type="number"
                    min={0}
                    value={editPrice}
                    onChange={(e) => setEditPrice(parseInt(e.target.value, 10) || 0)}
                    className="pl-6 font-mono text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Localization (i18n) */}
          <section aria-label={t('plans.i18nContent')} className="space-y-3.5 pt-1">
            <Tabs value={activeLang} onValueChange={(val) => setActiveLang(val as 'en_US' | 'es_DO')} className="w-full">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-border/60">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  <span>{t('plans.i18nContent')}</span>
                </div>
                <TabsList className="h-7 p-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-md border border-border">
                  <TabsTrigger
                    value="en_US"
                    className="px-2.5 py-0.5 text-[11px] font-semibold h-6 cursor-pointer data-active:bg-background data-active:text-foreground data-active:shadow-2xs"
                  >
                    {t('plans.langEn')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="es_DO"
                    className="px-2.5 py-0.5 text-[11px] font-semibold h-6 cursor-pointer data-active:bg-background data-active:text-foreground data-active:shadow-2xs"
                  >
                    {t('plans.langEs')}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* English Tab */}
              <TabsContent value="en_US" forceMount className={activeLang === 'en_US' ? 'space-y-3 mt-0' : 'hidden'}>
                <div className="space-y-1">
                  <Label htmlFor="edit-name-en" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t('plans.planNameEn')}
                  </Label>
                  <Input
                    id="edit-name-en"
                    type="text"
                    value={editName.en_US || ''}
                    onChange={(e) => setEditName({ ...editName, en_US: e.target.value })}
                    placeholder={t('plans.planNameEnPlaceholder')}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-desc-en" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t('plans.planDescEn')}
                  </Label>
                  <Textarea
                    id="edit-desc-en"
                    rows={2}
                    value={editDescription.en_US || ''}
                    onChange={(e) => setEditDescription({ ...editDescription, en_US: e.target.value })}
                    placeholder={t('plans.planDescEnPlaceholder')}
                    className="min-h-[56px] text-xs bg-background text-foreground resize-none"
                  />
                </div>
              </TabsContent>

              {/* Spanish Tab */}
              <TabsContent value="es_DO" forceMount className={activeLang === 'es_DO' ? 'space-y-3 mt-0' : 'hidden'}>
                <div className="space-y-1">
                  <Label htmlFor="edit-name-es" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t('plans.planNameEs')}
                  </Label>
                  <Input
                    id="edit-name-es"
                    type="text"
                    value={editName.es_DO || ''}
                    onChange={(e) => setEditName({ ...editName, es_DO: e.target.value })}
                    placeholder={t('plans.planNameEsPlaceholder')}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-desc-es" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t('plans.planDescEs')}
                  </Label>
                  <Textarea
                    id="edit-desc-es"
                    rows={2}
                    value={editDescription.es_DO || ''}
                    onChange={(e) => setEditDescription({ ...editDescription, es_DO: e.target.value })}
                    placeholder={t('plans.planDescEsPlaceholder')}
                    className="min-h-[56px] text-xs bg-background text-foreground resize-none"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </section>

          {/* Section 3: Plan Features & Quotas */}
          <section aria-label={t('plans.planFeatures')} className="space-y-3.5 pt-1">
            <Tabs value={featureLangTab} onValueChange={(val) => setFeatureLangTab(val as 'en_US' | 'es_DO')} className="w-full">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    {t('plans.planFeatures')}
                  </span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono">
                    {editFeatures.length}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <TabsList className="h-6 p-0.5 bg-zinc-100 dark:bg-zinc-900 rounded border border-border">
                    <TabsTrigger
                      value="en_US"
                      className="px-2 py-0 text-[10px] h-5 font-bold cursor-pointer data-active:bg-background data-active:text-foreground"
                    >
                      EN
                    </TabsTrigger>
                    <TabsTrigger
                      value="es_DO"
                      className="px-2 py-0 text-[10px] h-5 font-bold cursor-pointer data-active:bg-background data-active:text-foreground"
                    >
                      ES
                    </TabsTrigger>
                  </TabsList>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={onAddFeature}
                    className="h-6 gap-1 px-2 text-xs font-semibold cursor-pointer border-zinc-200 dark:border-zinc-800"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{t('plans.addFeature')}</span>
                  </Button>
                </div>
              </div>

              {/* Feature Items List (Flat tonal rows without nested shadow boxes) */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                {editFeatures.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed border-border/80 rounded-lg bg-zinc-50/40 dark:bg-zinc-900/20">
                    <Layers className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
                    <p className="text-xs font-medium">{t('plans.noFeatures')}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {t('plans.noFeaturesHint')}
                    </p>
                  </div>
                ) : (
                  editFeatures.map((feat, index) => {
                    const catalogItem = FEATURE_CATALOG.find((c) => c.code === feat.code);
                    const allParamKeys = Array.from(
                      new Set([
                        ...(catalogItem?.paramSchema?.map((p) => p.key) || []),
                        ...Object.keys(feat.params || {}),
                      ])
                    );
                    const schemaKeys = new Set(catalogItem?.paramSchema?.map((p) => p.key) || []);

                    return (
                      <div
                        key={index}
                        draggable
                        onDragStart={(e) => onDragStart(e, index)}
                        onDragOver={(e) => onDragOver(e, index)}
                        onDrop={(e) => onDrop(e, index)}
                        onDragEnd={onDragEnd}
                        className={`group flex flex-col gap-1.5 rounded-md p-2 transition-all duration-150 ${
                          draggedIndex === index
                            ? 'opacity-40 bg-muted border border-border'
                            : dragOverIndex === index
                              ? 'border border-primary border-dashed bg-primary/5'
                              : 'border border-border/70 bg-zinc-50/50 hover:bg-zinc-50/90 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60'
                        }`}
                      >
                        {/* Feature Main Control Bar */}
                        <div className="flex items-center gap-1.5">
                          <div
                            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                            title={t('plans.dragToReorder')}
                          >
                            <GripVertical className="h-3.5 w-3.5" />
                          </div>

                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              disabled={index === 0}
                              onClick={() => onMoveFeature(index, -1)}
                              className="h-5 w-5 text-muted-foreground disabled:opacity-20 cursor-pointer"
                              title={t('plans.moveUp')}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              disabled={index === editFeatures.length - 1}
                              onClick={() => onMoveFeature(index, 1)}
                              className="h-5 w-5 text-muted-foreground disabled:opacity-20 cursor-pointer"
                              title={t('plans.moveDown')}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>

                          <Checkbox
                            checked={feat.included}
                            onCheckedChange={(checked) => onToggleFeatureIncluded(index, checked === true)}
                            className="size-3.5 cursor-pointer"
                            title={feat.included ? t('plans.includedInPlan') : t('plans.excludedFromPlan')}
                          />

                          {/* Catalog Code Dropdown */}
                          <Select
                            value={feat.code || 'CUSTOM_FEATURE'}
                            onValueChange={(val) => onUpdateFeatureCode?.(index, val)}
                          >
                            <SelectTrigger size="sm" className="flex-1 text-xs truncate font-medium bg-background border-border/70">
                              <SelectValue placeholder={t('plans.customFeatureSelect')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CUSTOM_FEATURE">{t('plans.customFeatureSelect')}</SelectItem>
                              {FEATURE_CATALOG.filter((c) => c.code !== 'CUSTOM_FEATURE').map((cat) => {
                                const paramsToUse =
                                  feat.code === cat.code
                                    ? feat.params || cat.defaultParams || {}
                                    : cat.defaultParams || {};
                                const label = t(cat.labelKey, paramsToUse) || cat.code;
                                return (
                                  <SelectItem key={cat.code} value={cat.code}>
                                    {label} ({cat.code})
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>

                          {/* Delete Feature Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onDeleteFeature(index)}
                            className="h-6 w-6 text-destructive hover:bg-destructive/10 cursor-pointer"
                            title={t('plans.deleteFeature')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Parameter Controls (Flat chip pills with tonal background) */}
                        {feat.code && feat.code !== 'CUSTOM_FEATURE' && (
                          <div className="ml-6 pl-1 pt-0.5 flex items-center gap-1.5 flex-wrap">
                            {allParamKeys.map((paramKey) => {
                              const schemaItem = catalogItem?.paramSchema?.find((p) => p.key === paramKey);
                              const label = schemaItem ? schemaItem.label : paramKey;
                              const currentVal = feat.params?.[paramKey] ?? schemaItem?.defaultValue ?? '';

                              return (
                                <div
                                  key={paramKey}
                                  className="flex items-center gap-1 bg-background px-1.5 py-0.5 rounded border border-border/70"
                                >
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                    {label}:
                                  </span>
                                  {schemaItem?.type === 'select' && schemaItem.options ? (
                                    <Select
                                      value={String(currentVal)}
                                      onValueChange={(val) => onUpdateFeatureParam?.(index, paramKey, val)}
                                    >
                                      <SelectTrigger size="xs" className="h-5 px-1 bg-transparent text-[10px] border-0 shadow-none">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {schemaItem.options.map((opt) => (
                                          <SelectItem key={opt} value={opt} className="text-xs">
                                            {opt}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input
                                      size="xs"
                                      type={schemaItem?.type === 'number' ? 'number' : 'text'}
                                      value={currentVal as string | number}
                                      onChange={(e) =>
                                        onUpdateFeatureParam?.(
                                          index,
                                          paramKey,
                                          schemaItem?.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                                        )
                                      }
                                      className="h-5 w-16 text-[10px] bg-transparent font-mono text-foreground focus:outline-none border-0 px-1"
                                    />
                                  )}
                                  {!schemaKeys.has(paramKey) && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-xs"
                                      onClick={() => onDeleteFeatureParam?.(index, paramKey)}
                                      className="h-4 w-4 text-[9px] text-destructive hover:opacity-80 p-0 cursor-pointer"
                                      title={t('plans.removeParam')}
                                    >
                                      ✕
                                    </Button>
                                  )}
                                </div>
                              );
                            })}

                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => {
                                const key = window.prompt(t('plans.paramPromptKey'));
                                if (!key || !key.trim()) return;
                                const val = window.prompt(t('plans.paramPromptVal', { key: key.trim() }));
                                if (val === null) return;
                                onUpdateFeatureParam?.(index, key.trim(), val);
                              }}
                              className="text-[9px] h-5 px-1.5 text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
                            >
                              {t('plans.addParam')}
                            </Button>
                          </div>
                        )}

                        {/* Custom Text Input for Active Feature Language Tab */}
                        {(!feat.code || feat.code === 'CUSTOM_FEATURE') && (
                          <div className="ml-6 pt-0.5">
                            <TabsContent value="en_US" forceMount className={featureLangTab === 'en_US' ? 'mt-0' : 'hidden'}>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase w-5 shrink-0">EN</span>
                                <Input
                                  size="sm"
                                  type="text"
                                  value={(typeof feat.text === 'string' ? feat.text : feat.text?.en_US) || ''}
                                  onChange={(e) => onEditFeatureText(index, 'en_US', e.target.value)}
                                  className="flex-1 text-xs bg-background"
                                  placeholder={t('plans.featureEnPlaceholder')}
                                />
                              </div>
                            </TabsContent>
                            <TabsContent value="es_DO" forceMount className={featureLangTab === 'es_DO' ? 'mt-0' : 'hidden'}>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase w-5 shrink-0">ES</span>
                                <Input
                                  size="sm"
                                  type="text"
                                  value={(typeof feat.text === 'string' ? feat.text : feat.text?.es_DO) || ''}
                                  onChange={(e) => onEditFeatureText(index, 'es_DO', e.target.value)}
                                  className="flex-1 text-xs bg-background"
                                  placeholder={t('plans.featureEsPlaceholder')}
                                />
                              </div>
                            </TabsContent>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </Tabs>
          </section>
        </div>

        {/* Footer */}
        <SheetFooter className="px-6 py-3.5 border-t border-border flex flex-row justify-between items-center bg-zinc-50/70 dark:bg-zinc-900/40 shrink-0 mt-auto">
          <div>
            {!isCreateMode && onDeletePlan && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  onClose();
                  onDeletePlan(editingPlan.id);
                }}
                className="gap-1 cursor-pointer text-xs font-semibold"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('plans.deletePlan')}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold cursor-pointer text-foreground"
            >
              {t('plans.cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={saveLoading}
              className="text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              {saveLoading ? (
                t('plans.saving')
              ) : isCreateMode ? (
                t('plans.createPlan')
              ) : (
                t('plans.saveChanges')
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default EditPlanModal;
