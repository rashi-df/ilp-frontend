import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

import {
  getQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getFlashcardSets,
  createFlashcardSet,
  updateFlashcardSet,
  deleteFlashcardSet,
  getDragDropActivities,
  createDragDropActivity,
  updateDragDropActivity,
  deleteDragDropActivity,
} from '../../api/activities';
import { getAllLessons, getCourses } from '../../api/courses';
import { getCategories } from '../../api/categories';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import SearchBar from '../../components/ui/SearchBar';
import TabGroup from '../../components/ui/TabGroup';
import Pagination from '../../components/ui/Pagination';
import DataTable from '../../components/ui/DataTable';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

/* ------------------------------------------------------------------ */
/*  Zod Schemas for main form fields                                   */
/* ------------------------------------------------------------------ */

const quizFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  lessonUuid: z.string().min(1, 'Lesson UUID is required'),
  passingScore: z.coerce.number().min(0).max(100),
  status: z.enum(['draft', 'published']),
});

const flashcardFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  lessonUuid: z.string().min(1, 'Lesson UUID is required'),
  status: z.enum(['draft', 'published']),
});

const dragDropFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  lessonUuid: z.string().min(1, 'Lesson UUID is required'),
  type: z.enum(['ordering', 'matching']),
  instructions: z.string().optional().default(''),
  status: z.enum(['draft', 'published']),
});

/* ------------------------------------------------------------------ */
/*  Cascading Category → Course → Lesson dropdowns                    */
/* ------------------------------------------------------------------ */

const selectCls =
  'w-full rounded-lg border border-surface-border bg-surface text-text-primary ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ' +
  'px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed';

