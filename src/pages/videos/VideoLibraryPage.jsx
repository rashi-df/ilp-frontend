import { useState, useCallback, useRef, useEffect } from 'react';
import { MediaPlayer, MediaProvider, Menu, useVideoQualityOptions, usePlaybackRateOptions } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as tus from 'tus-js-client';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  Trash2,
  Link,
  Play,
  Video,
  Film,
  X,
} from 'lucide-react';
import {
  getVideos,
  getUploadCredentials,
  confirmUpload,
  updateVideo,
  deleteVideo,
  linkVideoToLesson,
} from '../../api/videos';
import { getCourses, getCourseByUuid } from '../../api/courses';
import { getCategories } from '../../api/categories';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import SearchBar from '../../components/ui/SearchBar';
import Pagination from '../../components/ui/Pagination';
import DataTable from '../../components/ui/DataTable';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import FileUpload from '../../components/ui/FileUpload';
import { formatDuration } from '../../utils/formatters';
import { videoStatusBadge } from '../../utils/statusConfig';
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery';

/* ------------------------------------------------------------------ */
/*  YouTube-style Settings Menu (main → speed/quality subpanels)      */
/* ------------------------------------------------------------------ */
function FlatSettingsMenu() {
  const qualities = useVideoQualityOptions({ auto: true });
  const rates = usePlaybackRateOptions();
  const SettingsIcon = defaultLayoutIcons.Menu.Settings;
  const [panel, setPanel] = useState(null); // null | 'speed' | 'quality'
  const wrapperRef = useRef(null);

  // When in a subpanel, listen for clicks outside the menu and reset to main panel.
  useEffect(() => {
    if (panel === null) return;
    const handlePointerDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setPanel(null);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [panel]);

  const selectedRate = rates.find((r) => r.value === rates.selectedValue);
  const selectedQuality = qualities.find((q) => q.value === qualities.selectedValue);

  return (
    <div ref={wrapperRef}>
    <Menu.Root className="vds-settings-menu vds-menu">
      <Menu.Button className="vds-menu-button vds-button" aria-label="Settings">
        <SettingsIcon className="vds-icon vds-rotate-icon" />
      </Menu.Button>
      <Menu.Items
        className="vds-menu-items"
        placement="top end"
        style={{ minWidth: '220px', minHeight: panel !== null ? '220px' : undefined }}
      >

        {/* ── Main panel ── */}
        {panel === null && (
          <div className="w-full">
            <button
              className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-white/90 hover:bg-white/10 transition-colors cursor-pointer"
              onClick={() => setPanel('speed')}
            >
              <span>Playback speed</span>
              <span className="flex items-center gap-1 text-white/60">
                {selectedRate?.label ?? 'Normal'}
                <span className="text-base leading-none">›</span>
              </span>
            </button>
            <button
              className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-white/90 hover:bg-white/10 transition-colors cursor-pointer"
              onClick={() => setPanel('quality')}
            >
              <span>Quality</span>
              <span className="flex items-center gap-1 text-white/60">
                {selectedQuality?.label ?? 'Auto'}
                <span className="text-base leading-none">›</span>
              </span>
            </button>
          </div>
        )}

        {/* ── Speed subpanel ── */}
        {panel === 'speed' && (
          <div className="w-full">
            <div className="flex w-full items-center px-4 py-2 border-b border-white/10">
              <button
                className="w-5 shrink-0 text-center text-white/70 hover:text-white text-lg leading-none"
                onClick={() => setPanel(null)}
                aria-label="Back"
              >
                ‹
              </button>
              <span className="ml-2 text-sm font-medium text-white">Playback speed</span>
            </div>
            <Menu.RadioGroup
              className="vds-radio-group w-full"
              value={rates.selectedValue}
              onChange={(v) => rates.find((r) => r.value === v)?.select()}
            >
              {rates.map(({ label, value }) => (
                <Menu.Radio
                  key={value}
                  className="flex w-full items-center px-4 py-2 text-sm text-white/90 hover:bg-white/10 cursor-pointer"
                  value={value}
                >
                  <span className="w-5 shrink-0 text-center text-white text-base">
                    {value === rates.selectedValue ? '✓' : ''}
                  </span>
                  <span className="ml-2">{label}</span>
                </Menu.Radio>
              ))}
            </Menu.RadioGroup>
          </div>
        )}

        {/* ── Quality subpanel ── */}
        {panel === 'quality' && (
          <div className="w-full">
            <div className="flex w-full items-center px-4 py-2 border-b border-white/10">
              <button
                className="w-5 shrink-0 text-center text-white/70 hover:text-white text-lg leading-none"
                onClick={() => setPanel(null)}
                aria-label="Back"
              >
                ‹
              </button>
              <span className="ml-2 text-sm font-medium text-white">Quality</span>
            </div>
            <Menu.RadioGroup
              className="vds-radio-group w-full"
              value={qualities.selectedValue}
              onChange={(v) => qualities.find((q) => q.value === v)?.select()}
            >
              {qualities.map(({ label, value, bitrateText }) => (
                <Menu.Radio
                  key={value}
                  className="flex w-full items-center px-4 py-2 text-sm text-white/90 hover:bg-white/10 cursor-pointer"
                  value={value}
                >
                  <span className="w-5 shrink-0 text-center text-white text-base">
                    {value === qualities.selectedValue ? '✓' : ''}
                  </span>
                  <span className="ml-2">{label}</span>
                  {bitrateText && (
                    <span className="ml-auto text-xs text-white/40">{bitrateText}</span>
                  )}
                </Menu.Radio>
              ))}
            </Menu.RadioGroup>
          </div>
        )}

      </Menu.Items>
    </Menu.Root>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  HLS Video Player                                                   */
/* ------------------------------------------------------------------ */
function HlsPlayer({ url, onError }) {
  return (
    <MediaPlayer
      src={url}
      autoPlay
      onError={onError}
      className="w-full h-full"
    >
      <MediaProvider />
      <DefaultVideoLayout
        icons={defaultLayoutIcons}
        slots={{ settingsMenu: <FlatSettingsMenu />, googleCastButton: null }}
      />
    </MediaPlayer>
  );
}

/* ------------------------------------------------------------------ */
/*  Zod schemas                                                        */
/* ------------------------------------------------------------------ */
const uploadSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
});

const editSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
});

