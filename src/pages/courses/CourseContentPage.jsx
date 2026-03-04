import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Video,
  HelpCircle,
  Layers,
  BookOpen,
  FileText,
  ClipboardList,
  Clock,
} from 'lucide-react';
import {
  getCourseByUuid,
  getModules,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
} from '../../api/courses';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

/* ------------------------------------------------------------------ */
/*  Zod schemas                                                        */
/* ------------------------------------------------------------------ */
const moduleSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional().default(''),
});

const lessonSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  type: z.enum(['video', 'quiz', 'flashcard', 'reading', 'assignment']).default('video'),
  duration: z.coerce.number().int().min(0, 'Duration must be 0 or more').default(0),
});

/* ------------------------------------------------------------------ */
/*  Module Form                                                        */
/* ------------------------------------------------------------------ */
function ModuleForm({ defaultValues, onSubmit, loading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(moduleSchema),
    defaultValues: defaultValues || { title: '', description: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Module Title"
        placeholder="e.g. Getting Started"
        error={errors.title?.message}
        {...register('title')}
      />
      <Textarea
        label="Description"
        rows={3}
        placeholder="Brief description of this module..."
        {...register('description')}
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {defaultValues ? 'Save Changes' : 'Add Module'}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Lesson Form                                                        */
/* ------------------------------------------------------------------ */
function LessonForm({ defaultValues, onSubmit, loading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(lessonSchema),
    defaultValues: defaultValues || { title: '', type: 'video', duration: 0 },
  });

  const typeOptions = [
    { value: 'video', label: 'Video' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'flashcard', label: 'Flashcard' },
    { value: 'reading', label: 'Reading' },
    { value: 'assignment', label: 'Assignment' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Lesson Title"
        placeholder="e.g. Introduction to the Topic"
        error={errors.title?.message}
        {...register('title')}
      />
      <Select
        label="Type"
        options={typeOptions}
        error={errors.type?.message}
        {...register('type')}
      />
      <Input
        label="Duration (minutes)"
        type="number"
        placeholder="0"
        error={errors.duration?.message}
        {...register('duration', { valueAsNumber: true })}
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {defaultValues ? 'Save Changes' : 'Add Lesson'}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Lesson type icon/badge helpers                                     */
/* ------------------------------------------------------------------ */
const typeIcons = {
  video: Video,
  quiz: HelpCircle,
  flashcard: Layers,
  reading: BookOpen,
  assignment: ClipboardList,
};

const typeVariant = {
  video: 'info',
  quiz: 'warning',
  flashcard: 'success',
  reading: 'default',
  assignment: 'danger',
};

/* ================================================================== */
/*  CourseContentPage                                                   */
/* ================================================================== */
export default function CourseContentPage() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /* ---- State ---- */
  const [expandedModules, setExpandedModules] = useState({});
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [targetModuleUuid, setTargetModuleUuid] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'module'|'lesson', item }

  /* ---- Queries ---- */
  const {
    data: courseData,
    isLoading: courseLoading,
    isError: courseError,
  } = useQuery({
    queryKey: ['course', uuid],
    queryFn: () => getCourseByUuid(uuid),
    enabled: !!uuid,
  });

  const {
    data: modulesData,
    isLoading: modulesLoading,
  } = useQuery({
    queryKey: ['modules', uuid],
    queryFn: () => getModules(uuid),
    enabled: !!uuid,
  });

  const course = courseData?.data || courseData;
  const modules = modulesData?.data || modulesData || [];

  /* ---- Module Mutations ---- */
  const createModuleMutation = useMutation({
    mutationFn: createModule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules', uuid] });
      queryClient.invalidateQueries({ queryKey: ['course', uuid] });
      toast.success('Module created successfully');
      closeModuleModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create module');
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: ({ moduleUuid, data }) => updateModule(moduleUuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules', uuid] });
      toast.success('Module updated successfully');
      closeModuleModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update module');
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: deleteModule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules', uuid] });
      queryClient.invalidateQueries({ queryKey: ['course', uuid] });
      toast.success('Module deleted successfully');
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete module');
    },
  });

  /* ---- Lesson Mutations ---- */
  const createLessonMutation = useMutation({
    mutationFn: createLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules', uuid] });
      queryClient.invalidateQueries({ queryKey: ['course', uuid] });
      toast.success('Lesson created successfully');
      closeLessonModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create lesson');
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: ({ lessonUuid, data }) => updateLesson(lessonUuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules', uuid] });
      queryClient.invalidateQueries({ queryKey: ['course', uuid] });
      toast.success('Lesson updated successfully');
      closeLessonModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update lesson');
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: deleteLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules', uuid] });
      queryClient.invalidateQueries({ queryKey: ['course', uuid] });
      toast.success('Lesson deleted successfully');
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete lesson');
    },
  });

  /* ---- Handlers ---- */
  const toggleExpand = (moduleUuid) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleUuid]: !prev[moduleUuid],
    }));
  };

  // Module modal handlers
  const openCreateModule = () => {
    setEditingModule(null);
    setModuleModalOpen(true);
  };

  const openEditModule = (mod) => {
    setEditingModule(mod);
    setModuleModalOpen(true);
  };

  const closeModuleModal = () => {
    setModuleModalOpen(false);
    setEditingModule(null);
  };

  const handleModuleSubmit = (data) => {
    if (editingModule) {
      updateModuleMutation.mutate({ moduleUuid: editingModule.uuid, data });
    } else {
      createModuleMutation.mutate({ ...data, courseUuid: uuid });
    }
  };

  // Lesson modal handlers
  const openCreateLesson = (moduleUuid) => {
    setEditingLesson(null);
    setTargetModuleUuid(moduleUuid);
    setLessonModalOpen(true);
  };

  const openEditLesson = (lesson, moduleUuid) => {
    setEditingLesson(lesson);
    setTargetModuleUuid(moduleUuid);
    setLessonModalOpen(true);
  };

  const closeLessonModal = () => {
    setLessonModalOpen(false);
    setEditingLesson(null);
    setTargetModuleUuid(null);
  };

  const handleLessonSubmit = (data) => {
    if (editingLesson) {
      updateLessonMutation.mutate({ lessonUuid: editingLesson.uuid, data });
    } else {
      createLessonMutation.mutate({ ...data, moduleUuid: targetModuleUuid });
    }
  };

  // Delete handler
  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'module') {
      deleteModuleMutation.mutate(deleteTarget.item.uuid);
    } else {
      deleteLessonMutation.mutate(deleteTarget.item.uuid);
    }
  };

  /* ---- Loading state ---- */
  if (courseLoading || modulesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  /* ---- Error state ---- */
  if (courseError || !course) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-danger font-medium text-lg">Failed to load course</p>
        <p className="text-text-secondary mt-1 text-sm">
          The course may not exist or there was a connection error.
        </p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/courses')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </Button>
      </div>
    );
  }

  // Get lessons from the course detail endpoint (nested) or build from modules query
  const getModuleLessons = (mod) => {
    // If the course detail has modules with lessons embedded, try that first
    const courseModule = course.modules?.find((m) => m.uuid === mod.uuid);
    if (courseModule?.lessons) {
      return courseModule.lessons;
    }
    return [];
  };

  return (
    <div>
      {/* ---- Header ---- */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/courses')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text-primary">{course.title}</h1>
          <p className="text-text-secondary mt-0.5 text-sm">
            {course.description || 'Manage modules and lessons for this course'}
          </p>
        </div>
        <Button onClick={openCreateModule}>
          <Plus className="w-4 h-4" />
          Add Module
        </Button>
      </div>

      {/* ---- Course info bar ---- */}
      <div className="bg-white rounded-xl border border-surface-border p-4 mb-6 flex flex-wrap items-center gap-4 text-sm">
        {course.category && (
          <Badge variant="info">{course.category.name}</Badge>
        )}
        <Badge variant={course.status === 'published' ? 'success' : 'default'}>
          {course.status}
        </Badge>
        <Badge variant={
          course.level === 'beginner' ? 'success' : course.level === 'intermediate' ? 'warning' : 'danger'
        }>
          {course.level}
        </Badge>
        {course.instructor && (
          <span className="text-text-secondary">
            Instructor: <span className="text-text-primary font-medium">{course.instructor.name}</span>
          </span>
        )}
        <span className="text-text-muted">
          {modules.length} module{modules.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ---- Module List (Accordion) ---- */}
      {modules.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-border p-12 text-center">
          <Layers className="w-12 h-12 text-text-muted mx-auto" />
          <p className="mt-3 text-text-muted text-sm">
            No modules yet. Add your first module to start building course content.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((mod, idx) => {
            const isExpanded = expandedModules[mod.uuid];
            const lessons = getModuleLessons(mod);

            return (
              <div
                key={mod.uuid}
                className="bg-white rounded-xl border border-surface-border overflow-hidden"
              >
                {/* Module header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-alt transition-colors"
                  onClick={() => toggleExpand(mod.uuid)}
                >
                  <GripVertical className="w-4 h-4 text-text-muted flex-shrink-0" />

                  <span className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    {idx + 1}
                  </span>

                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary truncate">
                      {mod.title}
                    </h3>
                    {mod.description && (
                      <p className="text-xs text-text-muted truncate mt-0.5">
                        {mod.description}
                      </p>
                    )}
                  </div>

                  <span className="text-xs text-text-muted flex-shrink-0">
                    {mod.lessonCount ?? lessons.length} lesson{(mod.lessonCount ?? lessons.length) !== 1 ? 's' : ''}
                  </span>

                  {/* Module actions */}
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openCreateLesson(mod.uuid)}
                      title="Add lesson"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModule(mod)}
                      title="Edit module"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger/5"
                      onClick={() => setDeleteTarget({ type: 'module', item: mod })}
                      title="Delete module"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Expanded lessons */}
                {isExpanded && (
                  <div className="border-t border-surface-border">
                    {lessons.length === 0 ? (
                      <div className="px-4 py-6 text-center text-text-muted text-sm">
                        No lessons in this module.{' '}
                        <button
                          className="text-primary hover:underline"
                          onClick={() => openCreateLesson(mod.uuid)}
                        >
                          Add a lesson
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-surface-border">
                        {lessons.map((lesson, lIdx) => {
                          const TypeIcon = typeIcons[lesson.type] || FileText;
                          return (
                            <div
                              key={lesson.uuid}
                              className="flex items-center gap-3 px-4 py-2.5 pl-16 hover:bg-surface-alt transition-colors"
                            >
                              <span className="text-xs text-text-muted w-5 text-right flex-shrink-0">
                                {lIdx + 1}.
                              </span>
                              <TypeIcon className="w-4 h-4 text-text-muted flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-text-primary truncate block">
                                  {lesson.title}
                                </span>
                              </div>
                              <Badge variant={typeVariant[lesson.type]}>
                                {lesson.type}
                              </Badge>
                              {lesson.duration > 0 && (
                                <span className="text-xs text-text-muted flex items-center gap-1 flex-shrink-0">
                                  <Clock className="w-3 h-3" />
                                  {lesson.duration}m
                                </span>
                              )}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditLesson(lesson, mod.uuid)}
                                  title="Edit lesson"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-danger hover:bg-danger/5"
                                  onClick={() => setDeleteTarget({ type: 'lesson', item: lesson })}
                                  title="Delete lesson"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add lesson footer */}
                    <div className="px-4 py-2 border-t border-surface-border bg-surface-alt/50">
                      <button
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                        onClick={() => openCreateLesson(mod.uuid)}
                      >
                        <Plus className="w-3 h-3" />
                        Add Lesson
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Module Modal ---- */}
      <Modal
        isOpen={moduleModalOpen}
        onClose={closeModuleModal}
        title={editingModule ? 'Edit Module' : 'Add Module'}
        size="md"
      >
        <ModuleForm
          key={editingModule?.uuid || 'new-module'}
          defaultValues={
            editingModule
              ? { title: editingModule.title, description: editingModule.description || '' }
              : null
          }
          onSubmit={handleModuleSubmit}
          loading={createModuleMutation.isPending || updateModuleMutation.isPending}
        />
      </Modal>

      {/* ---- Lesson Modal ---- */}
      <Modal
        isOpen={lessonModalOpen}
        onClose={closeLessonModal}
        title={editingLesson ? 'Edit Lesson' : 'Add Lesson'}
        size="md"
      >
        <LessonForm
          key={editingLesson?.uuid || 'new-lesson'}
          defaultValues={
            editingLesson
              ? {
                  title: editingLesson.title,
                  type: editingLesson.type,
                  duration: editingLesson.duration || 0,
                }
              : null
          }
          onSubmit={handleLessonSubmit}
          loading={createLessonMutation.isPending || updateLessonMutation.isPending}
        />
      </Modal>

      {/* ---- Delete Confirm ---- */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.type === 'module' ? 'Delete Module' : 'Delete Lesson'}
        message={
          deleteTarget?.type === 'module'
            ? `Are you sure you want to delete the module "${deleteTarget?.item?.title}"? All lessons inside will be deleted too. This action cannot be undone.`
            : `Are you sure you want to delete the lesson "${deleteTarget?.item?.title}"? This action cannot be undone.`
        }
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
