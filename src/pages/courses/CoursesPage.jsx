import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { courseLevelBadge, courseStatusBadge } from '../../utils/statusConfig';
import { useCrudModal } from '../../hooks/useCrudModal';
import { useCrudMutations } from '../../hooks/useCrudMutations';
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery';
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Users,
  Layers,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  togglePublish,
} from '../../api/courses';
import { getCategories } from '../../api/categories';
import { getUsers } from '../../api/users';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import SearchBar from '../../components/ui/SearchBar';
import Pagination from '../../components/ui/Pagination';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

/* ------------------------------------------------------------------ */
/*  Zod schema                                                        */
/* ------------------------------------------------------------------ */
const courseSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional().default(''),
  categoryUuid: z.string().optional().default(''),
  instructorUuid: z.string().optional().default(''),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  thumbnail: z.string().optional().default(''),
});

/* ------------------------------------------------------------------ */
/*  Course Form (used inside Modal)                                    */
/* ------------------------------------------------------------------ */
function CourseForm({ defaultValues, onSubmit, loading, categories, mentors }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: defaultValues || {
      title: '',
      description: '',
      categoryUuid: '',
      instructorUuid: '',
      level: 'beginner',
      thumbnail: '',
    },
  });

  const categoryOptions = [
    { value: '', label: 'No category' },
    ...(categories || []).map((c) => ({ value: c.uuid, label: c.name })),
  ];

  const mentorOptions = [
    { value: '', label: 'No instructor' },
    ...(mentors || []).map((m) => ({ value: m.uuid, label: m.name })),
  ];

  const levelOptions = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Course Title"
        placeholder="e.g. Introduction to Quran Recitation"
        error={errors.title?.message}
        {...register('title')}
      />
      <Textarea
        label="Description"
        rows={3}
        placeholder="Brief description of the course..."
        {...register('description')}
      />
      <Select
        label="Category"
        options={categoryOptions}
        error={errors.categoryUuid?.message}
        {...register('categoryUuid')}
      />
      <Select
        label="Instructor"
        options={mentorOptions}
        error={errors.instructorUuid?.message}
        {...register('instructorUuid')}
      />
      <Select
        label="Level"
        options={levelOptions}
        error={errors.level?.message}
        {...register('level')}
      />
      <Input
        label="Thumbnail URL"
        placeholder="https://example.com/image.jpg"
        error={errors.thumbnail?.message}
        {...register('thumbnail')}
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {defaultValues ? 'Save Changes' : 'Create Course'}
        </Button>
      </div>
    </form>
  );
}

/* ================================================================== */
/*  CoursesPage                                                        */
/* ================================================================== */
export default function CoursesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  /* ---- State ---- */
  const { modalOpen, editing, openCreate, openEdit, closeModal } = useCrudModal();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { search, page, setPage, handleSearch } = usePaginatedQuery();
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  /* ---- Queries ---- */
  const {
    data: coursesResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['courses', { page, search, category: filterCategory, status: filterStatus }],
    queryFn: () =>
      getCourses({
        page,
        limit: 12,
        search: search || undefined,
        category: filterCategory || undefined,
        status: filterStatus || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: mentorsData } = useQuery({
    queryKey: ['users', { role: 'mentor' }],
    queryFn: () => getUsers({ role: 'mentor', limit: 100 }),
  });

  /* ---- Derived data ---- */
  const courses = coursesResponse?.data || [];
  const totalPages = coursesResponse?.pagination?.pages || 1;
  const categories = Array.isArray(categoriesData) ? categoriesData : categoriesData?.data || [];
  const mentors = mentorsData?.data || [];

  /* ---- Mutations ---- */
  const { createMutation, updateMutation, deleteMutation } = useCrudMutations({
    queryKey: ['courses'],
    createFn: createCourse,
    createMsg: 'Course created successfully',
    onCreateSuccess: closeModal,
    updateFn: ({ uuid, data }) => updateCourse(uuid, data),
    updateMsg: 'Course updated successfully',
    onUpdateSuccess: closeModal,
    deleteFn: deleteCourse,
    deleteMsg: 'Course deleted successfully',
    onDeleteSuccess: () => setDeleteTarget(null),
  });

  const publishMutation = useMutation({
    mutationFn: togglePublish,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course status updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update status');
    },
  });

  /* ---- Handlers ---- */
  const handleFormSubmit = (data) => {
    if (editing) {
      updateMutation.mutate({ uuid: editing.uuid, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.uuid);
    }
  };

  /* ---- Category / Status filter options ---- */
  const categoryFilterOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((c) => ({ value: c.uuid, label: c.name })),
  ];

  const statusFilterOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
  ];

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
        <p className="text-danger font-medium text-lg">Failed to load courses</p>
        <p className="text-text-secondary mt-1 text-sm">
          Please check your connection and try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Courses</h1>
          <p className="text-text-secondary mt-1">Create and manage course offerings</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Add Course
        </Button>
      </div>

      {/* ---- Filters ---- */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Search courses..."
        />
        <Select
          options={categoryFilterOptions}
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(1);
          }}
          className="w-44"
        />
        <Select
          options={statusFilterOptions}
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          className="w-36"
        />
      </div>

      {/* ---- Course Grid ---- */}
      {courses.length === 0 ? (
        <div className="mt-6 bg-white rounded-xl border border-surface-border p-12 text-center">
          <BookOpen className="w-12 h-12 text-text-muted mx-auto" />
          <p className="mt-3 text-text-muted text-sm">
            No courses found. Create your first course to get started.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {courses.map((course) => (
            <div
              key={course.uuid}
              className="bg-white rounded-xl border border-surface-border overflow-hidden hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Thumbnail or placeholder */}
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-36 object-cover"
                />
              ) : (
                <div className="w-full h-36 bg-primary-50 flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-primary/40" />
                </div>
              )}

              <div className="p-4 flex flex-col flex-1">
                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge variant={courseStatusBadge[course.status]}>
                    {course.status}
                  </Badge>
                  <Badge variant={courseLevelBadge[course.level]}>
                    {course.level}
                  </Badge>
                  {course.category && (
                    <Badge variant="info">{course.category.name}</Badge>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
                  {course.title}
                </h3>

                {/* Meta */}
                <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {course.moduleCount ?? 0} modules
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {course.enrollmentCount ?? 0} students
                  </span>
                </div>

                {/* Instructor */}
                {course.instructor && (
                  <p className="mt-1.5 text-xs text-text-secondary">
                    Instructor: {course.instructor.name}
                  </p>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/course-content/${course.uuid}`)}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Content
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => publishMutation.mutate(course.uuid)}
                    title={course.status === 'published' ? 'Unpublish' : 'Publish'}
                  >
                    {course.status === 'published' ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(course)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger/5"
                    onClick={() => setDeleteTarget(course)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Pagination ---- */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* ---- Create / Edit Modal ---- */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Course' : 'Add Course'}
        size="lg"
      >
        <CourseForm
          key={editing?.uuid || 'new'}
          defaultValues={
            editing
              ? {
                  title: editing.title,
                  description: editing.description || '',
                  categoryUuid: editing.categoryUuid || editing.category?.uuid || '',
                  instructorUuid: editing.instructorUuid || editing.instructor?.uuid || '',
                  level: editing.level,
                  thumbnail: editing.thumbnail || '',
                }
              : null
          }
          onSubmit={handleFormSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
          categories={categories}
          mentors={mentors}
        />
      </Modal>

      {/* ---- Delete Confirm ---- */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Course"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This will also delete all modules and lessons. This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
