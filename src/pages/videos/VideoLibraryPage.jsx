import { useState, useCallback } from 'react';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
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
} from 'lucide-react';
import {
  getVideos,
  getUploadCredentials,
  confirmUpload,
  updateVideo,
  deleteVideo,
  linkVideoToLesson,
} from '../../api/videos';
import { getCourses, getAllLessons } from '../../api/courses';
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
      <DefaultVideoLayout icons={defaultLayoutIcons} />
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
    formState: { errors },
  } = useForm({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      courseUuid: defaultValues?.courseUuid || '',
      lessonUuid: defaultValues?.lessonUuid || '',
    },
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses-all'],
    queryFn: () => getCourses({ limit: 200 }),
  });

  const { data: lessonsData } = useQuery({
    queryKey: ['lessons-all'],
    queryFn: getAllLessons,
  });

  const courses = coursesData?.data || [];
  const lessons = lessonsData?.data || [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="w-full">
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Course
        </label>
        <select
          {...register('courseUuid')}
          className="w-full rounded-lg border border-surface-border bg-surface text-text-primary
            focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
            px-3 py-2 text-sm"
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
      <div className="w-full">
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Lesson
        </label>
        <select
          {...register('lessonUuid')}
          className="w-full rounded-lg border border-surface-border bg-surface text-text-primary
            focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
            px-3 py-2 text-sm"
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

      {/* ---- Preview Modal ---- */}
      <Modal
        isOpen={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
        title={previewTarget?.title || 'Preview'}
        size="xl"
      >
        {previewTarget && (
          previewError || !previewTarget.stream_url ? (
            <div className="aspect-video w-full">
              <iframe
                src={previewTarget.embed_url}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                title={previewTarget.title}
              />
            </div>
          ) : (
            <div className="aspect-video w-full rounded-lg overflow-hidden">
              <HlsPlayer
                url={previewTarget.stream_url}
                onError={() => setPreviewError(true)}
              />
            </div>
          )
        )}
      </Modal>

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
