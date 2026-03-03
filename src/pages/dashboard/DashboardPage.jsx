import { useQuery } from '@tanstack/react-query';
import { getStats, getRecentEnrollments, getRecentActivity } from '../../api/dashboard';
import StatsCard from '../../components/shared/StatsCard';
import Spinner from '../../components/ui/Spinner';
import { getInitials, formatDate, formatRelativeTime } from '../../utils/formatters';
import {
  Users,
  DollarSign,
  ClipboardList,
  TrendingUp,
  UserPlus,
  BookOpen,
  CreditCard,
  MessageSquare,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Activity-type styling                                             */
/* ------------------------------------------------------------------ */
const activityConfig = {
  enrollment: { dot: 'bg-primary', icon: UserPlus },
  submission: { dot: 'bg-success', icon: BookOpen },
  course: { dot: 'bg-success', icon: BookOpen },
  payment: { dot: 'bg-warning', icon: CreditCard },
  review: { dot: 'bg-danger', icon: MessageSquare },
};

function getActivityStyle(type) {
  return activityConfig[type] || { dot: 'bg-text-muted', icon: MessageSquare };
}

/* ------------------------------------------------------------------ */
/*  Stat card config                                                  */
/* ------------------------------------------------------------------ */
const statCards = [
  { key: 'totalStudents', title: 'Total Students', icon: Users, color: 'primary', prefix: '' },
  { key: 'monthlyRevenue', title: 'Monthly Revenue', icon: DollarSign, color: 'success', prefix: '$' },
  { key: 'pendingReviews', title: 'Pending Reviews', icon: ClipboardList, color: 'warning', prefix: '' },
  { key: 'completionRate', title: 'Completion Rate', icon: TrendingUp, color: 'danger', prefix: '', suffix: '%' },
];

/* ================================================================== */
/*  DashboardPage                                                     */
/* ================================================================== */
export default function DashboardPage() {
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery({ queryKey: ['dashboard-stats'], queryFn: getStats });

  const {
    data: enrollments,
    isLoading: enrollmentsLoading,
    isError: enrollmentsError,
  } = useQuery({ queryKey: ['dashboard-enrollments'], queryFn: getRecentEnrollments });

  const {
    data: activity,
    isLoading: activityLoading,
    isError: activityError,
  } = useQuery({ queryKey: ['dashboard-activity'], queryFn: getRecentActivity });

  /* ---- Loading state ---- */
  if (statsLoading && enrollmentsLoading && activityLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  /* ---- Error state ---- */
  if (statsError && enrollmentsError && activityError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-danger font-medium text-lg">Failed to load dashboard data</p>
        <p className="text-text-secondary mt-1 text-sm">
          Please check your connection and try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ---- Header ---- */}
      <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
      <p className="text-text-secondary mt-1">Welcome to the admin panel</p>

      {/* ---- Stat Cards ---- */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <div className="col-span-full flex justify-center py-8">
            <Spinner />
          </div>
        ) : statsError ? (
          <div className="col-span-full text-center py-8 text-danger text-sm">
            Unable to load statistics.
          </div>
        ) : (
          statCards.map((card) => {
            const stat = stats?.[card.key];
            const value = stat?.value ?? '--';
            const displayValue = `${card.prefix}${value}${card.suffix || ''}`;

            return (
              <StatsCard
                key={card.key}
                title={card.title}
                value={displayValue}
                trend={stat?.trend}
                trendUp={stat?.trendUp}
                icon={card.icon}
                color={card.color}
              />
            );
          })
        )}
      </div>

      {/* ---- Two-column section ---- */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ---- Recent Enrollments ---- */}
        <div className="bg-white rounded-xl border border-surface-border">
          <div className="px-5 py-4 border-b border-surface-border">
            <h2 className="text-lg font-semibold text-text-primary">Recent Enrollments</h2>
          </div>

          {enrollmentsLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : enrollmentsError ? (
            <div className="px-5 py-10 text-center text-danger text-sm">
              Unable to load recent enrollments.
            </div>
          ) : !enrollments?.length ? (
            <div className="px-5 py-10 text-center text-text-muted text-sm">
              No recent enrollments found.
            </div>
          ) : (
            <ul className="divide-y divide-surface-border">
              {enrollments.map((enrollment, idx) => (
                <li key={enrollment.id || idx} className="px-5 py-4 flex items-center gap-4 hover:bg-surface-alt transition-colors">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary-50 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                    {getInitials(enrollment.studentName)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {enrollment.studentName}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {enrollment.email || enrollment.courseName}
                    </p>
                  </div>

                  {/* Date */}
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    {formatDate(enrollment.enrolledAt || enrollment.date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---- Recent Activity ---- */}
        <div className="bg-white rounded-xl border border-surface-border">
          <div className="px-5 py-4 border-b border-surface-border">
            <h2 className="text-lg font-semibold text-text-primary">Recent Activity</h2>
          </div>

          {activityLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : activityError ? (
            <div className="px-5 py-10 text-center text-danger text-sm">
              Unable to load recent activity.
            </div>
          ) : !activity?.length ? (
            <div className="px-5 py-10 text-center text-text-muted text-sm">
              No recent activity found.
            </div>
          ) : (
            <ul className="divide-y divide-surface-border">
              {activity.map((item, idx) => {
                const style = getActivityStyle(item.type);
                const ActivityIcon = style.icon;

                return (
                  <li key={item.id || idx} className="px-5 py-4 flex items-start gap-3 hover:bg-surface-alt transition-colors">
                    {/* Timeline dot */}
                    <div className="mt-1 shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${style.dot} bg-opacity-10`}>
                        <ActivityIcon className={`w-4 h-4 ${style.dot.replace('bg-', 'text-')}`} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary leading-snug">
                        {item.message}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {formatRelativeTime(item.createdAt || item.date)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
