import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Pencil,
  ToggleLeft,
  ToggleRight,
  Download,
  Check,
  X,
  ExternalLink,
  CreditCard,
} from 'lucide-react';
import {
  getPlans,
  createPlan,
  updatePlan,
  togglePlanStatus,
  getTransactions,
  approveTransaction,
  rejectTransaction,
  exportTransactionsCsv,
} from '../../api/payments';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import SearchBar from '../../components/ui/SearchBar';
import TabGroup from '../../components/ui/TabGroup';
import Pagination from '../../components/ui/Pagination';
import DataTable from '../../components/ui/DataTable';
import Spinner from '../../components/ui/Spinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { paymentStatusBadge } from '../../utils/statusConfig';
import { useCrudModal } from '../../hooks/useCrudModal';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const TABS = [
  { key: 'plans', label: 'Plans' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'verify', label: 'Verify Payments' },
];

const PAGE_SIZE = 10;

const PAYMENT_METHODS = [
  { value: '', label: 'All Methods' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'manual', label: 'Manual' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

/* ------------------------------------------------------------------ */
/*  Zod schemas                                                        */
/* ------------------------------------------------------------------ */
const planSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.coerce.number().min(0, 'Price must be non-negative'),
  interval: z.enum(['monthly', 'yearly']),
  features: z.string().optional(),
  maxCourses: z.coerce.number().int(),
});

/* ------------------------------------------------------------------ */
/*  Plan Form (used inside Modal)                                      */
/* ------------------------------------------------------------------ */
function PlanForm({ defaultValues, isEdit, onSubmit, loading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(planSchema),
    defaultValues: isEdit
      ? {
          name: defaultValues?.name || '',
          price: defaultValues?.price || 0,
          interval: defaultValues?.interval || 'monthly',
          features: (defaultValues?.features || []).join(', '),
          maxCourses: defaultValues?.maxCourses ?? -1,
        }
      : { name: '', price: 0, interval: 'monthly', features: '', maxCourses: -1 },
  });

  const submit = (data) => {
    const features = data.features
      ? data.features.split(',').map((f) => f.trim()).filter(Boolean)
      : [];
    onSubmit({ ...data, features });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <Input
        label="Plan Name"
        placeholder="e.g. Premium"
        error={errors.name?.message}
        {...register('name')}
      />
      <Input
        label="Price"
        type="number"
        step="0.01"
        placeholder="19.99"
        error={errors.price?.message}
        {...register('price')}
      />
      <Select
        label="Interval"
        options={[
          { value: 'monthly', label: 'Monthly' },
          { value: 'yearly', label: 'Yearly' },
        ]}
        error={errors.interval?.message}
        {...register('interval')}
      />
      <Input
        label="Features (comma-separated)"
        placeholder="Feature 1, Feature 2, Feature 3"
        error={errors.features?.message}
        {...register('features')}
      />
      <Input
        label="Max Courses (-1 for unlimited)"
        type="number"
        placeholder="-1"
        error={errors.maxCourses?.message}
        {...register('maxCourses')}
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Create Plan'}
        </Button>
      </div>
    </form>
  );
}

