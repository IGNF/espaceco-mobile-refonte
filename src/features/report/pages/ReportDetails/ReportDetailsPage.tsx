import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type OlMap from 'ol/Map';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Alert } from '@/shared/ui/Alert';
import type { AppReport } from '@/domain/report/models';
import { ReportStatus, ClosedReportStatus } from '@ign/mobile-core';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { useReportReply } from '@/features/report/hooks/useReportReply';
import { ATTACHMENT_UPLOAD_FAILED_ERROR_CODE, useSubmitReport } from '@/features/report/hooks/useSubmitReport';
import { getStatusColor } from '@/shared/utils/reportStatus';
import { formatDateTime } from '@/shared/utils/date';
import { parsePointGeometry } from '@/shared/utils/geometry';
import { CreateOrEditReportPage } from '@/features/report/pages/CreateOrEditReport/CreateOrEditReportPage';
import { ReportStorageAdapter } from '@/infra/storage/ReportStorageAdapter';

import { Button } from '@/shared/ui/Button';
import IconPencil from '@/shared/assets/icons/icon-pencil.svg?react';
import IconSend from '@/shared/assets/icons/icon-send.svg?react';
import IconDelete from '@/shared/assets/icons/icon-delete.svg?react';

import styles from './ReportDetailsPage.module.css';
import replyFormStyles from './ReplyForm.module.css';
import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';
import inputs from '@/shared/styles/inputs.module.css';
import buttonStyles from '@/shared/ui/Button/Button.module.css';

const reportStorage = new ReportStorageAdapter();

const CLOSED_STATUSES = Object.values(ClosedReportStatus) as string[];

const ALL_REPLY_STATUS_OPTIONS: ReportStatus[] = [
  ReportStatus.Submit,
  ReportStatus.Pending,
  ReportStatus.Pending_Qualification,
  ReportStatus.Pending_Entry,
  ReportStatus.Pending_Validation,
  ReportStatus.Valid,
  ReportStatus.Valid_Already_Treated,
  ReportStatus.Reject,
  ReportStatus.Reject_Irrelevant,
];

export interface ReportDetailsPageProps {
  isOpen: boolean;
  report: AppReport | null;
  onClose: () => void;
  onBack: () => void;
  onReplySuccess?: (updatedReport: AppReport) => void;
  map?: OlMap | null;
  onSearchPanelVisibilityChange?: (isVisible: boolean) => void;
}

