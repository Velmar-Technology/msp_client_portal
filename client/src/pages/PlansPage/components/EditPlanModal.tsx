import { X, GripVertical, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import type { Plan, PlanFeature } from '../../../services/planService';
import { Input } from '../../../components/ui/input';

interface EditPlanModalProps {
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
  onMoveFeature: (index: number, direction: -1 | 1) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
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
  onMoveFeature,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: EditPlanModalProps) {
  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg max-w-md w-full max-h-[85vh] flex flex-col shadow-xl text-zinc-900 dark:text-zinc-50">
        <div className="p-4.5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-100/50 dark:bg-zinc-900/60 rounded-t-lg">
          <h3 className="text-sm font-bold tracking-tight">
            {isCreateMode ? 'Add New Plan' : `Edit Plan: ${editingPlan.id}`}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer text-zinc-500 dark:text-zinc-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4.5 overflow-y-auto space-y-3.5 flex-1">
          <div className="grid grid-cols-2 gap-3">
            {isCreateMode ? (
              <div>
                <label htmlFor="edit-id" className="block text-[10px] text-zinc-500 dark:text-zinc-450 font-bold uppercase tracking-wider mb-1">
                  Plan ID
                </label>
                <Input
                  id="edit-id"
                  type="text"
                  value={editId}
                  onChange={(e) => setEditId(e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                  placeholder="e.g. PL-008"
                  className="h-8.5 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="edit-id" className="block text-[10px] text-zinc-500 dark:text-zinc-450 font-bold uppercase tracking-wider mb-1">
                  Plan ID
                </label>
                <Input
                  id="edit-id"
                  type="text"
                  value={editId}
                  disabled
                  className="h-8.5 text-xs bg-zinc-100/80 dark:bg-zinc-850/80 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-850 opacity-70 cursor-not-allowed"
                />
              </div>
            )}
            <div>
              <label htmlFor="edit-client-type" className="block text-[10px] text-zinc-500 dark:text-zinc-450 font-bold uppercase tracking-wider mb-1">
                Client Type
              </label>
              <select
                id="edit-client-type"
                value={editClientType}
                onChange={(e) => setEditClientType(e.target.value)}
                className="w-full h-8.5 px-2.5 border border-zinc-200/85 dark:border-zinc-850 rounded text-xs focus:outline-none focus:border-zinc-900 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-55"
              >
                <option value="CLIENT">Standard Client</option>
                <option value="ENTERPRISE">Enterprise Client</option>
                <option value="STUDENT">Student Starter</option>
                <option value="OTHER">Other / Custom</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 dark:text-zinc-450 font-bold uppercase tracking-wider mb-1">
              Plan Name
            </label>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-550 w-5">EN</span>
                <Input
                  type="text"
                  value={editName.en_US || ''}
                  onChange={(e) => setEditName({ ...editName, en_US: e.target.value })}
                  className="flex-1 h-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850"
                  placeholder="Plan name in English"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-550 w-5">ES</span>
                <Input
                  type="text"
                  value={editName.es_DO || ''}
                  onChange={(e) => setEditName({ ...editName, es_DO: e.target.value })}
                  className="flex-1 h-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850"
                  placeholder="Nombre del plan en Español"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="edit-price" className="block text-[10px] text-zinc-500 dark:text-zinc-450 font-bold uppercase tracking-wider mb-1">
              Monthly Price ($)
            </label>
            <Input
              id="edit-price"
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(parseInt(e.target.value) || 0)}
              className="h-8.5 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 dark:text-zinc-450 font-bold uppercase tracking-wider mb-1">
              Description
            </label>
            <div className="space-y-1.5">
              <div className="flex items-start gap-1.5">
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-555 w-5 mt-2">EN</span>
                <textarea
                  value={editDescription.en_US || ''}
                  onChange={(e) => setEditDescription({ ...editDescription, en_US: e.target.value })}
                  className="flex-1 min-h-[50px] p-2 rounded border border-zinc-200/85 dark:border-zinc-850 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-55 text-xs focus:outline-none focus:border-zinc-900"
                  placeholder="Description in English"
                />
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-555 w-5 mt-2">ES</span>
                <textarea
                  value={editDescription.es_DO || ''}
                  onChange={(e) => setEditDescription({ ...editDescription, es_DO: e.target.value })}
                  className="flex-1 min-h-[50px] p-2 rounded border border-zinc-200/85 dark:border-zinc-855 bg-white dark:bg-zinc-955 text-zinc-900 dark:text-zinc-55 text-xs focus:outline-none focus:border-zinc-900"
                  placeholder="Descripción en Español"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 py-1">
            <div className="flex items-center gap-1.5">
              <input
                id="edit-recommended"
                type="checkbox"
                checked={editRecommended}
                onChange={(e) => setEditRecommended(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
              />
              <label htmlFor="edit-recommended" className="text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none font-medium">
                Recommended Plan
              </label>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                id="edit-active"
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
              />
              <label htmlFor="edit-active" className="text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none font-medium">
                Active
              </label>
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
            <div className="flex justify-between items-center mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Features</h4>
              <button
                type="button"
                onClick={onAddFeature}
                className="text-[10px] text-zinc-900 dark:text-zinc-200 hover:underline flex items-center gap-0.5 cursor-pointer font-bold uppercase tracking-wider"
              >
                + Add Feature
              </button>
            </div>

            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {editFeatures.map((feat, index) => (
                <div
                  key={index}
                  draggable={true}
                  onDragStart={(e) => onDragStart(e, index)}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDrop={(e) => onDrop(e, index)}
                  onDragEnd={onDragEnd}
                  className={`group flex items-start gap-1.5 border rounded p-1.5 transition-all duration-200 ${
                    draggedIndex === index
                      ? 'opacity-40 bg-zinc-100 dark:bg-zinc-800'
                      : dragOverIndex === index
                        ? 'border-zinc-900 border-dashed bg-zinc-100/50 dark:bg-zinc-800/40'
                        : 'border-zinc-200/50 bg-zinc-50/10 dark:border-zinc-800/30'
                  }`}
                >
                  <div className="flex items-center gap-0.5 mt-1">
                    <div
                      className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-650 dark:text-zinc-600 dark:hover:text-zinc-400 transition-colors p-0.5"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => onMoveFeature(index, -1)}
                        className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-500 disabled:opacity-30 cursor-pointer"
                        title="Move up"
                      >
                        <ChevronUp className="h-2.5 w-2.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === editFeatures.length - 1}
                        onClick={() => onMoveFeature(index, 1)}
                        className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-500 disabled:opacity-30 cursor-pointer"
                        title="Move down"
                      >
                        <ChevronDown className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={feat.included}
                    onChange={(e) => onToggleFeatureIncluded(index, e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 focus:ring-zinc-900 cursor-pointer mt-1.5"
                  />
                  <div className="flex-1 space-y-1 mt-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 w-4">EN</span>
                      <Input
                        type="text"
                        value={(typeof feat.text === 'string' ? feat.text : feat.text?.en_US) || ''}
                        onChange={(e) => onEditFeatureText(index, 'en_US', e.target.value)}
                        className="flex-1 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 py-0.5 h-7 text-xs"
                        placeholder="Feature in English..."
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 w-4">ES</span>
                      <Input
                        type="text"
                        value={(typeof feat.text === 'string' ? feat.text : feat.text?.es_DO) || ''}
                        onChange={(e) => onEditFeatureText(index, 'es_DO', e.target.value)}
                        className="flex-1 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 py-0.5 h-7 text-xs"
                        placeholder="Característica en Español..."
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteFeature(index)}
                    className="p-1 hover:bg-red-500/10 text-red-650 dark:text-red-400 rounded transition-colors cursor-pointer mt-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2 bg-zinc-100/10 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 border border-zinc-200 hover:bg-zinc-100/50 dark:border-zinc-800 rounded text-xs font-semibold cursor-pointer text-zinc-700 dark:text-zinc-300"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saveLoading}
            className="px-4 py-1.5 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 rounded text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 disabled:opacity-50 cursor-pointer"
          >
            {saveLoading ? 'Saving...' : isCreateMode ? 'Create Plan' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
