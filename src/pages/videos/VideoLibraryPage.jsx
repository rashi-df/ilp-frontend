import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import SearchBar from '../../components/ui/SearchBar';
import Pagination from '../../components/ui/Pagination';
import DataTable from '../../components/ui/DataTable';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import FileUpload from '../../components/ui/FileUpload';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const statusBadge = {
  processing: { variant: 'warning', label: 'Processing' },
  ready: { variant: 'success', label: 'Ready' },
  failed: { variant: 'danger', label: 'Failed' },
};

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Course UUID"
        placeholder="Enter course UUID"
        error={errors.courseUuid?.message}
        {...register('courseUuid')}
      />
      <Input
        label="Lesson UUID"
        placeholder="Enter lesson UUID"
        error={errors.lessonUuid?.message}
        {...register('lessonUuid')}
      />
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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [linkTarget, setLinkTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
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
  const handleSearch = useCallback((val) => {
    setSearch(val);
    setPage(1);
  }, []);

  const handleUpload = useCallback(
    async ({ title, description, file }) => {
      try {
        setUploading(true);
        setUploadProgress(0);

        // Step 1: Get upload credentials from our API
        const credResponse = await getUploadCredentials({ title, description });
        const { video, uploadCredentials } = credResponse.data;

        // Step 2: Upload file directly to VdoCipher using XMLHttpRequest for progress
        await new Promise((resolve, reject) => {
          const formData = new FormData();

          // Add all credential fields to the form data
          // VdoCipher expects key, policy, x-amz-signature, x-amz-algorithm,
          // x-amz-date, x-amz-credential, and success_action_status
          if (uploadCredentials) {
            Object.entries(uploadCredentials).forEach(([key, value]) => {
              if (key !== 'uploadLink') {
                formData.append(key, value);
              }
            });
          }

          // The file must be the last field
          formData.append('file', file);

          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const pct = (e.loaded / e.total) * 100;
              setUploadProgress(pct);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 400) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Upload failed'));
          });

          xhr.addEventListener('abort', () => {
            reject(new Error('Upload aborted'));
          });

          const uploadUrl = uploadCredentials?.uploadLink || uploadCredentials?.action;
          if (!uploadUrl) {
            reject(new Error('No upload URL received from VdoCipher'));
            return;
          }

          xhr.open('POST', uploadUrl);
          xhr.send(formData);
        });

        // Step 3: Confirm upload to our backend
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
        const badge = statusBadge[row.status] || statusBadge.processing;
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
              courseUuid: linkTarget.courseUuid || '',
              lessonUuid: linkTarget.lessonUuid || '',
            }}
            onSubmit={handleLink}
            loading={linkMutation.isPending}
          />
        )}
      </Modal>

      {/* ---- Delete Confirm ---- */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Video"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This will also remove the video from VdoCipher. This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
