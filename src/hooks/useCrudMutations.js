import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const errMsg = (err) =>
  err.response?.data?.message || err.response?.data?.error || 'Operation failed';

/**
 * Factory for the standard create/update/delete mutation trio.
 *
 * Each operation automatically:
 *   - Invalidates the provided queryKey on success
 *   - Shows a toast on success and on error
 *   - Calls an optional onSuccess callback
 *
 * Usage:
 *   const { createMutation, updateMutation, deleteMutation } = useCrudMutations({
 *     queryKey: ['categories'],
 *     createFn: createCategory,
 *     createMsg: 'Category created successfully',
 *     onCreateSuccess: closeModal,
 *     updateFn: ({ id, data }) => updateCategory(id, data),
 *     updateMsg: 'Category updated successfully',
 *     onUpdateSuccess: closeModal,
 *     deleteFn: deleteCategory,
 *     deleteMsg: 'Category deleted successfully',
 *     onDeleteSuccess: () => setDeleteTarget(null),
 *   });
 */
export function useCrudMutations({
  queryKey,
  createFn,
  createMsg = 'Created successfully',
  onCreateSuccess,
  updateFn,
  updateMsg = 'Updated successfully',
  onUpdateSuccess,
  deleteFn,
  deleteMsg = 'Deleted successfully',
  onDeleteSuccess,
}) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => { invalidate(); toast.success(createMsg); onCreateSuccess?.(); },
    onError: (err) => toast.error(errMsg(err)),
  });

  const updateMutation = useMutation({
    mutationFn: updateFn,
    onSuccess: () => { invalidate(); toast.success(updateMsg); onUpdateSuccess?.(); },
    onError: (err) => toast.error(errMsg(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => { invalidate(); toast.success(deleteMsg); onDeleteSuccess?.(); },
    onError: (err) => toast.error(errMsg(err)),
  });

  return { createMutation, updateMutation, deleteMutation };
}
