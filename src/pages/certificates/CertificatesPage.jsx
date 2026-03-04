import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Award,
  Pencil,
  Trash2,
  Eye,
  ShieldOff,
  Plus,
} from 'lucide-react';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getCertificates,
  issueCertificate,
  revokeCertificate,
} from '../../api/certificates';
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
import Spinner from '../../components/ui/Spinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { certificateStatusBadge } from '../../utils/statusConfig';
import { useCrudModal } from '../../hooks/useCrudModal';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const TABS = [
  { key: 'templates', label: 'Templates' },
  { key: 'certificates', label: 'Issued Certificates' },
];

const PAGE_SIZE = 10;

const BORDER_STYLE_OPTIONS = [
  { value: 'classic', label: 'Classic' },
  { value: 'modern', label: 'Modern' },
  { value: 'ornate', label: 'Ornate' },
  { value: 'minimal', label: 'Minimal' },
];

const BORDER_STYLE_CLASSES = {
  classic: 'border-4 border-double border-amber-600',
  modern: 'border-2 border-slate-700',
  ornate: 'border-4 border-amber-500 shadow-lg shadow-amber-100',
  minimal: 'border border-gray-300',
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'issued', label: 'Issued' },
  { value: 'revoked', label: 'Revoked' },
];

/* ------------------------------------------------------------------ */
/*  Zod schemas                                                        */
/* ------------------------------------------------------------------ */
const templateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional(),
  bodyText: z.string().optional(),
  signatureName: z.string().optional(),
  signatureTitle: z.string().optional(),
  borderStyle: z.enum(['classic', 'modern', 'ornate', 'minimal']).optional(),
  isDefault: z.boolean().optional(),
});

const issueSchema = z.object({
  studentUuid: z.string().min(1, 'Student UUID is required'),
  courseUuid: z.string().min(1, 'Course UUID is required'),
  templateUuid: z.string().optional(),
});

const revokeSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