function LessonCascade({ setValue, value, error }) {
  const { data: catData } = useQuery({ queryKey: ['allCategories'], queryFn: getCategories });
  const { data: courseData } = useQuery({
    queryKey: ['allCourses'],
    queryFn: () => getCourses({ per_page: 100 }),
  });
  const { data: lessonData, isLoading } = useQuery({
    queryKey: ['allLessons'],
    queryFn: getAllLessons,
  });

  const [categoryUuid, setCategoryUuid] = useState('');
  const [courseUuid, setCourseUuid] = useState('');

  const categories = catData?.data || [];
  const allCourses = courseData?.data || [];
  const allLessons = lessonData?.data || [];

  // Pre-populate selects when editing (resolve category/course from lesson UUID)
  useEffect(() => {
    if (!value || allLessons.length === 0) return;
    const lesson = allLessons.find((l) => l.uuid === value);
    if (!lesson) return;
    const cat = lesson.module?.course?.category?.uuid || '';
    const crs = lesson.module?.course?.uuid || '';
    if (cat && !categoryUuid) setCategoryUuid(cat);
    if (crs && !courseUuid) setCourseUuid(crs);
  }, [value, allLessons.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredCourses = categoryUuid
    ? allCourses.filter((c) => c.category?.uuid === categoryUuid)
    : allCourses;

  const filteredLessons = courseUuid
    ? allLessons.filter((l) => l.module?.course?.uuid === courseUuid)
    : [];

  const handleCategoryChange = (e) => {
    setCategoryUuid(e.target.value);
    setCourseUuid('');
    setValue('lessonUuid', '');
  };

  const handleCourseChange = (e) => {
    setCourseUuid(e.target.value);
    setValue('lessonUuid', '');
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Category</label>
        <select value={categoryUuid} onChange={handleCategoryChange} className={selectCls}>
          <option value="">Select a category</option>
          {categories.map((c) => (
            <option key={c.uuid} value={c.uuid}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Course</label>
        <select
          value={courseUuid}
          onChange={handleCourseChange}
          disabled={!categoryUuid}
          className={selectCls}
        >
          <option value="">Select a course</option>
          {filteredCourses.map((c) => (
            <option key={c.uuid} value={c.uuid}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Lesson</label>
        <select
          value={value}
          onChange={(e) => setValue('lessonUuid', e.target.value)}
          disabled={!courseUuid || isLoading}
          className={selectCls}
        >
          <option value="">{isLoading ? 'Loading…' : 'Select a lesson'}</option>
          {filteredLessons.map((l) => (
            <option key={l.uuid} value={l.uuid}>
              {l.title} ({l.type})
            </option>
          ))}
        </select>
        {error && <p className="text-danger text-xs mt-1">{error}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabs config                                                        */
/* ------------------------------------------------------------------ */

const TABS = [
  { key: 'quizzes', label: 'Quizzes' },
  { key: 'flashcards', label: 'Flashcards' },
  { key: 'dragdrop', label: 'Drag & Drop' },
];

/* ================================================================== */
/*  Quiz Builder Modal                                                 */
/* ================================================================== */

function QuizBuilderModal({ isOpen, onClose, onSubmit, loading, editing }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(quizFormSchema),
    defaultValues: editing
      ? {
          title: editing.title,
          lessonUuid: editing.lesson?.uuid ?? '',
          passingScore: editing.passing_score ?? 70,
          status: editing.status,
        }
      : { title: '', lessonUuid: '', passingScore: 70, status: 'draft' },
  });

  const [questions, setQuestions] = useState(
    editing?.questions?.length
      ? editing.questions.map((q) => ({
          question: q.question,
          options: [...q.options],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
        }))
      : [{ question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }]
  );

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }]);
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex, optIndex, value) => {
    const updated = [...questions];
    const opts = [...updated[qIndex].options];
    opts[optIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options: opts };
    setQuestions(updated);
  };

  const handleFormSubmit = (formData) => {
    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question.trim()) {
        toast.error(`Question ${i + 1}: question text is required`);
        return;
      }
      for (let j = 0; j < 4; j++) {
        if (!questions[i].options[j].trim()) {
          toast.error(`Question ${i + 1}: option ${j + 1} is required`);
          return;
        }
      }
    }

    onSubmit({ ...formData, questions });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit Quiz' : 'Create Quiz'} size="lg">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <Input label="Title" placeholder="Quiz title" error={errors.title?.message} {...register('title')} />
        <LessonCascade setValue={setValue} value={watch('lessonUuid')} error={errors.lessonUuid?.message} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Passing Score (%)" type="number" min={0} max={100} error={errors.passingScore?.message} {...register('passingScore')} />
          <Select
            label="Status"
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
            ]}
            error={errors.status?.message}
            {...register('status')}
          />
        </div>

        {/* Questions */}
        <div className="border-t border-surface-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">Questions ({questions.length})</h3>
            <Button type="button" variant="secondary" size="sm" onClick={addQuestion}>
              <Plus className="w-3.5 h-3.5" /> Add Question
            </Button>
          </div>

          <div className="space-y-4">
            {questions.map((q, qIdx) => (
              <div key={qIdx} className="border border-surface-border rounded-lg p-4 bg-surface-alt/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-text-muted uppercase">Question {qIdx + 1}</span>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(qIdx)} className="text-danger hover:text-red-700 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Question text"
                  value={q.question}
                  onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                  className="w-full rounded-lg border border-surface-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary px-3 py-2 text-sm mb-3"
                />

                <div className="grid grid-cols-2 gap-2 mb-3">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIdx}`}
                        checked={q.correctAnswer === optIdx}
                        onChange={() => updateQuestion(qIdx, 'correctAnswer', optIdx)}
                        className="accent-primary shrink-0"
                      />
                      <input
                        type="text"
                        placeholder={`Option ${optIdx + 1}`}
                        value={opt}
                        onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                        className="w-full rounded-lg border border-surface-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary px-3 py-1.5 text-sm"
                      />
                    </div>
                  ))}
                </div>

                <Textarea
                  placeholder="Explanation (optional)"
                  value={q.explanation}
                  onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-surface-border">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>{editing ? 'Save Changes' : 'Create Quiz'}</Button>
        </div>
      </form>
    </Modal>
  );
}

/* ================================================================== */
/*  Flashcard Builder Modal                                            */
/* ================================================================== */

function FlashcardBuilderModal({ isOpen, onClose, onSubmit, loading, editing }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(flashcardFormSchema),
    defaultValues: editing
      ? { title: editing.title, lessonUuid: editing.lesson?.uuid ?? '', status: editing.status }
      : { title: '', lessonUuid: '', status: 'draft' },
  });

  const [cards, setCards] = useState(
    editing?.cards?.length
      ? editing.cards.map((c) => ({ front: c.front, back: c.back, hint: c.hint || '' }))
      : [{ front: '', back: '', hint: '' }]
  );

  const addCard = () => {
    setCards([...cards, { front: '', back: '', hint: '' }]);
  };

  const removeCard = (index) => {
    if (cards.length <= 1) return;
    setCards(cards.filter((_, i) => i !== index));
  };

  const updateCard = (index, field, value) => {
    const updated = [...cards];
    updated[index] = { ...updated[index], [field]: value };
    setCards(updated);
  };

  const handleFormSubmit = (formData) => {
    for (let i = 0; i < cards.length; i++) {
      if (!cards[i].front.trim()) {
        toast.error(`Card ${i + 1}: front text is required`);
        return;
      }
      if (!cards[i].back.trim()) {
        toast.error(`Card ${i + 1}: back text is required`);
        return;
      }
    }

    onSubmit({ ...formData, cards });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit Flashcard Set' : 'Create Flashcard Set'} size="lg">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <Input label="Title" placeholder="Flashcard set title" error={errors.title?.message} {...register('title')} />
        <LessonCascade setValue={setValue} value={watch('lessonUuid')} error={errors.lessonUuid?.message} />
        <Select
          label="Status"
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
          ]}
          error={errors.status?.message}
          {...register('status')}
        />

        {/* Cards */}
        <div className="border-t border-surface-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">Cards ({cards.length})</h3>
            <Button type="button" variant="secondary" size="sm" onClick={addCard}>
              <Plus className="w-3.5 h-3.5" /> Add Card
            </Button>
          </div>

          <div className="space-y-4">
            {cards.map((card, idx) => (
              <div key={idx} className="border border-surface-border rounded-lg p-4 bg-surface-alt/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-text-muted uppercase">Card {idx + 1}</span>
                  {cards.length > 1 && (
                    <button type="button" onClick={() => removeCard(idx)} className="text-danger hover:text-red-700 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <input
                    type="text"
                    placeholder="Front (Arabic text or term)"
                    value={card.front}
                    onChange={(e) => updateCard(idx, 'front', e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Back (English meaning)"
                    value={card.back}
                    onChange={(e) => updateCard(idx, 'back', e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary px-3 py-2 text-sm"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Hint (optional)"
                  value={card.hint}
                  onChange={(e) => updateCard(idx, 'hint', e.target.value)}
                  className="w-full rounded-lg border border-surface-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-surface-border">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>{editing ? 'Save Changes' : 'Create Flashcard Set'}</Button>
        </div>
      </form>
    </Modal>
  );
}

/* ================================================================== */
/*  Drag & Drop Builder Modal                                          */
/* ================================================================== */

function DragDropBuilderModal({ isOpen, onClose, onSubmit, loading, editing }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(dragDropFormSchema),
    defaultValues: editing
      ? {
          title: editing.title,
          lessonUuid: editing.lesson?.uuid ?? '',
          type: editing.type,
          instructions: editing.instructions || '',
          status: editing.status,
        }
      : { title: '', lessonUuid: '', type: 'ordering', instructions: '', status: 'draft' },
  });

  const activityType = watch('type');

  const [items, setItems] = useState(
    editing?.items?.length
      ? editing.items.map((item) => ({
          text: item.text,
          matchText: item.matchText || '',
          correctOrder: item.correctOrder || 0,
        }))
      : [{ text: '', matchText: '', correctOrder: 0 }]
  );

  const addItem = () => {
    setItems([...items, { text: '', matchText: '', correctOrder: items.length }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleFormSubmit = (formData) => {
    for (let i = 0; i < items.length; i++) {
      if (!items[i].text.trim()) {
        toast.error(`Item ${i + 1}: text is required`);
        return;
      }
      if (formData.type === 'matching' && !items[i].matchText.trim()) {
        toast.error(`Item ${i + 1}: match text is required for matching type`);
        return;
      }
    }

    onSubmit({ ...formData, items });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit Drag & Drop Activity' : 'Create Drag & Drop Activity'} size="lg">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <Input label="Title" placeholder="Activity title" error={errors.title?.message} {...register('title')} />
        <LessonCascade setValue={setValue} value={watch('lessonUuid')} error={errors.lessonUuid?.message} />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Type"
            options={[
              { value: 'ordering', label: 'Ordering' },
              { value: 'matching', label: 'Matching' },
            ]}
            error={errors.type?.message}
            {...register('type')}
          />
          <Select
            label="Status"
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
            ]}
            error={errors.status?.message}
            {...register('status')}
          />
        </div>
        <Textarea
          label="Instructions"
          placeholder="Instructions for the activity"
          rows={3}
          className="resize-none"
          {...register('instructions')}
        />

        {/* Items */}
        <div className="border-t border-surface-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">Items ({items.length})</h3>
            <Button type="button" variant="secondary" size="sm" onClick={addItem}>
              <Plus className="w-3.5 h-3.5" /> Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="border border-surface-border rounded-lg p-3 bg-surface-alt/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-text-muted uppercase">Item {idx + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="text-danger hover:text-red-700 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Text"
                    value={item.text}
                    onChange={(e) => updateItem(idx, 'text', e.target.value)}
                    className="flex-1 rounded-lg border border-surface-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary px-3 py-2 text-sm"
                  />
                  {activityType === 'matching' ? (
                    <input
                      type="text"
                      placeholder="Match text"
                      value={item.matchText}
                      onChange={(e) => updateItem(idx, 'matchText', e.target.value)}
                      className="flex-1 rounded-lg border border-surface-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary px-3 py-2 text-sm"
                    />
                  ) : (
                    <input
                      type="number"
                      placeholder="Order"
                      value={item.correctOrder}
                      onChange={(e) => updateItem(idx, 'correctOrder', parseInt(e.target.value, 10) || 0)}
                      className="w-24 rounded-lg border border-surface-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary px-3 py-2 text-sm"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-surface-border">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>{editing ? 'Save Changes' : 'Create Activity'}</Button>
        </div>
      </form>
    </Modal>
  );
}

/* ================================================================== */
/*  Activity Builder Page                                              */
/* ================================================================== */

export default function ActivityBuilderPage() {
  const queryClient = useQueryClient();

  /* ---- State ---- */
  const [activeTab, setActiveTab] = useState('quizzes');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  /* Reset page when tab or search changes */
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setSearch('');
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  /* ---- Queries ---- */
  const quizzesQuery = useQuery({
    queryKey: ['quizzes', { search, page }],
    queryFn: () => getQuizzes({ search, page, limit: 20 }),
    enabled: activeTab === 'quizzes',
    placeholderData: keepPreviousData,
  });

  const flashcardsQuery = useQuery({
    queryKey: ['flashcardSets', { search, page }],
    queryFn: () => getFlashcardSets({ search, page, limit: 20 }),
    enabled: activeTab === 'flashcards',
    placeholderData: keepPreviousData,
  });

  const dragDropQuery = useQuery({
    queryKey: ['dragDropActivities', { search, page }],
    queryFn: () => getDragDropActivities({ search, page, limit: 20 }),
    enabled: activeTab === 'dragdrop',
    placeholderData: keepPreviousData,
  });

  /* ---- Mutations: Quizzes ---- */
  const createQuizMut = useMutation({
    mutationFn: createQuiz,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success('Quiz created successfully');
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create quiz'),
  });

  const updateQuizMut = useMutation({
    mutationFn: ({ uuid, data }) => updateQuiz(uuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success('Quiz updated successfully');
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update quiz'),
  });

  const deleteQuizMut = useMutation({
    mutationFn: deleteQuiz,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success('Quiz deleted successfully');
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete quiz'),
  });

  /* ---- Mutations: Flashcards ---- */
  const createFlashcardMut = useMutation({
    mutationFn: createFlashcardSet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcardSets'] });
      toast.success('Flashcard set created successfully');
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create flashcard set'),
  });

  const updateFlashcardMut = useMutation({
    mutationFn: ({ uuid, data }) => updateFlashcardSet(uuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcardSets'] });
      toast.success('Flashcard set updated successfully');
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update flashcard set'),
  });

  const deleteFlashcardMut = useMutation({
    mutationFn: deleteFlashcardSet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcardSets'] });
      toast.success('Flashcard set deleted successfully');
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete flashcard set'),
  });

  /* ---- Mutations: Drag & Drop ---- */
  const createDragDropMut = useMutation({
    mutationFn: createDragDropActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dragDropActivities'] });
      toast.success('Drag & drop activity created successfully');
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create activity'),
  });

  const updateDragDropMut = useMutation({
    mutationFn: ({ uuid, data }) => updateDragDropActivity(uuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dragDropActivities'] });
      toast.success('Drag & drop activity updated successfully');
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update activity'),
  });

  const deleteDragDropMut = useMutation({
    mutationFn: deleteDragDropActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dragDropActivities'] });
      toast.success('Drag & drop activity deleted successfully');
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete activity'),
  });

  /* ---- Modal helpers ---- */
  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  /* ---- Submit handlers ---- */
  const handleQuizSubmit = (data) => {
    if (editing) {
      updateQuizMut.mutate({ uuid: editing.uuid, data });
    } else {
      createQuizMut.mutate(data);
    }
  };

  const handleFlashcardSubmit = (data) => {
    if (editing) {
      updateFlashcardMut.mutate({ uuid: editing.uuid, data });
    } else {
      createFlashcardMut.mutate(data);
    }
  };

  const handleDragDropSubmit = (data) => {
    if (editing) {
      updateDragDropMut.mutate({ uuid: editing.uuid, data });
    } else {
      createDragDropMut.mutate(data);
    }
  };

  /* ---- Delete handler ---- */
  const handleDelete = () => {
    if (!deleteTarget) return;
    if (activeTab === 'quizzes') deleteQuizMut.mutate(deleteTarget.uuid);
    else if (activeTab === 'flashcards') deleteFlashcardMut.mutate(deleteTarget.uuid);
    else if (activeTab === 'dragdrop') deleteDragDropMut.mutate(deleteTarget.uuid);
  };

  /* ---- Resolve active data ---- */
  const getActiveData = () => {
    if (activeTab === 'quizzes') return quizzesQuery;
    if (activeTab === 'flashcards') return flashcardsQuery;
    return dragDropQuery;
  };

  const activeQuery = getActiveData();
  const dataList = activeQuery.data?.data || [];
  const pagination = activeQuery.data?.pagination || { page: 1, pages: 1 };

  /* ---- Column definitions ---- */
  const statusBadge = (row) => (
    <Badge variant={row.status === 'published' ? 'success' : 'default'}>
      {row.status === 'published' ? 'Published' : 'Draft'}
    </Badge>
  );

  const lessonCell = (row) => (
    <span className="text-text-secondary text-sm">
      {row.lesson?.title || row.lessonUuid}
    </span>
  );

  const actionsCell = (row) => (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={() => openEdit(row)}>
        <Pencil className="w-3.5 h-3.5" /> Edit
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-danger hover:bg-danger/5"
        onClick={() => setDeleteTarget(row)}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );

  const quizColumns = [
    { key: 'title', header: 'Title' },
    { key: 'lesson', header: 'Linked Lesson', render: lessonCell },
    { key: 'questionsCount', header: 'Questions', render: (row) => row.questions?.length || 0 },
    { key: 'status', header: 'Status', render: statusBadge },
    { key: 'actions', header: 'Actions', render: actionsCell },
  ];

  const flashcardColumns = [
    { key: 'title', header: 'Title' },
    { key: 'lesson', header: 'Linked Lesson', render: lessonCell },
    { key: 'cardsCount', header: 'Cards', render: (row) => row.cards?.length || 0 },
    { key: 'status', header: 'Status', render: statusBadge },
    { key: 'actions', header: 'Actions', render: actionsCell },
  ];

  const dragDropColumns = [
    { key: 'title', header: 'Title' },
    { key: 'lesson', header: 'Linked Lesson', render: lessonCell },
    { key: 'itemsCount', header: 'Items', render: (row) => row.items?.length || 0 },
    { key: 'type', header: 'Type', render: (row) => <Badge variant="info">{row.type}</Badge> },
    { key: 'status', header: 'Status', render: statusBadge },
    { key: 'actions', header: 'Actions', render: actionsCell },
  ];

  const getColumns = () => {
    if (activeTab === 'quizzes') return quizColumns;
    if (activeTab === 'flashcards') return flashcardColumns;
    return dragDropColumns;
  };

  const getDeleteMessage = () => {
    if (!deleteTarget) return '';
    return `Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.`;
  };

  const isSubmitting =
    createQuizMut.isPending ||
    updateQuizMut.isPending ||
    createFlashcardMut.isPending ||
    updateFlashcardMut.isPending ||
    createDragDropMut.isPending ||
    updateDragDropMut.isPending;

  /* ---- Render ---- */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Activity Builder</h1>
          <p className="text-text-secondary mt-1">Design quizzes, flashcards, and interactive activities</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> Create
        </Button>
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <TabGroup tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />
      </div>

      {/* Search */}
      <div className="mt-4">
        <SearchBar value={search} onChange={handleSearchChange} placeholder="Search by title..." />
      </div>

      {/* Table */}
      <div className="mt-4 bg-white rounded-xl border border-surface-border">
        <DataTable
          columns={getColumns()}
          data={dataList}
          loading={activeQuery.isLoading}
          emptyMessage={`No ${activeTab === 'quizzes' ? 'quizzes' : activeTab === 'flashcards' ? 'flashcard sets' : 'drag & drop activities'} found.`}
        />
      </div>

      {/* Pagination */}
      <div className="mt-4">
        <Pagination page={page} totalPages={pagination.pages} onPageChange={setPage} />
      </div>

      {/* Quiz Builder Modal */}
      {activeTab === 'quizzes' && modalOpen && (
        <QuizBuilderModal
          key={editing?.uuid || 'new-quiz'}
          isOpen={modalOpen}
          onClose={closeModal}
          onSubmit={handleQuizSubmit}
          loading={isSubmitting}
          editing={editing}
        />
      )}

      {/* Flashcard Builder Modal */}
      {activeTab === 'flashcards' && modalOpen && (
        <FlashcardBuilderModal
          key={editing?.uuid || 'new-flashcard'}
          isOpen={modalOpen}
          onClose={closeModal}
          onSubmit={handleFlashcardSubmit}
          loading={isSubmitting}
          editing={editing}
        />
      )}

      {/* Drag & Drop Builder Modal */}
      {activeTab === 'dragdrop' && modalOpen && (
        <DragDropBuilderModal
          key={editing?.uuid || 'new-dragdrop'}
          isOpen={modalOpen}
          onClose={closeModal}
          onSubmit={handleDragDropSubmit}
          loading={isSubmitting}
          editing={editing}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Activity"
        message={getDeleteMessage()}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
