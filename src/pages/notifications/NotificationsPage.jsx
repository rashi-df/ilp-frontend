import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Bell,
  Send,
  Clock,
  Pencil,
  Trash2,
  Users,
  Eye,
} from 'lucide-react';
import {
  getNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  sendNotification,
} from '../../api/notifications';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import SearchBar from '../../components/ui/SearchBar';
import Pagination from '../../components/ui/Pagination';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'students', label: 'Students Only' },
  { value: 'mentors', label: 'Mentors Only' },
  { value: 'premium', label: 'Premium Members' },
  { value: 'basic', label: 'Basic Members' },
  { value: 'inactive', label: 'Inactive Users' },
  { value: 'course_specific', label: 'Course Specific' },
];

const AUDIENCE_LABELS = {
  all: 'All Users',
  students: 'Students',
  mentors: 'Mentors',
  premium: 'Premium',
  basic: 'Basic',
  inactive: 'Inactive',
  course_specific: 'Course Specific',
};

const STATUS_BADGE_VARIANT = {
  draft: 'default',
  scheduled: 'warning',
  sent: 'success',
  failed: 'danger',
};

const SEND_OPTIONS = [
  { value: 'now', label: 'Send Now' },
  { value: 'schedule', label: 'Schedule for Later' },
];

/* ------------------------------------------------------------------ */
/*  Zod schema                                                         */
/* ------------------------------------------------------------------ */
const notificationSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer'),
    message: z.string().min(1, 'Message is required').max(2000, 'Message must be 2000 characters or fewer'),
    targetAudience: z.enum(['all', 'students', 'mentors', 'premium', 'basic', 'inactive', 'course_specific']),
    targetCourse: z.string().optional().nullable(),
    sendOption: z.enum(['now', 'schedule']),
    scheduledAt: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.sendOption === 'schedule' && !data.scheduledAt) return false;
      return true;
    },
    { message: 'Scheduled date is required', path: ['scheduledAt'] }
  );