/* ================================================================== */
/*  PaymentsPage                                                       */
/* ================================================================== */
export default function PaymentsPage() {
  const queryClient = useQueryClient();

  /* ---- State ---- */
  const [activeTab, setActiveTab] = useState('plans');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const {
    modalOpen: planModalOpen,
    editing: editingPlan,
    openCreate: openCreatePlan,
    openEdit: openEditPlan,
    closeModal: closePlanModal,
  } = useCrudModal();

  // Verify tab confirm dialogs
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'approve'|'reject', uuid, transactionId }

  // Transactions tab
  const [txPage, setTxPage] = useState(1);
  const [txSearch, setTxSearch] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState('');

  /* ---- Plans Query ---- */
  const { data: plansResponse, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: getPlans,
  });

  const plans = plansResponse?.data || [];

  /* ---- Transactions Query ---- */
  const { data: txResponse, isLoading: txLoading } = useQuery({
    queryKey: ['transactions', txSearch, txStatusFilter, txPage],
    queryFn: () =>
      getTransactions({
        search: txSearch || undefined,
        status: txStatusFilter || undefined,
        page: txPage,
        limit: PAGE_SIZE,
      }),
    enabled: activeTab === 'transactions',
    keepPreviousData: true,
  });

  const transactions = txResponse?.data || [];
  const txTotalPages = txResponse?.pagination?.pages || 1;

  /* ---- Verify (Pending) Transactions Query ---- */
  const { data: pendingResponse, isLoading: pendingLoading } = useQuery({
    queryKey: ['transactions', 'pending', search, page],
    queryFn: () =>
      getTransactions({
        status: 'pending',
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: activeTab === 'verify',
    keepPreviousData: true,
  });

  const pendingTransactions = pendingResponse?.data || [];
  const pendingTotalPages = pendingResponse?.pagination?.pages || 1;

  /* ---- Plan Mutations ---- */
  const createPlanMutation = useMutation({
    mutationFn: createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan created successfully');
      closePlanModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create plan');
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ uuid, data }) => updatePlan(uuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan updated successfully');
      closePlanModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update plan');
    },
  });

  const togglePlanMutation = useMutation({
    mutationFn: togglePlanStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan status updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to toggle plan status');
    },
  });

  /* ---- Transaction Mutations ---- */
  const approveMutation = useMutation({
    mutationFn: approveTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction approved');
      setConfirmAction(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to approve transaction');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction rejected');
      setConfirmAction(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to reject transaction');
    },
  });

  /* ---- Handlers ---- */
  const handlePlanFormSubmit = (data) => {
    if (editingPlan) {
      updatePlanMutation.mutate({ uuid: editingPlan.uuid, data });
    } else {
      createPlanMutation.mutate(data);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setSearch('');
    setTxPage(1);
    setTxSearch('');
    setTxStatusFilter('');
    setStatusFilter('');
  };

  const handleExportCsv = async () => {
    try {
      const blob = await exportTransactionsCsv({
        search: txSearch || undefined,
        status: txStatusFilter || undefined,
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'transactions.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'approve') {
      approveMutation.mutate(confirmAction.uuid);
    } else {
      rejectMutation.mutate(confirmAction.uuid);
    }
  };

  /* ---- Transaction columns ---- */
  const transactionColumns = [
    {
      key: 'transactionId',
      header: 'Transaction ID',
      render: (row) => (
        <span className="font-mono text-xs">{row.transactionId}</span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (row) => (
        <div>
          <div className="font-medium">{row.userName}</div>
          <div className="text-xs text-text-muted">{row.userEmail}</div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (row) => row.planName,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <span className="font-semibold">
          ${row.amount?.toFixed(2)} {row.currency}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      render: (row) => (
        <span className="capitalize">{row.paymentMethod?.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (row) =>
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '--',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={paymentStatusBadge[row.status] || 'default'}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.status === 'pending' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setConfirmAction({ type: 'approve', uuid: row.uuid, transactionId: row.transactionId })
                }
                title="Approve"
              >
                <Check className="w-4 h-4 text-success" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setConfirmAction({ type: 'reject', uuid: row.uuid, transactionId: row.transactionId })
                }
                title="Reject"
              >
                <X className="w-4 h-4 text-danger" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  /* ---- Verify columns ---- */
  const verifyColumns = [
    {
      key: 'transactionId',
      header: 'Transaction ID',
      render: (row) => (
        <span className="font-mono text-xs">{row.transactionId}</span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (row) => (
        <div>
          <div className="font-medium">{row.userName}</div>
          <div className="text-xs text-text-muted">{row.userEmail}</div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (row) => row.planName,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <span className="font-semibold">
          ${row.amount?.toFixed(2)} {row.currency}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      render: (row) => (
        <span className="capitalize">{row.paymentMethod?.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'proof',
      header: 'Proof',
      render: (row) =>
        row.proofUrl ? (
          <a
            href={row.proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
          >
            View <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-text-muted text-xs">No proof</span>
        ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (row) =>
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '--',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setConfirmAction({ type: 'approve', uuid: row.uuid, transactionId: row.transactionId })
            }
            title="Approve"
          >
            <Check className="w-4 h-4 text-success" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setConfirmAction({ type: 'reject', uuid: row.uuid, transactionId: row.transactionId })
            }
            title="Reject"
          >
            <X className="w-4 h-4 text-danger" />
          </Button>
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
          <h1 className="text-2xl font-bold text-text-primary">Payments & Subscriptions</h1>
          <p className="text-text-secondary mt-1">Manage plans, transactions, and verify payments</p>
        </div>
        {activeTab === 'plans' && (
          <Button onClick={openCreatePlan}>
            <CreditCard className="w-4 h-4" />
            Add Plan
          </Button>
        )}
        {activeTab === 'transactions' && (
          <Button variant="secondary" onClick={handleExportCsv}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        )}
      </div>

      {/* ---- Tabs ---- */}
      <div className="mt-6 bg-white rounded-xl border border-surface-border">
        <div className="px-5 pt-4">
          <TabGroup tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />
        </div>

        {/* ============================================================ */}
        {/*  Tab 1 — Plans                                                */}
        {/* ============================================================ */}
        {activeTab === 'plans' && (
          <div className="p-5">
            {plansLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : plans.length === 0 ? (
              <div className="py-16 text-center text-text-muted text-sm">
                No plans found. Create your first plan.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {plans.map((plan) => (
                  <div
                    key={plan.uuid}
                    className="border border-surface-border rounded-xl p-5 flex flex-col justify-between hover:shadow-sm transition-shadow"
                  >
                    <div>
                      {/* Plan header */}
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-text-primary">{plan.name}</h3>
                        <Badge variant={plan.status === 'active' ? 'success' : 'danger'}>
                          {plan.status}
                        </Badge>
                      </div>

                      {/* Price */}
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-text-primary">
                          ${plan.price?.toFixed(2)}
                        </span>
                        <span className="text-text-muted text-sm ml-1">
                          /{plan.interval === 'yearly' ? 'year' : 'month'}
                        </span>
                      </div>

                      {/* Max courses */}
                      <div className="text-sm text-text-secondary mb-3">
                        {plan.maxCourses === -1
                          ? 'Unlimited courses'
                          : `Up to ${plan.maxCourses} courses`}
                      </div>

                      {/* Features */}
                      <ul className="space-y-2 mb-4">
                        {(plan.features || []).map((feature, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-text-secondary"
                          >
                            <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-surface-border">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditPlan(plan)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePlanMutation.mutate(plan.uuid)}
                        title={plan.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {plan.status === 'active' ? (
                          <ToggleRight className="w-4 h-4 text-success" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-text-muted" />
                        )}
                        {plan.status === 'active' ? 'Active' : 'Inactive'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/*  Tab 2 — Transactions                                         */}
        {/* ============================================================ */}
        {activeTab === 'transactions' && (
          <>
            <div className="px-5 pt-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <SearchBar
                value={txSearch}
                onChange={(v) => { setTxSearch(v); setTxPage(1); }}
                placeholder="Search by user, email, or transaction ID..."
              />
              <Select
                options={STATUS_OPTIONS}
                value={txStatusFilter}
                onChange={(e) => { setTxStatusFilter(e.target.value); setTxPage(1); }}
                className="w-40"
              />
            </div>

            <div className="mt-2">
              <DataTable
                columns={transactionColumns}
                data={transactions}
                loading={txLoading}
                emptyMessage="No transactions found."
              />
            </div>

            <div className="px-5 py-4 border-t border-surface-border">
              <Pagination page={txPage} totalPages={txTotalPages} onPageChange={setTxPage} />
            </div>
          </>
        )}

        {/* ============================================================ */}
        {/*  Tab 3 — Verify Payments                                      */}
        {/* ============================================================ */}
        {activeTab === 'verify' && (
          <>
            <div className="px-5 pt-4">
              <SearchBar
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                placeholder="Search pending payments..."
              />
            </div>

            <div className="mt-2">
              <DataTable
                columns={verifyColumns}
                data={pendingTransactions}
                loading={pendingLoading}
                emptyMessage="No pending payments to verify."
              />
            </div>

            <div className="px-5 py-4 border-t border-surface-border">
              <Pagination page={page} totalPages={pendingTotalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      {/* ---- Plan Create / Edit Modal ---- */}
      <Modal
        isOpen={planModalOpen}
        onClose={closePlanModal}
        title={editingPlan ? 'Edit Plan' : 'Create Plan'}
        size="md"
      >
        <PlanForm
          key={editingPlan?.uuid || 'new'}
          defaultValues={editingPlan}
          isEdit={!!editingPlan}
          onSubmit={handlePlanFormSubmit}
          loading={createPlanMutation.isPending || updatePlanMutation.isPending}
        />
      </Modal>

      {/* ---- Confirm Dialog for Approve / Reject ---- */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title={confirmAction?.type === 'approve' ? 'Approve Transaction' : 'Reject Transaction'}
        message={
          confirmAction?.type === 'approve'
            ? `Are you sure you want to approve transaction ${confirmAction?.transactionId}? This will mark it as completed.`
            : `Are you sure you want to reject transaction ${confirmAction?.transactionId}? This will mark it as failed.`
        }
        confirmText={confirmAction?.type === 'approve' ? 'Approve' : 'Reject'}
        confirmVariant={confirmAction?.type === 'approve' ? 'primary' : 'danger'}
      />
    </div>
  );
}
