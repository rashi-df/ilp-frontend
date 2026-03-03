/* ------------------------------------------------------------------ */
/*  Shared Badge variant maps                                          */
/* ------------------------------------------------------------------ */

/** Payment transaction status → Badge variant */
export const paymentStatusBadge = {
  pending: 'warning',
  completed: 'success',
  failed: 'danger',
  refunded: 'info',
};

/** Certificate status → Badge variant */
export const certificateStatusBadge = {
  issued: 'success',
  revoked: 'danger',
};

/** Notification status → Badge variant */
export const notificationStatusBadge = {
  draft: 'default',
  scheduled: 'warning',
  sent: 'success',
  failed: 'danger',
};

/** Course difficulty level → Badge variant */
export const courseLevelBadge = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger',
};

/** Course publish status → Badge variant */
export const courseStatusBadge = {
  published: 'success',
  draft: 'default',
};

/** Video processing status → { variant, label } */
export const videoStatusBadge = {
  processing: { variant: 'warning', label: 'Processing' },
  ready: { variant: 'success', label: 'Ready' },
  failed: { variant: 'danger', label: 'Failed' },
};