/* ------------------------------------------------------------------ */
/*  Certificate Preview Component                                      */
/* ------------------------------------------------------------------ */
function CertificatePreview({ title, subtitle, bodyText, signatureName, signatureTitle, borderStyle }) {
  return (
    <div
      className={`mt-4 p-8 bg-white rounded-lg text-center ${
        BORDER_STYLE_CLASSES[borderStyle] || BORDER_STYLE_CLASSES.classic
      }`}
    >
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Certificate</p>
        <h3 className="text-xl font-serif font-bold text-gray-800">
          {title || 'Certificate of Completion'}
        </h3>
        <div className="w-16 h-px bg-amber-500 mx-auto" />
        <p className="text-sm text-gray-500">{bodyText || 'This is to certify that'}</p>
        <p className="text-lg font-semibold text-gray-700 italic">[Student Name]</p>
        <p className="text-sm text-gray-500">{subtitle || 'has successfully completed'}</p>
        <p className="text-lg font-semibold text-gray-700">[Course Name]</p>
        <p className="text-xs text-gray-400 mt-2">
          Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <div className="pt-6">
          <div className="w-40 mx-auto border-t border-gray-400 pt-2">
            <p className="text-sm font-medium text-gray-700">{signatureName || '[Signature Name]'}</p>
            <p className="text-xs text-gray-500">{signatureTitle || '[Signature Title]'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Template Form (inside Modal)                                       */
/* ------------------------------------------------------------------ */
function TemplateForm({ defaultValues, isEdit, onSubmit, loading }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: isEdit
      ? {
          title: defaultValues?.title || '',
          subtitle: defaultValues?.subtitle || '',
          bodyText: defaultValues?.bodyText || '',
          signatureName: defaultValues?.signatureName || '',
          signatureTitle: defaultValues?.signatureTitle || '',
          borderStyle: defaultValues?.borderStyle || 'classic',
          isDefault: defaultValues?.isDefault || false,
        }
      : {
          title: '',
          subtitle: 'has successfully completed',
          bodyText: 'This is to certify that',
          signatureName: '',
          signatureTitle: '',
          borderStyle: 'classic',
          isDefault: false,
        },
  });

  const watchTitle = watch('title');
  const watchSubtitle = watch('subtitle');
  const watchBodyText = watch('bodyText');
  const watchSignatureName = watch('signatureName');
  const watchSignatureTitle = watch('signatureTitle');
  const watchBorderStyle = watch('borderStyle');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Title"
        placeholder="e.g. Certificate of Completion"
        error={errors.title?.message}
        {...register('title')}
      />
      <Input
        label="Subtitle"
        placeholder="e.g. has successfully completed"
        error={errors.subtitle?.message}
        {...register('subtitle')}
      />
      <Input
        label="Body Text"
        placeholder="e.g. This is to certify that"
        error={errors.bodyText?.message}
        {...register('bodyText')}
      />
      <Input
        label="Signature Name"
        placeholder="e.g. Dr. Ahmad"
        error={errors.signatureName?.message}
        {...register('signatureName')}
      />
      <Input
        label="Signature Title"
        placeholder="e.g. Director of Education"
        error={errors.signatureTitle?.message}
        {...register('signatureTitle')}
      />
      <Select
        label="Border Style"
        options={BORDER_STYLE_OPTIONS}
        error={errors.borderStyle?.message}
        {...register('borderStyle')}
      />
      <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
        <input
          type="checkbox"
          className="rounded border-surface-border text-primary focus:ring-primary/30"
          {...register('isDefault')}
        />
        Set as default template
      </label>

      {/* Live Preview */}
      <div>
        <p className="text-sm font-medium text-text-primary mb-1">Preview</p>
        <CertificatePreview
          title={watchTitle}
          subtitle={watchSubtitle}
          bodyText={watchBodyText}
          signatureName={watchSignatureName}
          signatureTitle={watchSignatureTitle}
          borderStyle={watchBorderStyle}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Create Template'}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Issue Certificate Form (inside Modal)                              */
/* ------------------------------------------------------------------ */
function IssueCertificateForm({ templates, onSubmit, loading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      studentUuid: '',
      courseUuid: '',
      templateUuid: '',
    },
  });

  const templateOptions = [
    { value: '', label: 'Default Template' },
    ...templates.map((t) => ({ value: t.uuid, label: t.title + (t.isDefault ? ' (Default)' : '') })),
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Student UUID"
        placeholder="Enter student UUID"
        error={errors.studentUuid?.message}
        {...register('studentUuid')}
      />
      <Input
        label="Course UUID"
        placeholder="Enter course UUID"
        error={errors.courseUuid?.message}
        {...register('courseUuid')}
      />
      <Select
        label="Template"
        options={templateOptions}
        error={errors.templateUuid?.message}
        {...register('templateUuid')}
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          Issue Certificate
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Revoke Certificate Form (inside Modal)                             */
/* ------------------------------------------------------------------ */
function RevokeCertificateForm({ certificate, onSubmit, loading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(revokeSchema),
    defaultValues: { reason: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="bg-surface-alt rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">Certificate ID:</span>
          <span className="font-mono text-text-primary">{certificate?.certificateId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Student:</span>
          <span className="text-text-primary">{certificate?.studentName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Course:</span>
          <span className="text-text-primary">{certificate?.courseName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Issue Date:</span>
          <span className="text-text-primary">
            {certificate?.issueDate
              ? new Date(certificate.issueDate).toLocaleDateString()
              : '--'}
          </span>
        </div>
      </div>

      <Textarea
        label="Reason for Revocation"
        rows={3}
        placeholder="Enter the reason for revoking this certificate..."
        error={errors.reason?.message}
        {...register('reason')}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" variant="danger" loading={loading}>
          Revoke Certificate
        </Button>
      </div>
    </form>
  );
}

/* ================================================================== */
/*  CertificatesPage                                                   */
/* ================================================================== */
export default function CertificatesPage() {
  const queryClient = useQueryClient();

  /* ---- State ---- */
  const [activeTab, setActiveTab] = useState('templates');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Template modals
  const {
    modalOpen: templateModalOpen,
    editing: editingTemplate,
    openCreate: openCreateTemplate,
    openEdit: openEditTemplate,
    closeModal: closeTemplateModal,
  } = useCrudModal();
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Certificate modals
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [viewCert, setViewCert] = useState(null);
  const [revokeCert, setRevokeCert] = useState(null);

  /* ---- Templates Query ---- */
  const { data: templatesResponse, isLoading: templatesLoading } = useQuery({
    queryKey: ['certificate-templates'],
    queryFn: getTemplates,
  });

  const templates = templatesResponse?.data || [];

  /* ---- Certificates Query ---- */
  const { data: certsResponse, isLoading: certsLoading } = useQuery({
    queryKey: ['certificates', search, statusFilter, page],
    queryFn: () =>
      getCertificates({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: activeTab === 'certificates',
    placeholderData: keepPreviousData,
  });

  const certificates = certsResponse?.data || [];
  const certsTotalPages = certsResponse?.pagination?.pages || 1;

  /* ---- Template Mutations ---- */
  const createTemplateMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
      toast.success('Template created successfully');
      closeTemplateModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create template');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ uuid, data }) => updateTemplate(uuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
      toast.success('Template updated successfully');
      closeTemplateModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update template');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
      toast.success('Template deleted successfully');
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete template');
    },
  });

  /* ---- Certificate Mutations ---- */
  const issueCertificateMutation = useMutation({
    mutationFn: issueCertificate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      toast.success('Certificate issued successfully');
      setIssueModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to issue certificate');
    },
  });

  const revokeCertificateMutation = useMutation({
    mutationFn: ({ uuid, data }) => revokeCertificate(uuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      toast.success('Certificate revoked successfully');
      setRevokeCert(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to revoke certificate');
    },
  });

  /* ---- Handlers ---- */
  const handleTemplateFormSubmit = (data) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ uuid: editingTemplate.uuid, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleIssueSubmit = (data) => {
    issueCertificateMutation.mutate(data);
  };

  const handleRevokeSubmit = (data) => {
    revokeCertificateMutation.mutate({ uuid: revokeCert.uuid, data });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setSearch('');
    setStatusFilter('');
  };

  /* ---- Certificate Columns ---- */
  const certificateColumns = [
    {
      key: 'certificateId',
      header: 'Certificate ID',
      render: (row) => (
        <span className="font-mono text-xs">{row.certificateId}</span>
      ),
    },
    {
      key: 'studentName',
      header: 'Student Name',
      render: (row) => (
        <div>
          <div className="font-medium">{row.studentName}</div>
          {row.studentEmail && (
            <div className="text-xs text-text-muted">{row.studentEmail}</div>
          )}
        </div>
      ),
    },
    {
      key: 'courseName',
      header: 'Course Name',
      render: (row) => row.courseName,
    },
    {
      key: 'issueDate',
      header: 'Issue Date',
      render: (row) =>
        row.issueDate ? new Date(row.issueDate).toLocaleDateString() : '--',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={certificateStatusBadge[row.status] || 'default'}>
          {row.status}
        </Badge>
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
            onClick={() => setViewCert(row)}
            title="View"
          >
            <Eye className="w-4 h-4" />
          </Button>
          {row.status === 'issued' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRevokeCert(row)}
              title="Revoke"
            >
              <ShieldOff className="w-4 h-4 text-danger" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  /* ---- Render ---- */
  return (
    <div>
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Certificates</h1>
          <p className="text-text-secondary mt-1">Generate and manage course certificates</p>
        </div>
        {activeTab === 'templates' && (
          <Button onClick={openCreateTemplate}>
            <Plus className="w-4 h-4" />
            Create Template
          </Button>
        )}
        {activeTab === 'certificates' && (
          <Button onClick={() => setIssueModalOpen(true)}>
            <Award className="w-4 h-4" />
            Issue Certificate
          </Button>
        )}
      </div>

      {/* ---- Tabs ---- */}
      <div className="mt-6 bg-white rounded-xl border border-surface-border">
        <div className="px-5 pt-4">
          <TabGroup tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />
        </div>

        {/* ============================================================ */}
        {/*  Tab 1 -- Templates                                          */}
        {/* ============================================================ */}
        {activeTab === 'templates' && (
          <div className="p-5">
            {templatesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : templates.length === 0 ? (
              <div className="py-16 text-center text-text-muted text-sm">
                No templates found. Create your first certificate template.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {templates.map((template) => (
                  <div
                    key={template.uuid}
                    className="border border-surface-border rounded-xl p-5 flex flex-col justify-between hover:shadow-sm transition-shadow"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-text-primary truncate">
                          {template.title}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {template.isDefault && (
                            <Badge variant="info">Default</Badge>
                          )}
                          <Badge variant="default">{template.borderStyle}</Badge>
                        </div>
                      </div>

                      {/* Subtitle */}
                      <p className="text-sm text-text-secondary mb-2">
                        {template.subtitle}
                      </p>

                      {/* Signature */}
                      {(template.signatureName || template.signatureTitle) && (
                        <div className="text-sm text-text-muted mb-3">
                          {template.signatureName && (
                            <div>Signed by: {template.signatureName}</div>
                          )}
                          {template.signatureTitle && (
                            <div className="text-xs">{template.signatureTitle}</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-surface-border">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditTemplate(template)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(template)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-danger" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/*  Tab 2 -- Issued Certificates                                */}
        {/* ============================================================ */}
        {activeTab === 'certificates' && (
          <>
            <div className="px-5 pt-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <SearchBar
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                placeholder="Search by student, course, or certificate ID..."
              />
              <Select
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-40"
              />
            </div>

            <div className="mt-2">
              <DataTable
                columns={certificateColumns}
                data={certificates}
                loading={certsLoading}
                emptyMessage="No certificates found."
              />
            </div>

            <div className="px-5 py-4 border-t border-surface-border">
              <Pagination page={page} totalPages={certsTotalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      {/* ---- Template Create / Edit Modal ---- */}
      <Modal
        isOpen={templateModalOpen}
        onClose={closeTemplateModal}
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
        size="lg"
      >
        <TemplateForm
          key={editingTemplate?.uuid || 'new'}
          defaultValues={editingTemplate}
          isEdit={!!editingTemplate}
          onSubmit={handleTemplateFormSubmit}
          loading={createTemplateMutation.isPending || updateTemplateMutation.isPending}
        />
      </Modal>

      {/* ---- Delete Template Confirm ---- */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTemplateMutation.mutate(deleteTarget.uuid)}
        title="Delete Template"
        message={`Are you sure you want to delete the template "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />

      {/* ---- Issue Certificate Modal ---- */}
      <Modal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title="Issue Certificate"
      >
        <IssueCertificateForm
          key="issue"
          templates={templates}
          onSubmit={handleIssueSubmit}
          loading={issueCertificateMutation.isPending}
        />
      </Modal>

      {/* ---- View Certificate Modal ---- */}
      <Modal
        isOpen={!!viewCert}
        onClose={() => setViewCert(null)}
        title="Certificate Details"
        size="lg"
      >
        {viewCert && (
          <div className="space-y-4">
            <div className="bg-surface-alt rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Certificate ID:</span>
                <span className="font-mono text-text-primary">{viewCert.certificateId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Student:</span>
                <span className="text-text-primary">{viewCert.studentName}</span>
              </div>
              {viewCert.studentEmail && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Email:</span>
                  <span className="text-text-primary">{viewCert.studentEmail}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-muted">Course:</span>
                <span className="text-text-primary">{viewCert.courseName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Issue Date:</span>
                <span className="text-text-primary">
                  {viewCert.issueDate
                    ? new Date(viewCert.issueDate).toLocaleDateString()
                    : '--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Status:</span>
                <Badge variant={certificateStatusBadge[viewCert.status] || 'default'}>
                  {viewCert.status}
                </Badge>
              </div>
              {viewCert.status === 'revoked' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Revoked At:</span>
                    <span className="text-text-primary">
                      {viewCert.revokedAt
                        ? new Date(viewCert.revokedAt).toLocaleDateString()
                        : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Reason:</span>
                    <span className="text-text-primary">{viewCert.revokeReason}</span>
                  </div>
                </>
              )}
            </div>

            {/* Certificate visual preview */}
            {(() => {
              const tpl = templates.find((t) => t.uuid === viewCert.templateUuid);
              return (
                <CertificatePreview
                  title={tpl?.title || 'Certificate of Completion'}
                  subtitle={tpl?.subtitle || 'has successfully completed'}
                  bodyText={tpl?.bodyText || 'This is to certify that'}
                  signatureName={tpl?.signatureName || ''}
                  signatureTitle={tpl?.signatureTitle || ''}
                  borderStyle={tpl?.borderStyle || 'classic'}
                />
              );
            })()}
          </div>
        )}
      </Modal>

      {/* ---- Revoke Certificate Modal ---- */}
      <Modal
        isOpen={!!revokeCert}
        onClose={() => setRevokeCert(null)}
        title="Revoke Certificate"
      >
        {revokeCert && (
          <RevokeCertificateForm
            key={revokeCert.uuid}
            certificate={revokeCert}
            onSubmit={handleRevokeSubmit}
            loading={revokeCertificateMutation.isPending}
          />
        )}
      </Modal>
    </div>
  );
}