export function ReportDetailsPage({
  isOpen,
  report,
  onClose,
  onBack,
  onReplySuccess,
  map,
  onSearchPanelVisibilityChange,
}: ReportDetailsPageProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeCommunity } = useCommunity();
  const { submitReply, isSubmitting, error: replyError } = useReportReply();
  const { submitReport, isSubmitting: isSending, error: sendError } = useSubmitReport();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyTitle, setReplyTitle] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState(ReportStatus.Submit);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isDraft = report?.status === ReportStatus.Draft;

  // Check if user is a member of the report's community
  const reportCommunityId = report?.attributes?.raw?.[0]?.community ?? report?.communityId;
  const canReply = user?.communities_member?.some(
    (m: { community_id: number }) => m.community_id === reportCommunityId
  ) ?? false;

  // Determine if user can set closing statuses (valid, valid0, reject, reject0)
  // here is the implementation with the attribute allMembersCanValid and the validator - will be used this way in the future
  // const canUseClosingStatus =
  //   activeCommunity?.allMembersCanValid === true ||
  //   (report?.validator?.id != null && report.validator.id === user?.id);
  // in the meantime, we'll use a simple boolean
  const canUseClosingStatus = true;

  const replyStatusOptions = canUseClosingStatus
    ? ALL_REPLY_STATUS_OPTIONS
    : ALL_REPLY_STATUS_OPTIONS.filter((s) => !CLOSED_STATUSES.includes(s));

  const handleRespond = () => {
    setReplyTitle('');
    setReplyText('');
    setReplyStatus(report?.status ?? ReportStatus.Submit);
    setValidationError(null);
    setIsReplyOpen(true);
  };

  const handleReplyClose = () => {
    setIsReplyOpen(false);
  };

  const handleReplySubmit = async () => {
    if (!report) return;

    // Check if the reply is empty and the status is the same as the report status
    if (replyText.trim().length === 0 && replyStatus === report.status) {
      setValidationError(t('reports.details.reply.validationError'));
      return;
    }

    setValidationError(null);
    const updatedReport = await submitReply(report.id, replyTitle, replyText.trim(), replyStatus);
    if (updatedReport) {
      setIsReplyOpen(false);
      onReplySuccess?.(updatedReport);
    }
  };

  const handleEditReport = () => {
    setIsEditOpen(true);
  };

  const handleEditBack = () => {
    setIsEditOpen(false);
  };

  const handleEditClose = () => {
    setIsEditOpen(false);
    onClose();
  };

  const handleSendReport = async () => {
    if (!report) return;
    const result = await submitReport(report);
    if (result) {
      onBack();
    }
  };

  const handleDeleteReport = () => {
    setIsDeleteOpen(true);
  };

  const handleDeleteClose = () => {
    setIsDeleteOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!report) return;
    setIsDeleting(true);
    try {
      await reportStorage.deleteReport(report.id);
      setIsDeleteOpen(false);
      onBack();
    } finally {
      setIsDeleting(false);
    }
  };

  const sendErrorKey = sendError?.message === ATTACHMENT_UPLOAD_FAILED_ERROR_CODE
    ? 'reports.details.attachmentUploadWarning'
    : 'reports.details.sendError'

  if (!report) {
    return null;
  }

  const statusColor = getStatusColor(report.status);
  const statusLabel = t(`reports.status.${report.status}`, report.status);
  const position = parsePointGeometry(report.geometry);
  const themeName = report.attributes?.themeName || t('reports.details.notAvailable');
  const communeName = report.commune?.title || t('reports.details.notAvailable');
  const departmentName = report.departement?.name || t('reports.details.notAvailable');
  const authorName = report.author?.username || t('reports.details.notAvailable');
  const responses = report.replies || [];

  // Format attributes for display
  // TODO: Implement this - look at how it's done in the previous app
  const formatAttributes = (): string | null => {
    return '';
  };

  const attributesText = formatAttributes();

  return (
    <SlideUpPage
      isOpen={isOpen}
      onClose={onClose}
      level={2}
      className={isEditOpen ? styles.hiddenBehindChild : undefined}
    >
      <PageHeader
        title={t('reports.details.headerTitle')}
        subtitle={t('reports.details.headerSubtitle')}
        showBackButton
        onBack={onBack}
        onClose={onClose}
      />

      <main className={screen.screenContainer + " " + styles.content}>
        <div className={styles.titleSection}>
          <h1 className={typography.title}>{t('reports.details.title')}</h1>
          <p className={typography.subtitle}>
            {t('reports.details.subtitle')}{report.id}
          </p>
        </div>

        <div className={styles.detailsTable}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.identifier')} :</span>
            <span className={styles.detailValue}>#{report.id}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.status')} :</span>
            <span className={styles.detailValue}>
              <span
                className={styles.statusIndicator}
                style={{ backgroundColor: statusColor }}
              />
              {statusLabel}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.group')} :</span>
            <span className={styles.detailValue}>{activeCommunity?.name || t('reports.details.notAvailable')}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.author')} :</span>
            <span className={styles.detailValue}>{authorName}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.theme')} :</span>
            <span className={styles.detailValue}>{themeName}</span>
          </div>

          {attributesText && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('reports.details.attributes')} :</span>
              <span className={styles.detailValue}>{attributesText}</span>
            </div>
          )}

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.date')} :</span>
            <span className={styles.detailValue}>{formatDateTime(report.createdAt)}</span>
          </div>

          {position && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('reports.details.position')} :</span>
              <span className={styles.detailValue}>{position.lon.toFixed(6)}, {position.lat.toFixed(6)}</span>
            </div>
          )}

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.commune')} :</span>
            <span className={styles.detailValue}>{communeName}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.department')} :</span>
            <span className={styles.detailValue}>{departmentName}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.comment')} :</span>
            <span className={styles.detailValue}>{report.comment || t('reports.details.notAvailable')}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.responses')} :</span>
            <span className={styles.detailValue}>
              {responses.length > 0
                ? `${responses.length} réponse(s)`
                : t('reports.details.noResponses')}
            </span>
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <>
            {isDraft ? (
              <>
                <Button color="primary" onClick={handleEditReport}>
                  <IconPencil className={buttonStyles.icon} />
                  {t('reports.details.editButton')}
                </Button>
                <Button color="tertiary" onClick={handleSendReport} loading={isSending}>
                  <IconSend className={buttonStyles.icon} />
                  {t('reports.details.sendButton')}
                </Button>
                <Button color="danger" onClick={handleDeleteReport}>
                  <IconDelete className={buttonStyles.icon} />
                  {t('reports.details.deleteButton')}
                </Button>
                {sendError && (
                  <p className={styles.permissionMessage}>
                    {t(sendErrorKey)}
                  </p>
                )}
              </>
            ) : (
              <>
                <Button color="primary" onClick={handleRespond} disabled={!canReply}>
                  {t('reports.details.respondButton')}
                </Button>
                {!canReply && (
                  <p className={styles.permissionMessage}>
                    {t('reports.details.reply.permissionDenied')}
                  </p>
                )}
              </>
            )}
          </>
        </div>
      </main>

      <Alert
        isOpen={isReplyOpen}
        onClose={handleReplyClose}
        title={t('reports.details.reply.dialogTitle')}
        buttons={[
          {
            label: t('reports.details.reply.cancelButton'),
            onClick: handleReplyClose,
            variant: 'outline',
          },
          {
            label: isSubmitting
              ? t('reports.general.loading')
              : t('reports.details.reply.submitButton'),
            onClick: handleReplySubmit,
            color: 'primary',
          },
        ]}
      >
        <div className={replyFormStyles.replyForm}>
          <label className={inputs.label}>
            {t('reports.details.reply.textareaLabel')}
          </label>
          <textarea
            className={inputs.textarea}
            placeholder={t('reports.details.reply.textareaPlaceholder')}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
          />

          <label className={inputs.label}>
            {t('reports.details.reply.statusLabel')}
          </label>
          <select
            className={inputs.select}
            value={replyStatus}
            onChange={(e) => setReplyStatus(e.target.value as ReportStatus)}
          >
            {replyStatusOptions.map((status) => (
              <option key={status} value={status}>
                {t(`reports.status.${status}`, status)}
              </option>
            ))}
          </select>

          {validationError && (
            <p className={replyFormStyles.replyError}>{validationError}</p>
          )}
          {replyError && (
            <p className={replyFormStyles.replyError}>
              {t('reports.details.reply.errorMessage')}
            </p>
          )}
        </div>
      </Alert>

      <Alert
        isOpen={isDeleteOpen}
        onClose={handleDeleteClose}
        title={t('reports.details.delete.dialogTitle', { id: report.id })}
        subtitle={t('reports.details.delete.dialogMessage')}
        buttons={[
          {
            label: isDeleting
              ? t('reports.general.loading')
              : t('reports.details.delete.confirmButton'),
            onClick: handleDeleteConfirm,
            color: 'danger',
          },
          {
            label: t('reports.details.delete.cancelButton'),
            onClick: handleDeleteClose,
            variant: 'outline',
          },
        ]}
      />

      <CreateOrEditReportPage
        isOpen={isEditOpen}
        mode="edit"
        report={report}
        level={3}
        onBack={handleEditBack}
        onClose={handleEditClose}
        map={map}
        onSearchPanelVisibilityChange={onSearchPanelVisibilityChange}
      />
    </SlideUpPage>
  );
}
