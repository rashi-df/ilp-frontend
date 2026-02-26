import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, ClipboardCheck } from 'lucide-react';
import {
  getHomeworkList,
  createHomework,
  updateHomework,
  deleteHomework,
  getSubmissions,
  reviewSubmission,
} from '../../api/homework';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import SearchBar from '../../components/ui/SearchBar';
import TabGroup from '../../components/ui/TabGroup';
import Pagination from '../../components/ui/Pagination';
import DataTable from '../../components/ui/DataTable';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Textarea from '../../components/ui/Textarea';
import Spinner from '../../components/ui/Spinner';

/* ------------------------------------------------------------------ */
/*  Zod schemas                                                        */
/* ------------------------------------------------------------------ */
const homeworkSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  instructions: z.string().min(1, 'Instructions are required'),
  submissionType: z.enum(['text', 'file', 'audio', 'video']).default('text'),
  courseUuid: z.string().optional().default(''),
  lessonUuid: z.string().optional().default(''),
  dueDate: z.string().optional().default(''),
  maxScore: z.coerce.number().min(0).default(100),
  status: z.enum(['draft', 'published']).default('draft'),
});

const reviewSchema = z.object({
  feedback: z.string().min(1, 'Feedback is required'),
  grade: z.coerce.number().min(0, 'Grade must be at least 0'),
});

