import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCrudModal } from '../../hooks/useCrudModal';
import { useCrudMutations } from '../../hooks/useCrudMutations';
import {
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  BookOpen,
} from 'lucide-react';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../api/categories';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

/* ------------------------------------------------------------------ */
/*  Zod schema                                                        */
/* ------------------------------------------------------------------ */
const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be 50 characters or fewer'),
  icon: z.string().min(1, 'Icon name is required').max(30, 'Icon name must be 30 characters or fewer'),
});

/* ------------------------------------------------------------------ */
/*  Category Form (used inside Modal)                                  */
/* ------------------------------------------------------------------ */
function CategoryForm({ defaultValues, onSubmit, loading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: defaultValues || { name: '', icon: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Category Name"
        placeholder="e.g. Quran Studies"
        error={errors.name?.message}
        {...register('name')}
      />
      <Input
        label="Icon Name"
        placeholder="e.g. book-open (lucide icon name)"
        error={errors.icon?.message}
        {...register('icon')}
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {defaultValues ? 'Save Changes' : 'Create Category'}
        </Button>
      </div>
    </form>
  );
}

/* ================================================================== */
/*  CategoriesPage                                                     */
/* ================================================================== */
export default function CategoriesPage() {
  /* ---- State ---- */
  const { modalOpen, editing, openCreate, openEdit, closeModal } = useCrudModal();
  const [deleteTarget, setDeleteTarget] = useState(null);

  /* ---- Queries ---- */
  const {
    data: categories,
    isLoading,
    isError,
  } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  /* ---- Mutations ---- */
  const { createMutation, updateMutation, deleteMutation } = useCrudMutations({
    queryKey: ['categories'],
    createFn: createCategory,
    createMsg: 'Category created successfully',
    onCreateSuccess: closeModal,
    updateFn: ({ id, data }) => updateCategory(id, data),
    updateMsg: 'Category updated successfully',
    onUpdateSuccess: closeModal,
    deleteFn: deleteCategory,
    deleteMsg: 'Category deleted successfully',
    onDeleteSuccess: () => setDeleteTarget(null),
  });

  /* ---- Handlers ---- */
  const handleFormSubmit = (data) => {
    if (editing) {
      updateMutation.mutate({ id: editing.uuid, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.uuid);
    }
  };

  /* ---- Loading state ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  /* ---- Error state ---- */
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-danger font-medium text-lg">Failed to load categories</p>
        <p className="text-text-secondary mt-1 text-sm">
          Please check your connection and try refreshing the page.
        </p>
      </div>
    );
  }

  const categoryList = Array.isArray(categories) ? categories : categories?.data || [];

  return (
    <div>
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Categories</h1>
          <p className="text-text-secondary mt-1">Organize and manage content categories</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {/* ---- Category Grid ---- */}
      {categoryList.length === 0 ? (
        <div className="mt-6 bg-white rounded-xl border border-surface-border p-12 text-center">
          <FolderOpen className="w-12 h-12 text-text-muted mx-auto" />
          <p className="mt-3 text-text-muted text-sm">No categories yet. Create your first category to get started.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categoryList.map((cat) => (
            <div
              key={cat.uuid}
              className="bg-white rounded-xl border border-surface-border p-5 hover:shadow-md transition-shadow"
            >
              {/* Icon + Name */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-text-primary truncate">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {cat.courses_count ?? 0} course{(cat.courses_count ?? 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Icon name label */}
              <p className="mt-3 text-xs text-text-muted">
                Icon: <span className="font-mono text-text-secondary">{cat.icon}</span>
              </p>

              {/* Actions */}
              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openEdit(cat)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:bg-danger/5"
                  onClick={() => setDeleteTarget(cat)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Create / Edit Modal ---- */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Category' : 'Add Category'}
        size="sm"
      >
        <CategoryForm
          key={editing?.uuid || 'new'}
          defaultValues={editing ? { name: editing.name, icon: editing.icon } : null}
          onSubmit={handleFormSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>

      {/* ---- Delete Confirm ---- */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
