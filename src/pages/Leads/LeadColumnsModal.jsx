import React, { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, Columns3, Lock, RotateCcw, Loader2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

// One draggable row. Only the grip handle starts a drag, so clicking the
// checkbox / label / arrows behaves normally.
function SortableColumnRow({ col, index, total, label, onToggle, onMove }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: col.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-2 py-2 text-sm bg-white ${isDragging ? "relative z-10 shadow-lg ring-1 ring-blue-200 rounded-md" : "hover:bg-gray-50"}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-grab active:cursor-grabbing touch-none"
        title="Drag to reorder"
        aria-label={`Drag ${label} to reorder`}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <input
        id={`lead-col-${col.key}`}
        type="checkbox"
        checked={col.visible}
        onChange={() => onToggle(col.key)}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
      />
      <label htmlFor={`lead-col-${col.key}`} className={`flex-1 cursor-pointer select-none ${col.visible ? "text-gray-800" : "text-gray-400"}`}>
        {label}
      </label>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          className="p-1 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
          title="Move up"
          aria-label={`Move ${label} up`}
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onMove(index, 1)}
          disabled={index === total - 1}
          className="p-1 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
          title="Move down"
          aria-label={`Move ${label} down`}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Admin-only picker for the Leads table columns. Works on a draft copy; only
// "Save" sends it to the backend, which then pushes it to every user.
export default function LeadColumnsModal({ open, onOpenChange, columns, getLabel, lockedLabels, onSave, onReset, saving }) {
  const [draft, setDraft] = useState(columns);

  // Fresh copy each time it opens (and if another Admin saved meanwhile).
  useEffect(() => {
    if (open) setDraft(columns);
  }, [open, columns]);

  const toggle = (key) =>
    setDraft((prev) => prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)));

  const move = (index, dir) =>
    setDraft((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const setAll = (visible) => setDraft((prev) => prev.map((c) => ({ ...c, visible })));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setDraft((prev) => {
      const from = prev.findIndex((c) => c.key === active.id);
      const to = prev.findIndex((c) => c.key === over.id);
      return from < 0 || to < 0 ? prev : arrayMove(prev, from, to);
    });
  };

  const visibleCount = draft.filter((c) => c.visible).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-800">
            <Columns3 className="w-5 h-5" />
            Table Columns
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500 -mt-1">
          Choose which columns show on the Leads table. Drag the handle (or use the arrows) to change the order. This applies to every user.
        </p>

        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
          <span>{visibleCount} of {draft.length} shown</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setAll(true)} className="text-blue-600 hover:underline">Show all</button>
            <button type="button" onClick={() => setAll(false)} className="text-blue-600 hover:underline">Hide all</button>
          </div>
        </div>

        <div className="mt-1 max-h-[55vh] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
          {lockedLabels.map((label) => (
            <div key={label} className="flex items-center gap-3 px-3 py-2 bg-gray-50 text-sm text-gray-500">
              <Lock className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              <span className="text-xs">Always shown</span>
            </div>
          ))}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={draft.map((c) => c.key)} strategy={verticalListSortingStrategy}>
              {draft.map((col, index) => (
                <SortableColumnRow
                  key={col.key}
                  col={col}
                  index={index}
                  total={draft.length}
                  label={getLabel(col.key)}
                  onToggle={toggle}
                  onMove={move}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={onReset}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" /> Reset to default
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(draft)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