/* ------------------------------------------------------------------ */
/*  Helper: format date                                                */
/* ------------------------------------------------------------------ */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ================================================================== */
/*  NotificationsPage                                                  */
/* ================================================================== */
export default function NotificationsPage() {
  const queryClient = useQueryClient();

  /* ---- State ---- */
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  /* ---- Queries ---- */
  const {
    data: notificationsData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['notifications', { page, search }],
    queryFn: () => getNotifications({ page, limit: 10, search }),
    keepPreviousData: true,
  });

  const notifications = notificationsData?.data || [];
  const totalPages = notificationsData?.pagination?.pages || 1;

  /* ---- Compose form ---- */
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: '',
      message: '',
      targetAudience: 'all',
      targetCourse: '',
      sendOption: 'now',
      scheduledAt: '',
    },
  });

  const watchedAudience = watch('targetAudience');
  const watchedSendOption = watch('sendOption');
  const watchedTitle = watch('title');
  const watchedMessage = watch('message');

  /* ---- Edit form ---- */
  const {
    register: editRegister,
    handleSubmit: editHandleSubmit,
    watch: editWatch,
    reset: editReset,
    formState: { errors: editErrors },
  } = useForm({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: '',
      message: '',
      targetAudience: 'all',
      targetCourse: '',
      sendOption: 'now',
      scheduledAt: '',
    },
  });

  const editWatchedAudience = editWatch('targetAudience');
  const editWatchedSendOption = editWatch('sendOption');

  /* ---- Mutations ---- */
  const createMutation = useMutation({
    mutationFn: createNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification created successfully');
      reset();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create notification');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ uuid, data }) => updateNotification(uuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification updated successfully');
      closeEditModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update notification');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted successfully');
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete notification');
    },
  });

  const sendMutation = useMutation({
    mutationFn: sendNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification sent successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to send notification');
    },
  });

  /* ---- Handlers ---- */
  const onComposeSubmit = (data) => {
    const payload = {
      title: data.title,
      message: data.message,
      targetAudience: data.targetAudience,
      targetCourse: data.targetAudience === 'course_specific' ? data.targetCourse : null,
      scheduledAt: data.sendOption === 'schedule' ? data.scheduledAt : null,
    };
    createMutation.mutate(payload);
  };

  const openEditModal = (notification) => {
    setEditTarget(notification);
    editReset({
      title: notification.title,
      message: notification.message,
      targetAudience: notification.targetAudience,
      targetCourse: notification.targetCourse || '',
      sendOption: notification.scheduledAt ? 'schedule' : 'now',
      scheduledAt: notification.scheduledAt
        ? new Date(notification.scheduledAt).toISOString().slice(0, 16)
        : '',
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditTarget(null);
  };

  const onEditSubmit = (data) => {
    if (!editTarget) return;
    const payload = {
      title: data.title,
      message: data.message,
      targetAudience: data.targetAudience,
      targetCourse: data.targetAudience === 'course_specific' ? data.targetCourse : null,
      scheduledAt: data.sendOption === 'schedule' ? data.scheduledAt : null,
    };
    updateMutation.mutate({ uuid: editTarget.uuid, data: payload });
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.uuid);
    }
  };

  const handleSendNow = (uuid) => {
    sendMutation.mutate(uuid);
  };

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const canModify = (status) => status === 'draft' || status === 'scheduled';

  return (
    <div>
      {/* ---- Header ---- */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
        <p className="text-text-secondary mt-1">Send and manage user notifications</p>
      </div>

      {/* ---- Grid Layout ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ======== Left: Compose ======== */}
        <div className="lg:col-span-2 space-y-6">
          {/* Compose Card */}
          <div className="bg-white rounded-xl border border-surface-border p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Compose Notification</h2>
            </div>

            <form onSubmit={handleSubmit(onComposeSubmit)} className="space-y-4">
              {/* Title */}
              <Input
                label="Title"
                placeholder="Notification title"
                error={errors.title?.message}
                {...register('title')}
              />

              {/* Message */}
              <div className="w-full">
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Message
                </label>
                <textarea
                  placeholder="Write your notification message..."
                  rows={4}
                  className={`w-full rounded-lg border bg-surface text-text-primary placeholder:text-text-muted
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                    disabled:opacity-50 disabled:cursor-not-allowed
                    pl-3 pr-3 py-2 text-sm resize-none
                    ${errors.message ? 'border-danger' : 'border-surface-border'}`}
                  {...register('message')}
                />
                {errors.message && (
                  <p className="mt-1 text-xs text-danger">{errors.message.message}</p>
                )}
              </div>

              {/* Target Audience */}
              <Select
                label="Target Audience"
                options={AUDIENCE_OPTIONS}
                error={errors.targetAudience?.message}
                {...register('targetAudience')}
              />

              {/* Course UUID (conditional) */}
              {watchedAudience === 'course_specific' && (
                <Input
                  label="Course UUID"
                  placeholder="Enter the course UUID"
                  error={errors.targetCourse?.message}
                  {...register('targetCourse')}
                />
              )}

              {/* Send Option */}
              <Select
                label="Send Option"
                options={SEND_OPTIONS}
                error={errors.sendOption?.message}
                {...register('sendOption')}
              />

              {/* Schedule DateTime (conditional) */}
              {watchedSendOption === 'schedule' && (
                <div className="w-full">
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Schedule Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    className={`w-full rounded-lg border bg-surface text-text-primary
                      focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                      disabled:opacity-50 disabled:cursor-not-allowed
                      pl-3 pr-3 py-2 text-sm
                      ${errors.scheduledAt ? 'border-danger' : 'border-surface-border'}`}
                    {...register('scheduledAt')}
                  />
                  {errors.scheduledAt && (
                    <p className="mt-1 text-xs text-danger">{errors.scheduledAt.message}</p>
                  )}
                </div>
              )}

              {/* Submit */}
              <div className="pt-2">
                <Button
                  type="submit"
                  loading={createMutation.isPending}
                  className="w-full"
                >
                  {watchedSendOption === 'schedule' ? (
                    <>
                      <Clock className="w-4 h-4" />
                      Schedule Notification
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Notification
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Preview Card */}
          {(watchedTitle || watchedMessage) && (
            <div className="bg-white rounded-xl border border-surface-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-4 h-4 text-text-muted" />
                <h3 className="text-sm font-medium text-text-secondary">Preview</h3>
              </div>
              <div className="bg-surface-alt rounded-lg p-4">
                <h4 className="font-semibold text-text-primary text-sm">
                  {watchedTitle || 'Notification title'}
                </h4>
                <p className="text-text-secondary text-sm mt-1 whitespace-pre-wrap">
                  {watchedMessage || 'Your message will appear here...'}
                </p>
                <div className="mt-3">
                  <Badge variant="info">
                    <Users className="w-3 h-3 mr-1" />
                    {AUDIENCE_LABELS[watchedAudience] || 'All Users'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ======== Right: History ======== */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-surface-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Notification History</h2>
            </div>

            {/* Search */}
            <div className="mb-4">
              <SearchBar
                value={search}
                onChange={handleSearch}
                placeholder="Search notifications..."
              />
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center h-48">
                <Spinner size="lg" />
              </div>
            )}

            {/* Error */}
            {isError && (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <p className="text-danger font-medium">Failed to load notifications</p>
                <p className="text-text-secondary mt-1 text-sm">
                  Please check your connection and try refreshing.
                </p>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !isError && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <Bell className="w-10 h-10 text-text-muted" />
                <p className="mt-3 text-text-muted text-sm">
                  No notifications found. Compose your first notification to get started.
                </p>
              </div>
            )}

            {/* Notification list */}
            {!isLoading && !isError && notifications.length > 0 && (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.uuid}
                    className="border border-surface-border rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-text-primary truncate">
                          {n.title}
                        </h4>
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                      <Badge variant={STATUS_BADGE_VARIANT[n.status] || 'default'}>
                        {n.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <Badge variant="info">
                        {AUDIENCE_LABELS[n.targetAudience] || n.targetAudience}
                      </Badge>
                      {n.recipientCount > 0 && (
                        <span className="text-xs text-text-muted">
                          {n.recipientCount} recipient{n.recipientCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="text-xs text-text-muted">
                        {n.sentAt
                          ? `Sent ${formatDate(n.sentAt)}`
                          : n.scheduledAt
                            ? `Scheduled ${formatDate(n.scheduledAt)}`
                            : `Created ${formatDate(n.createdAt)}`}
                      </span>
                    </div>

                    {/* Actions */}
                    {canModify(n.status) && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-border">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditModal(n)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendNow(n.uuid)}
                          loading={sendMutation.isPending}
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send Now
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger/5 ml-auto"
                          onClick={() => setDeleteTarget(n)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && !isError && totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Edit Modal ---- */}
      <Modal
        isOpen={editModalOpen}
        onClose={closeEditModal}
        title="Edit Notification"
        size="md"
      >
        <form onSubmit={editHandleSubmit(onEditSubmit)} className="space-y-4">
          <Input
            label="Title"
            placeholder="Notification title"
            error={editErrors.title?.message}
            {...editRegister('title')}
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Message
            </label>
            <textarea
              placeholder="Write your notification message..."
              rows={4}
              className={`w-full rounded-lg border bg-surface text-text-primary placeholder:text-text-muted
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                disabled:opacity-50 disabled:cursor-not-allowed
                pl-3 pr-3 py-2 text-sm resize-none
                ${editErrors.message ? 'border-danger' : 'border-surface-border'}`}
              {...editRegister('message')}
            />
            {editErrors.message && (
              <p className="mt-1 text-xs text-danger">{editErrors.message.message}</p>
            )}
          </div>

          <Select
            label="Target Audience"
            options={AUDIENCE_OPTIONS}
            error={editErrors.targetAudience?.message}
            {...editRegister('targetAudience')}
          />

          {editWatchedAudience === 'course_specific' && (
            <Input
              label="Course UUID"
              placeholder="Enter the course UUID"
              error={editErrors.targetCourse?.message}
              {...editRegister('targetCourse')}
            />
          )}

          <Select
            label="Send Option"
            options={SEND_OPTIONS}
            error={editErrors.sendOption?.message}
            {...editRegister('sendOption')}
          />

          {editWatchedSendOption === 'schedule' && (
            <div className="w-full">
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Schedule Date & Time
              </label>
              <input
                type="datetime-local"
                className={`w-full rounded-lg border bg-surface text-text-primary
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                  disabled:opacity-50 disabled:cursor-not-allowed
                  pl-3 pr-3 py-2 text-sm
                  ${editErrors.scheduledAt ? 'border-danger' : 'border-surface-border'}`}
                {...editRegister('scheduledAt')}
              />
              {editErrors.scheduledAt && (
                <p className="mt-1 text-xs text-danger">{editErrors.scheduledAt.message}</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={closeEditModal}>
              Cancel
            </Button>
            <Button type="submit" loading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ---- Delete Confirm ---- */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Notification"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
