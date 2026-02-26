import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
  UserPlus,
} from 'lucide-react';
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
} from '../../api/users';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import SearchBar from '../../components/ui/SearchBar';
import TabGroup from '../../components/ui/TabGroup';
import Pagination from '../../components/ui/Pagination';
import DataTable from '../../components/ui/DataTable';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const TABS = [
  { key: 'student', label: 'Students' },
  { key: 'mentor', label: 'Mentors' },
];

const PAGE_SIZE = 10;

/* ------------------------------------------------------------------ */
/*  Zod schemas                                                       */
/* ------------------------------------------------------------------ */
const baseUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

const createUserSchema = baseUserSchema.extend({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['student', 'mentor'], { required_error: 'Role is required' }),
});

const editUserSchema = baseUserSchema;

/* ------------------------------------------------------------------ */
/*  User Form (used inside Modal)                                      */
/* ------------------------------------------------------------------ */
function UserForm({ defaultValues, isEdit, currentRole, onSubmit, loading }) {
  const schema = isEdit ? editUserSchema : createUserSchema;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? { name: defaultValues?.name || '', email: defaultValues?.email || '' }
      : { name: '', email: '', password: '', role: currentRole || 'student' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Full Name"
        placeholder="Enter full name"
        error={errors.name?.message}
        {...register('name')}
      />
      <Input
        label="Email"
        type="email"
        placeholder="Enter email address"
        error={errors.email?.message}
        {...register('email')}
      />
      {!isEdit && (
        <>
          <Input
            label="Password"
            type="password"
            placeholder="Minimum 6 characters"
            error={errors.password?.message}
            {...register('password')}
          />
          <Select
            label="Role"
            options={[
              { value: 'student', label: 'Student' },
              { value: 'mentor', label: 'Mentor' },
            ]}
            error={errors.role?.message}
            {...register('role')}
          />
        </>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Create User'}
        </Button>
      </div>
    </form>
  );
}

/* ================================================================== */
/*  UsersPage                                                          */
/* ================================================================== */
export default function UsersPage() {
  const queryClient = useQueryClient();

  /* ---- State ---- */
  const [activeTab, setActiveTab] = useState('student');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, object = edit

  /* ---- Query ---- */
  const {
    data: usersResponse,
    isLoading,
  } = useQuery({
    queryKey: ['users', activeTab, search, page],
    queryFn: () =>
      getUsers({
        role: activeTab,
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    keepPreviousData: true,
  });

  const users = usersResponse?.data || usersResponse?.users || [];
  const totalPages = usersResponse?.pagination?.pages || 1;

  /* ---- Mutations ---- */
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
      closeModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ uuid, data }) => updateUser(uuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
      closeModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update user');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleUserStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User status updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    },
  });

  /* ---- Handlers ---- */
  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleFormSubmit = (data) => {
    if (editing) {
      updateMutation.mutate({ uuid: editing.uuid, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setSearch('');
  };

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  /* ---- Column definitions ---- */
  const studentColumns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-50 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
            {getInitials(row.name)}
          </div>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    { key: 'email', header: 'Email' },
    {
      key: 'enrolledCourses',
      header: 'Enrolled Courses',
      render: (row) => Array.isArray(row.enrolledCourses) ? row.enrolledCourses.length : (row.enrolledCourses ?? 0),
    },
    {
      key: 'progress',
      header: 'Progress %',
      render: (row) => {
        const pct = Array.isArray(row.progress) ? 0 : (row.progress ?? 0);
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-surface-alt rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-text-muted">{pct}%</span>
          </div>
        );
      },
    },
    {
      key: 'subscription',
      header: 'Subscription',
      render: (row) => {
        const sub = row.subscription;
        const plan = typeof sub === 'object' ? sub?.status || 'none' : sub || 'none';
        return (
          <Badge variant={plan === 'active' ? 'info' : 'default'}>
            {plan === 'none' ? 'Free' : plan}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'danger'}>
          {row.status || 'active'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleMutation.mutate(row.uuid)}
            title={row.status === 'active' ? 'Deactivate' : 'Activate'}
          >
            {row.status === 'active' ? (
              <ToggleRight className="w-4 h-4 text-success" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-text-muted" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  const mentorColumns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-50 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
            {getInitials(row.name)}
          </div>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    { key: 'email', header: 'Email' },
    {
      key: 'assignedCourses',
      header: 'Assigned Courses',
      render: (row) => row.assignedCourses ?? 0,
    },
    {
      key: 'reviewsDone',
      header: 'Reviews Done',
      render: (row) => row.reviewsDone ?? 0,
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (row) => {
        const rating = row.rating ?? 0;
        return (
          <span className="text-sm font-medium text-warning">
            {rating > 0 ? rating.toFixed(1) : '--'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'danger'}>
          {row.status || 'active'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleMutation.mutate(row.uuid)}
            title={row.status === 'active' ? 'Deactivate' : 'Activate'}
          >
            {row.status === 'active' ? (
              <ToggleRight className="w-4 h-4 text-success" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-text-muted" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  const columns = activeTab === 'student' ? studentColumns : mentorColumns;
  const roleLabel = activeTab === 'student' ? 'Student' : 'Mentor';

  return (
    <div>
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Users Management</h1>
          <p className="text-text-secondary mt-1">Manage students and mentors</p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus className="w-4 h-4" />
          Add {roleLabel}
        </Button>
      </div>

      {/* ---- Tabs + Search ---- */}
      <div className="mt-6 bg-white rounded-xl border border-surface-border">
        <div className="px-5 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabGroup tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder={`Search ${roleLabel.toLowerCase()}s...`}
          />
        </div>

        {/* ---- Table ---- */}
        <div className="mt-2">
          <DataTable
            columns={columns}
            data={users}
            loading={isLoading}
            emptyMessage={`No ${roleLabel.toLowerCase()}s found.`}
          />
        </div>

        {/* ---- Pagination ---- */}
        <div className="px-5 py-4 border-t border-surface-border">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {/* ---- Create / Edit Modal ---- */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? `Edit ${roleLabel}` : `Add ${roleLabel}`}
        size="md"
      >
        <UserForm
          key={editing?.uuid || 'new'}
          defaultValues={editing}
          isEdit={!!editing}
          currentRole={activeTab}
          onSubmit={handleFormSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}