/* ------------------------------------------------------------------ */
/*  Homework Form (used inside Modal)                                  */
/* ------------------------------------------------------------------ */
function HomeworkForm({ defaultValues, onSubmit, loading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(homeworkSchema),
    defaultValues: defaultValues || {
      title: '',
      instructions: '',
      submissionType: 'text',
      courseUuid: '',
      lessonUuid: '',
      dueDate: '',
      maxScore: 100,
      status: 'draft',
    },
  });

  const submissionTypeOptions = [
    { value: 'text', label: 'Text' },
    { value: 'file', label: 'File' },
    { value: 'audio', label: 'Audio' },
    { value: 'video', label: 'Video' },
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Title"
        placeholder="e.g. Surah Al-Fatiha Recitation"
        error={errors.title?.message}
        {...register('title')}
      />
      <Textarea
        label="Instructions"
        rows={3}
        placeholder="Describe what the student should submit..."
        error={errors.instructions?.message}
        {...register('instructions')}
      />
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Submission Type"
          options={submissionTypeOptions}
          error={errors.submissionType?.message}
          {...register('submissionType')}
        />
        <Select
          label="Status"
          options={statusOptions}
          error={errors.status?.message}
          {...register('status')}
        />
      </div>
      <Input
        label="Course UUID"
        placeholder="Enter course UUID (optional)"
        error={errors.courseUuid?.message}
        {...register('courseUuid')}
      />
      <Input
        label="Lesson UUID"
        placeholder="Enter lesson UUID (optional)"
        error={errors.lessonUuid?.message}
        {...register('lessonUuid')}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Due Date"
          type="date"
          error={errors.dueDate?.message}
          {...register('dueDate')}
        />
        <Input
          label="Max Score"
          type="number"
          placeholder="100"
          error={errors.maxScore?.message}
          {...register('maxScore')}
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {defaultValues ? 'Save Changes' : 'Create Homework'}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Review Form (used inside Modal)                                    */
/* ------------------------------------------------------------------ */
function ReviewForm({ submission, onSubmit, loading }) {
  const maxScore = submission?.homework?.maxScore || 100;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(
      reviewSchema.refine((data) => data.grade <= maxScore, {
        message: `Grade cannot exceed ${maxScore}`,
        path: ['grade'],
      })
    ),
    defaultValues: {
      feedback: submission?.feedback || '',
      grade: submission?.grade ?? 0,
    },
  });

  if (!submission) return null;

  return (
    <div className="space-y-4">
      {/* Read-only info */}
      <div className="bg-surface-alt rounded-lg p-4 space-y-2 text-sm">
        <div>
          <span className="font-medium text-text-primary">Student: </span>
          <span className="text-text-secondary">
            {submission.studentName || submission.student?.name || 'N/A'}
          </span>
        </div>
        <div>
          <span className="font-medium text-text-primary">Homework: </span>
          <span className="text-text-secondary">
            {submission.homework?.title || 'N/A'}
          </span>
        </div>
        <div>
          <span className="font-medium text-text-primary">Submitted: </span>
          <span className="text-text-secondary">
            {submission.submittedAt
              ? new Date(submission.submittedAt).toLocaleDateString()
              : 'N/A'}
          </span>
        </div>
        {submission.content && (
          <div>
            <span className="font-medium text-text-primary">Content: </span>
            <p className="text-text-secondary mt-1 whitespace-pre-wrap">
              {submission.content}
            </p>
          </div>
        )}
        {submission.fileUrl && (
          <div>
            <span className="font-medium text-text-primary">File: </span>
            <a
              href={submission.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              {submission.fileUrl}
            </a>
          </div>
        )}
      </div>

      {/* Review form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Textarea
          label="Feedback"
          rows={4}
          placeholder="Provide feedback for the student..."
          error={errors.feedback?.message}
          {...register('feedback')}
        />
        <Input
          label={`Grade (0 - ${maxScore})`}
          type="number"
          min={0}
          max={maxScore}
          placeholder="0"
          error={errors.grade?.message}
          {...register('grade')}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" loading={loading}>
            Submit Review
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ================================================================== */
/*  Helper maps                                                        */
/* ================================================================== */
const statusVariant = {
  published: 'success',
  draft: 'default',
};

const submissionStatusVariant = {
  pending: 'warning',
  under_review: 'info',
  reviewed: 'success',
  returned: 'danger',
};

const submissionStatusLabel = {
  pending: 'Pending',
  under_review: 'Under Review',
  reviewed: 'Reviewed',
  returned: 'Returned',
};

/* ================================================================== */
/*  HomeworkPage                                                        */
/* ================================================================== */
export default function HomeworkPage() {
  const queryClient = useQueryClient();

  /* ---- Tab state ---- */
  const [activeTab, setActiveTab] = useState('homework');

  /* ---- Homework state ---- */
  const [hwModalOpen, setHwModalOpen] = useState(false);
  const [hwEditing, setHwEditing] = useState(null);
  const [hwDeleteTarget, setHwDeleteTarget] = useState(null);
  const [hwPage, setHwPage] = useState(1);
  const [hwSearch, setHwSearch] = useState('');
  const [hwFilterStatus, setHwFilterStatus] = useState('');

  /* ---- Submissions state ---- */
  const [subPage, setSubPage] = useState(1);
  const [subFilterStatus, setSubFilterStatus] = useState('');
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  /* ---- Tabs config ---- */
  const tabs = [
    { key: 'homework', label: 'Homework Tasks' },
    { key: 'submissions', label: 'Submissions' },
  ];

  /* ================================================================ */
  /*  Homework Tab — Queries & Mutations                               */
  /* ================================================================ */
  const {
    data: hwResponse,
    isLoading: hwLoading,
    isError: hwError,
  } = useQuery({
    queryKey: ['homework', { page: hwPage, search: hwSearch, status: hwFilterStatus }],
    queryFn: () =>
      getHomeworkList({
        page: hwPage,
        limit: 10,
        search: hwSearch || undefined,
        status: hwFilterStatus || undefined,
      }),
    enabled: activeTab === 'homework',
  });

  const homeworks = hwResponse?.data || [];
  const hwTotalPages = hwResponse?.pagination?.pages || 1;

  const createMutation = useMutation({
    mutationFn: createHomework,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      toast.success('Homework created successfully');
      closeHwModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create homework');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ uuid, data }) => updateHomework(uuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      toast.success('Homework updated successfully');
      closeHwModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update homework');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHomework,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      toast.success('Homework deleted successfully');
      setHwDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete homework');
    },
  });

  /* ---- Homework handlers ---- */
  const openHwCreate = () => {
    setHwEditing(null);
    setHwModalOpen(true);
  };

  const openHwEdit = (hw) => {
    setHwEditing(hw);
    setHwModalOpen(true);
  };

  const closeHwModal = () => {
    setHwModalOpen(false);
    setHwEditing(null);
  };

  const handleHwFormSubmit = (data) => {
    // Convert empty dueDate string to null
    const payload = { ...data, dueDate: data.dueDate || null };
    if (hwEditing) {
      updateMutation.mutate({ uuid: hwEditing.uuid, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleHwDelete = () => {
    if (hwDeleteTarget) {
      deleteMutation.mutate(hwDeleteTarget.uuid);
    }
  };

  const handleHwSearch = (value) => {
    setHwSearch(value);
    setHwPage(1);
  };

  /* ---- Homework table columns ---- */
  const hwColumns = [
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <span className="font-medium">{row.title}</span>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      render: (row) => row.course?.title || '-',
    },
    {
      key: 'submissionType',
      header: 'Type',
      render: (row) => (
        <Badge variant="info">{row.submissionType}</Badge>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (row) =>
        row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={statusVariant[row.status]}>{row.status}</Badge>
      ),
    },
    {
      key: 'submissionCount',
      header: 'Submissions',
      render: (row) => row.submissionCount ?? 0,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openHwEdit(row)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger/5"
            onClick={() => setHwDeleteTarget(row)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  /* ================================================================ */
  /*  Submissions Tab — Queries & Mutations                            */
  /* ================================================================ */
  const {
    data: subResponse,
    isLoading: subLoading,
    isError: subError,
  } = useQuery({
    queryKey: ['submissions', { page: subPage, status: subFilterStatus }],
    queryFn: () =>
      getSubmissions({
        page: subPage,
        limit: 10,
        status: subFilterStatus || undefined,
      }),
    enabled: activeTab === 'submissions',
  });

  const submissions = subResponse?.data || [];
  const subTotalPages = subResponse?.pagination?.pages || 1;

  const reviewMutation = useMutation({
    mutationFn: ({ uuid, data }) => reviewSubmission(uuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      toast.success('Review submitted successfully');
      closeReviewModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to submit review');
    },
  });

  /* ---- Submission handlers ---- */
  const openReview = (submission) => {
    setReviewTarget(submission);
    setReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setReviewModalOpen(false);
    setReviewTarget(null);
  };

  const handleReviewSubmit = (data) => {
    if (reviewTarget) {
      reviewMutation.mutate({ uuid: reviewTarget.uuid, data });
    }
  };

  /* ---- Submission filter options ---- */
  const subStatusFilterOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'returned', label: 'Returned' },
  ];

  /* ---- Submission table columns ---- */
  const subColumns = [
    {
      key: 'studentName',
      header: 'Student Name',
      render: (row) => row.studentName || row.student?.name || 'N/A',
    },
    {
      key: 'homeworkTitle',
      header: 'Homework Title',
      render: (row) => row.homework?.title || 'N/A',
    },
    {
      key: 'submittedAt',
      header: 'Submitted At',
      render: (row) =>
        row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={submissionStatusVariant[row.status]}>
          {submissionStatusLabel[row.status] || row.status}
        </Badge>
      ),
    },
    {
      key: 'grade',
      header: 'Grade',
      render: (row) =>
        row.grade !== null && row.grade !== undefined
          ? `${row.grade}/${row.homework?.maxScore || 100}`
          : '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <Button variant="secondary" size="sm" onClick={() => openReview(row)}>
          <ClipboardCheck className="w-3.5 h-3.5" />
          Review
        </Button>
      ),
    },
  ];

  /* ---- Homework status filter options ---- */
  const hwStatusFilterOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
  ];

  /* ================================================================ */
  /*  Render                                                            */
  /* ================================================================ */
  return (
    <div>
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Homework</h1>
          <p className="text-text-secondary mt-1">Assign and review student homework</p>
        </div>
        {activeTab === 'homework' && (
          <Button onClick={openHwCreate}>
            <Plus className="w-4 h-4" />
            Create Homework
          </Button>
        )}
      </div>

      {/* ---- Tabs ---- */}
      <div className="mt-6">
        <TabGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* ---- Tab: Homework Tasks ---- */}
      {activeTab === 'homework' && (
        <div className="mt-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <SearchBar
              value={hwSearch}
              onChange={handleHwSearch}
              placeholder="Search homework..."
            />
            <Select
              options={hwStatusFilterOptions}
              value={hwFilterStatus}
              onChange={(e) => {
                setHwFilterStatus(e.target.value);
                setHwPage(1);
              }}
              className="w-40"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-surface-border">
            {hwError ? (
              <div className="p-8 text-center text-danger">
                Failed to load homework. Please try again.
              </div>
            ) : (
              <DataTable
                columns={hwColumns}
                data={homeworks}
                loading={hwLoading}
                emptyMessage="No homework found. Create your first homework assignment."
              />
            )}
          </div>

          {/* Pagination */}
          {hwTotalPages > 1 && (
            <div className="mt-4">
              <Pagination
                page={hwPage}
                totalPages={hwTotalPages}
                onPageChange={setHwPage}
              />
            </div>
          )}
        </div>
      )}

      {/* ---- Tab: Submissions ---- */}
      {activeTab === 'submissions' && (
        <div className="mt-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Select
              options={subStatusFilterOptions}
              value={subFilterStatus}
              onChange={(e) => {
                setSubFilterStatus(e.target.value);
                setSubPage(1);
              }}
              className="w-44"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-surface-border">
            {subError ? (
              <div className="p-8 text-center text-danger">
                Failed to load submissions. Please try again.
              </div>
            ) : (
              <DataTable
                columns={subColumns}
                data={submissions}
                loading={subLoading}
                emptyMessage="No submissions found."
              />
            )}
          </div>

          {/* Pagination */}
          {subTotalPages > 1 && (
            <div className="mt-4">
              <Pagination
                page={subPage}
                totalPages={subTotalPages}
                onPageChange={setSubPage}
              />
            </div>
          )}
        </div>
      )}

      {/* ---- Create / Edit Homework Modal ---- */}
      <Modal
        isOpen={hwModalOpen}
        onClose={closeHwModal}
        title={hwEditing ? 'Edit Homework' : 'Create Homework'}
        size="lg"
      >
        <HomeworkForm
          key={hwEditing?.uuid || 'new'}
          defaultValues={
            hwEditing
              ? {
                  title: hwEditing.title,
                  instructions: hwEditing.instructions || '',
                  submissionType: hwEditing.submissionType || 'text',
                  courseUuid: hwEditing.courseUuid || hwEditing.course?.uuid || '',
                  lessonUuid: hwEditing.lessonUuid || hwEditing.lesson?.uuid || '',
                  dueDate: hwEditing.dueDate
                    ? new Date(hwEditing.dueDate).toISOString().split('T')[0]
                    : '',
                  maxScore: hwEditing.maxScore ?? 100,
                  status: hwEditing.status || 'draft',
                }
              : null
          }
          onSubmit={handleHwFormSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>

      {/* ---- Review Submission Modal ---- */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={closeReviewModal}
        title="Review Submission"
        size="lg"
      >
        <ReviewForm
          key={reviewTarget?.uuid || 'review'}
          submission={reviewTarget}
          onSubmit={handleReviewSubmit}
          loading={reviewMutation.isPending}
        />
      </Modal>

      {/* ---- Delete Confirm ---- */}
      <ConfirmDialog
        isOpen={!!hwDeleteTarget}
        onClose={() => setHwDeleteTarget(null)}
        onConfirm={handleHwDelete}
        title="Delete Homework"
        message={`Are you sure you want to delete "${hwDeleteTarget?.title}"? This will also delete all related submissions. This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
