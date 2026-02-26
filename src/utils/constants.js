export const API_URL = import.meta.env.VITE_API_URL || '/api';

export const ROLES = {
  ADMIN: 'admin',
  MENTOR: 'mentor',
  STUDENT: 'student',
};

export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  COMPLETED: 'completed',
  DRAFT: 'draft',
  PUBLISHED: 'published',
  REVIEWED: 'reviewed',
  EXPIRED: 'expired',
};
