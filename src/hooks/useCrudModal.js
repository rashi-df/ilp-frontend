import { useState } from 'react';

/**
 * Manages open/close state for a create-or-edit modal.
 * Returns: modalOpen, editing (null = create, object = edit),
 *          openCreate, openEdit(item), closeModal.
 */
export function useCrudModal() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (item) => { setEditing(item); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  return { modalOpen, editing, openCreate, openEdit, closeModal };
}