const linkSchema = z.object({
  courseUuid: z.string().optional().default(''),
  lessonUuid: z.string().optional().default(''),
});

/* ------------------------------------------------------------------ */
/*  Upload Video Form                                                  */
/* ------------------------------------------------------------------ */
function UploadVideoForm({ onSubmit, loading, uploading, uploadProgress }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(uploadSchema),
    defaultValues: { title: '', description: '' },
  });

  const [file, setFile] = useState(null);

  const handleFormSubmit = (data) => {
    if (!file) {
      toast.error('Please select a video file');
      return;
    }
    onSubmit({ ...data, file });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Input
        label="Title"
        placeholder="Enter video title"
        error={errors.title?.message}
        {...register('title')}
      />
      <div className="w-full">
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Description
        </label>
        <textarea
          {...register('description')}
          placeholder="Optional description"
          rows={3}
          className="w-full rounded-lg border border-surface-border bg-surface text-text-primary
            placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30
            focus:border-primary px-3 py-2 text-sm resize-none"
        />
      </div>
      <div className="w-full">
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Video File
        </label>
        <FileUpload
          onFileSelect={setFile}
          accept="video/*"
          uploading={uploading}
          progress={uploadProgress}
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload Video'}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit Video Form                                                    */
/* ------------------------------------------------------------------ */
function EditVideoForm({ defaultValues, onSubmit, loading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: defaultValues?.title || '',
      description: defaultValues?.description || '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Title"
        placeholder="Enter video title"
        error={errors.title?.message}
        {...register('title')}
      />
      <div className="w-full">
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Description
        </label>
        <textarea
          {...register('description')}
          placeholder="Optional description"
          rows={3}
          className="w-full rounded-lg border border-surface-border bg-surface text-text-primary
            placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30
            focus:border-primary px-3 py-2 text-sm resize-none"
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Link to Lesson Form                                                */
/* ------------------------------------------------------------------ */
function LinkForm({ defaultValues, onSubmit, loading }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      courseUuid: defaultValues?.courseUuid || '',
      lessonUuid: defaultValues?.lessonUuid || '',
    },
  });

  const [selectedCategoryUuid, setSelectedCategoryUuid] = useState('');

  const courseUuid = watch('courseUuid');

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-all'],
    queryFn: getCategories,
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses-all'],
    queryFn: () => getCourses({ limit: 200 }),
  });

  const { data: courseDetail } = useQuery({
    queryKey: ['course-with-modules', courseUuid],
    queryFn: () => getCourseByUuid(courseUuid, { withModules: true }),
    enabled: !!courseUuid,
  });

  const categories = categoriesData?.data || [];
  const allCourses = coursesData?.data || [];

  const courses = selectedCategoryUuid
    ? allCourses.filter((c) => c.category?.uuid === selectedCategoryUuid)
    : allCourses;

  const lessons = courseUuid && courseDetail?.data
    ? (courseDetail.data.modules || []).flatMap((m) => m.lessons || [])
    : [];

  // Pre-populate category when editing an already-linked video
  useEffect(() => {
    if (defaultValues?.courseUuid && allCourses.length > 0) {
      const match = allCourses.find((c) => c.uuid === defaultValues.courseUuid);
      if (match?.category?.uuid) setSelectedCategoryUuid(match.category.uuid);
    }
  }, [allCourses]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset lesson when course changes
  useEffect(() => {
    setValue('lessonUuid', '');
  }, [courseUuid, setValue]);

  const handleCategoryChange = (e) => {
    setSelectedCategoryUuid(e.target.value);
    setValue('courseUuid', '');
    setValue('lessonUuid', '');
  };

  const selectClass =
    'w-full rounded-lg border border-surface-border bg-surface text-text-primary ' +
    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary px-3 py-2 text-sm';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Category */}
      <div className="w-full">
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Category
        </label>
        <select
          value={selectedCategoryUuid}
          onChange={handleCategoryChange}
          className={selectClass}
        >
          <option value="">-- All Categories --</option>
          {categories.map((cat) => (
            <option key={cat.uuid} value={cat.uuid}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Course */}
      <div className="w-full">
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Course
        </label>
        <select
          {...register('courseUuid')}
          className={selectClass}
        >
          <option value="">-- None --</option>
          {courses.map((c) => (
            <option key={c.uuid} value={c.uuid}>
              {c.title}
            </option>
          ))}
        </select>
        {errors.courseUuid && (
          <p className="text-xs text-danger mt-1">{errors.courseUuid.message}</p>
        )}
      </div>

      {/* Lesson */}
      <div className="w-full">
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Lesson
        </label>
        <select
          {...register('lessonUuid')}
          className={selectClass}
        >
          <option value="">-- None --</option>
          {lessons.map((l) => (
            <option key={l.uuid} value={l.uuid}>
              {l.title}
            </option>
          ))}
        </select>
        {errors.lessonUuid && (
          <p className="text-xs text-danger mt-1">{errors.lessonUuid.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          Link Video
        </Button>
      </div>
    </form>
  );
}

/* ================================================================== */
/*  VideoLibraryPage                                                   */
/* ================================================================== */
export default function VideoLibraryPage() {
  const queryClient = useQueryClient();

  /* ---- State ---- */
  const { search, page, setPage, handleSearch } = usePaginatedQuery();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [linkTarget, setLinkTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [previewError, setPreviewError] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!previewTarget) return;
    const handleKey = (e) => { if (e.key === 'Escape') setPreviewTarget(null); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [previewTarget]);
  const [uploadProgress, setUploadProgress] = useState(0);

  /* ---- Query ---- */
  const { data, isLoading } = useQuery({
    queryKey: ['videos', { page, search }],
    queryFn: () => getVideos({ page, limit: 20, search: search || undefined }),
    keepPreviousData: true,
  });

  const videos = data?.data || [];
  const pagination = data?.pagination || { page: 1, pages: 1 };

  /* ---- Mutations ---- */
  const updateMutation = useMutation({
    mutationFn: ({ uuid, data: updateData }) => updateVideo(uuid, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Video updated successfully');
      setEditTarget(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update video');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Video deleted successfully');
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete video');
    },
  });

  const linkMutation = useMutation({
    mutationFn: ({ uuid, data: linkData }) => linkVideoToLesson(uuid, linkData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Video linked successfully');
      setLinkTarget(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to link video');
    },
  });

  /* ---- Handlers ---- */

  const handleUpload = useCallback(
    async ({ title, description, file }) => {
      try {
        setUploading(true);
        setUploadProgress(0);

        // Step 1: get credentials from our API (creates video on Bunny)
        const credResponse = await getUploadCredentials({ title, description });
        const { video, tusCredentials } = credResponse.data;

        // Step 2: TUS upload directly to Bunny
        await new Promise((resolve, reject) => {
          const upload = new tus.Upload(file, {
            endpoint: 'https://video.bunnycdn.com/tusupload',
            retryDelays: [0, 3000, 5000, 10000],
            headers: {
              AuthorizationSignature: tusCredentials.signature,
              AuthorizationExpire: String(tusCredentials.expiry),
              VideoId: tusCredentials.videoId,
              LibraryId: String(tusCredentials.libraryId),
            },
            metadata: { filetype: file.type, title },
            onProgress: (loaded, total) => {
              setUploadProgress((loaded / total) * 100);
            },
            onSuccess: resolve,
            onError: reject,
          });
          upload.start();
        });

        // Step 3: confirm upload to our backend
        await confirmUpload(video.uuid, { fileSize: file.size });

        queryClient.invalidateQueries({ queryKey: ['videos'] });
        toast.success('Video uploaded successfully');
        setUploadModalOpen(false);
      } catch (err) {
        toast.error(err.response?.data?.error || err.message || 'Upload failed');
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [queryClient]
  );

  const handleEdit = (formData) => {
    if (editTarget) {
      updateMutation.mutate({ uuid: editTarget.uuid, data: formData });
    }
  };

  const handleLink = (formData) => {
    if (linkTarget) {
      linkMutation.mutate({ uuid: linkTarget.uuid, data: formData });
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.uuid);
    }
  };

  /* ---- Table columns ---- */
  const columns = [
    {
      key: 'thumbnail',
      header: 'Thumbnail',
      render: (row) =>
        row.thumbnail ? (
          <img
            src={row.thumbnail}
            alt={row.title}
            className="w-16 h-10 object-cover rounded"
          />
        ) : (
          <div className="w-16 h-10 rounded bg-surface-alt flex items-center justify-center">
            <Film className="w-5 h-5 text-text-muted" />
          </div>
        ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <div className="max-w-[200px]">
          <p className="font-medium truncate">{row.title}</p>
          {row.description && (
            <p className="text-xs text-text-muted truncate mt-0.5">
              {row.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (row) => (
        <span className="text-text-secondary">{formatDuration(row.duration)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const badge = videoStatusBadge[row.status] || videoStatusBadge.processing;
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
    {
      key: 'course',
      header: 'Course',
      render: (row) => (
        <span className="text-text-secondary text-xs">
          {row.course?.title || row.courseUuid || '--'}
        </span>
      ),
    },
    {
      key: 'lesson',
      header: 'Lesson',
      render: (row) => (
        <span className="text-text-secondary text-xs">
          {row.lesson?.title || row.lessonUuid || '--'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          {(row.stream_url || row.embed_url) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setPreviewTarget(row); setPreviewError(false); }}
              title="Preview"
            >
              <Play className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditTarget(row)}
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLinkTarget(row)}
            title="Link to lesson"
          >
            <Link className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger/5"
            onClick={() => setDeleteTarget(row)}
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Video Library</h1>
          <p className="text-text-secondary mt-1">Upload and manage video content</p>
        </div>
        <Button onClick={() => setUploadModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Upload Video
        </Button>
      </div>

      {/* ---- Search ---- */}
      <div className="mt-6 flex items-center gap-4">
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Search videos..."
        />
      </div>

      {/* ---- Data Table ---- */}
      <div className="mt-4 bg-white rounded-xl border border-surface-border">
        <DataTable
          columns={columns}
          data={videos}
          loading={isLoading}
          emptyMessage="No videos found. Upload your first video to get started."
        />
      </div>

      {/* ---- Pagination ---- */}
      <div className="mt-4">
        <Pagination
          page={pagination.page}
          totalPages={pagination.pages}
          onPageChange={setPage}
        />
      </div>

      {/* ---- Upload Modal ---- */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => {
          if (!uploading) setUploadModalOpen(false);
        }}
        title="Upload Video"
        size="md"
      >
        <UploadVideoForm
          key={uploadModalOpen ? 'open' : 'closed'}
          onSubmit={handleUpload}
          loading={false}
          uploading={uploading}
          uploadProgress={uploadProgress}
        />
      </Modal>

      {/* ---- Edit Modal ---- */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Video"
        size="md"
      >
        {editTarget && (
          <EditVideoForm
            key={editTarget.uuid}
            defaultValues={{
              title: editTarget.title,
              description: editTarget.description,
            }}
            onSubmit={handleEdit}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* ---- Link Modal ---- */}
      <Modal
        isOpen={!!linkTarget}
        onClose={() => setLinkTarget(null)}
        title="Link Video to Lesson"
        size="md"
      >
        {linkTarget && (
          <LinkForm
            key={linkTarget.uuid}
            defaultValues={{
              courseUuid: linkTarget.course?.uuid || '',
              lessonUuid: linkTarget.lesson?.uuid || '',
            }}
            onSubmit={handleLink}
            loading={linkMutation.isPending}
          />
        )}
      </Modal>

      {/* ---- Preview Overlay ---- */}
      {previewTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewTarget(null)}
        >
          <div
            className="relative w-full max-w-4xl mx-4 aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewTarget(null)}
              className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {previewError || !previewTarget.stream_url ? (
              <iframe
                src={previewTarget.embed_url}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                title={previewTarget.title}
              />
            ) : (
              <div className="w-full h-full rounded-lg overflow-hidden">
                <HlsPlayer
                  url={previewTarget.stream_url}
                  onError={() => setPreviewError(true)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- Delete Confirm ---- */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Video"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
