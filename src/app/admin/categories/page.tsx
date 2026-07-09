"use client";

import { useEffect, useState } from "react";
import { Plus, ChevronDown, ChevronLeft, Edit, Trash2, FolderOpen, GripVertical, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Modal } from "@/components/admin/Modal";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Category = { id: number; slug: string; title: string; parentId: number | null; sortOrder: number; productCount: number; children?: Category[]; };

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [parentId, setParentId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", description: "", sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = () => {
    setLoading(true);
    fetch("/api/categories").then(r => r.json()).then(d => {
      const map = new Map<number, Category>();
      d.forEach((c: any) => map.set(c.id, { ...c, children: [] }));
      const roots: Category[] = [];
      d.forEach((c: any) => { if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.children!.push(map.get(c.id)!); else roots.push(map.get(c.id)!); });
      setItems(roots);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  function flatten(items: Category[]): Category[] {
    const result: Category[] = [];
    for (const item of items) { result.push(item); if (item.children) result.push(...flatten(item.children)); }
    return result;
  }

  function openAdd(parent: number | null = null) {
    setEditingId(null); setParentId(parent);
    setForm({ title: "", slug: "", description: "", sortOrder: 0 });
    setShowModal(true);
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id); setParentId(cat.parentId);
    setForm({ title: cat.title, slug: cat.slug, description: "", sortOrder: cat.sortOrder });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title) { toast.error("عنوان الزامی است"); return; }
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, parentId }) });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "خطا");
      toast.success(editingId ? "دسته ویرایش شد ✓" : "دسته ساخته شد ✓");
      setShowModal(false); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("آیا از حذف این دسته مطمئن هستید؟ زیردسته‌ها به سطح بالاتر منتقل می‌شوند.")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.ok) { toast.success("حذف شد"); load(); } else toast.error(d.error);
  }

  async function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const flat = flatten(items);
    const oldIndex = flat.findIndex(i => i.id === active.id);
    const newIndex = flat.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...flat];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    const updatedOrders = reordered.map((item, idx) => ({ id: item.id, sortOrder: idx }));
    setItems(rebuildTree(reordered));
    await fetch("/api/admin/categories/reorder", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: updatedOrders }) });
  }

  const allFlat = flatten(items);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-black text-slate-900">مدیریت دسته‌بندی‌ها</h1><p className="mt-1 text-sm text-slate-500">برای تغییر ترتیب، دسته‌ها را بکشید</p></div>
        <button onClick={() => openAdd(null)} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-md"><Plus className="size-4" /> دسته اصلی جدید</button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="size-6 animate-spin rounded-full border-4 border-petrol-600 border-t-transparent" /></div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={allFlat.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {items.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">هیچ دسته‌بندی وجود ندارد. اولین دسته را ایجاد کنید.</div>
              ) : items.map(cat => <SortableCategoryNode key={cat.id} category={cat} depth={0} allFlat={allFlat} onEdit={openEdit} onAdd={openAdd} onDelete={handleDelete} />)}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editingId ? "ویرایش دسته" : parentId ? "زیردسته جدید" : "دسته اصلی جدید"}
        footer={<>
          <button onClick={() => setShowModal(false)} className="rounded-xl border border-slate-200 px-6 py-2.5 text-xs font-semibold text-slate-600">انصراف</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-2.5 text-xs font-semibold text-white shadow-md disabled:opacity-50">
            <Save className="size-4" /> {saving ? "در حال ذخیره..." : "ذخیره"}
          </button>
        </>}
      >
        <div className="space-y-4">
          <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">نام دسته *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: e.target.value.replace(/\s+/g, "-").replace(/[^آ-یa-z0-9-]/gi, "").toLowerCase() }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">Slug</label><input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none" /></div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">دسته والد</label>
            <select value={parentId || 0} onChange={e => setParentId(Number(e.target.value) || null)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none">
              <option value={0}>دسته اصلی (بدون والد)</option>
              {allFlat.filter(c => c.id !== editingId).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">ترتیب نمایش</label><input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none" /></div>
          <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">توضیحات</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none" /></div>
        </div>
      </Modal>
    </div>
  );
}

function SortableCategoryNode({ category, depth, allFlat, onEdit, onAdd, onDelete }: { category: Category; depth: number; allFlat: Category[]; onEdit: (c: Category) => void; onAdd: (parentId: number | null) => void; onDelete: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50", depth > 0 && "mt-1")} style={{ marginRight: depth * 24 }}>
        <button {...attributes} {...listeners} className="cursor-grab rounded-lg p-1 text-slate-300 hover:text-slate-500"><GripVertical className="size-4" /></button>
        <button onClick={() => setExpanded(!expanded)} className={cn("flex size-5 items-center justify-center rounded text-slate-400", !hasChildren && "invisible")}>
          {expanded ? <ChevronDown className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
        <FolderOpen className="size-4 text-slate-400" />
        <div className="flex-1"><p className="text-sm font-semibold text-slate-900">{category.title}</p><p className="text-[10px] text-slate-500">/{category.slug}</p></div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{category.productCount} محصول</span>
        <button onClick={() => onAdd(category.id)} className="rounded-lg p-1.5 text-emerald-500 hover:bg-emerald-50" title="افزودن زیردسته"><Plus className="size-4" /></button>
        <button onClick={() => onEdit(category)} className="rounded-lg p-1.5 text-slate-400 hover:text-petrol-600 hover:bg-slate-100" title="ویرایش"><Edit className="size-4" /></button>
        <button onClick={() => onDelete(category.id)} className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50" title="حذف"><Trash2 className="size-4" /></button>
      </div>
      {hasChildren && expanded && <div className="mr-3 border-r-2 border-slate-100 pr-2">{category.children!.map(child => <SortableCategoryNode key={child.id} category={child} depth={depth + 1} allFlat={allFlat} onEdit={onEdit} onAdd={onAdd} onDelete={onDelete} />)}</div>}
    </div>
  );
}

function rebuildTree(flat: Category[]): Category[] {
  const map = new Map<number, Category>();
  flat.forEach(c => map.set(c.id, { ...c, children: [] }));
  const roots: Category[] = [];
  flat.forEach(c => { if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.children!.push(map.get(c.id)!); else roots.push(map.get(c.id)!); });
  return roots;
}
