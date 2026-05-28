import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';

import type OlMap from 'ol/Map';
import Overlay from 'ol/Overlay';
import { fromLonLat } from 'ol/proj';

import { ReportStatus, type CommunityLayer } from '@ign/mobile-core';

import type { AppReport } from '@/domain/report/models';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { useReportReply } from '@/features/report/hooks/useReportReply';
import { useSubmitReport } from '@/features/report/hooks/useSubmitReport';
import { getReportSubmitErrorTranslationKey } from '@/features/report/errors/reportSubmitError';
import { formatReportAttributes } from '@/features/report/utils/reportAttributes';
import { CreateOrEditReportPage } from '@/features/report/pages/CreateOrEditReport/CreateOrEditReportPage';
import { removeLocalReportFromMap } from '@/features/map/utils/signalementReportFeatures';

import { ReportStorageAdapter } from '@/infra/storage/ReportStorageAdapter';

import { ALL_REPLY_STATUS_OPTIONS, CLOSED_STATUSES } from '@/shared/constants/report';
import { showToastSafe } from '@/shared/utils/toast';
import { getStatusColor } from '@/shared/utils/reportStatus';
import { formatDateTime } from '@/shared/utils/date';
import { parsePointGeometry } from '@/shared/utils/geometry';
import { getAppErrorTranslationKey } from '@/shared/errors/appError';

import { Button } from '@/shared/ui/Button';

import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Alert } from '@/shared/ui/Alert';
import { Loading } from '@/shared/ui/Loading';
import { joinCSSClassNames } from '@/shared/utils/join';

import IconPencil from '@/shared/assets/icons/icon-pencil.svg?react';
import IconSend from '@/shared/assets/icons/icon-send.svg?react';
import IconDelete from '@/shared/assets/icons/icon-delete.svg?react';
import IconEye from '@/shared/assets/icons/icon-eye.svg?react';
import IconArrowLeft from '@/shared/assets/icons/icon-arrow-left.svg?react';
import IconArrowRight from '@/shared/assets/icons/icon-arrow-right.svg?react';

import styles from './ReportDetailsPage.module.css';
import replyFormStyles from './ReplyForm.module.css';
import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';
import inputs from '@/shared/styles/inputs.module.css';
import buttonStyles from '@/shared/ui/Button/Button.module.css';

const reportStorage = new ReportStorageAdapter();

export interface ReportDetailsPageProps {
  isOpen: boolean;
  report: AppReport | null;
  onClose: () => void;
  onBack: () => void;
  onReplySuccess?: (updatedReport: AppReport) => void;
  map?: OlMap | null;
  vectorLayers?: CommunityLayer[];
  onSearchPanelVisibilityChange?: (isVisible: boolean) => void;
  onMapPickerActiveChange?: (isActive: boolean) => void;
  hasPreviousReport?: boolean;
  hasNextReport?: boolean;
  isReportNavigationLoading?: boolean;
  onPreviousReport?: () => void;
  onNextReport?: () => void;
}

export function ReportDetailsPage({
  isOpen,
  report,
  onClose,
  onBack,
  onReplySuccess,
  map,
  vectorLayers,
  onSearchPanelVisibilityChange,
  onMapPickerActiveChange,
  hasPreviousReport = false,
  hasNextReport = false,
  isReportNavigationLoading = false,
  onPreviousReport,
  onNextReport,
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
  const [isSendSuccessOpen, setIsSendSuccessOpen] = useState(false);
  const [isViewingOnMap, setIsViewingOnMap] = useState(false);
  const [replyTitle, setReplyTitle] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState(ReportStatus.Submit);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isDraft = report?.status === ReportStatus.Draft;
  const reportGeometry = report?.geometry;
  const position = useMemo(
    () => reportGeometry ? parsePointGeometry(reportGeometry) : null,
    [reportGeometry]
  );
  const canViewOnMap = Boolean(map && position);
  const positionCoordinate = useMemo(
    () => position ? fromLonLat([position.lon, position.lat]) : null,
    [position]
  );

  useEffect(() => {
    onMapPickerActiveChange?.(isViewingOnMap);

    return () => {
      onMapPickerActiveChange?.(false);
    };
  }, [isViewingOnMap, onMapPickerActiveChange]);

  useEffect(() => {
    if (!isOpen && isViewingOnMap) {
      setIsViewingOnMap(false);
    }
  }, [isOpen, isViewingOnMap]);

  useEffect(() => {
    if (!isViewingOnMap || !map || !positionCoordinate || typeof document === 'undefined') {
      return;
    }

    const markerElement = document.createElement('div');
    markerElement.className = styles.reportLocationMarker;
    markerElement.setAttribute('aria-hidden', 'true');

    const markerOverlay = new Overlay({
      element: markerElement,
      positioning: 'center-center',
      stopEvent: false,
    });

    markerOverlay.setPosition(positionCoordinate);
    map.addOverlay(markerOverlay);

    return () => {
      map.removeOverlay(markerOverlay);
    };
  }, [isViewingOnMap, map, positionCoordinate]);

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

  const handleViewOnMap = () => {
    if (!map || !positionCoordinate) return;

    map.getView().animate({
      center: positionCoordinate,
      duration: 250,
    });

    onSearchPanelVisibilityChange?.(false);
    setIsViewingOnMap(true);
  };

  const handleBackToReport = () => {
    setIsViewingOnMap(false);
    onSearchPanelVisibilityChange?.(false);
  };

  const handlePageBack = () => {
    if (isViewingOnMap) {
      handleBackToReport();
      return;
    }

    onBack();
  };

  const handlePageClose = () => {
    setIsViewingOnMap(false);
    onClose();
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
      setIsSendSuccessOpen(true);
    }
  };

  const handleSendSuccessClose = () => {
    setIsSendSuccessOpen(false);
    onBack();
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
      if (map) {
        removeLocalReportFromMap(map, report.id);
      }
      void showToastSafe({
        text: t('reports.details.delete.successMessage'),
        duration: 'short',
        position: 'top',
      });
      setIsDeleteOpen(false);
      onBack();
    } finally {
      setIsDeleting(false);
    }
  };

  const sendErrorKey = getReportSubmitErrorTranslationKey(
    sendError,
    'reports.details.sendError'
  )

  if (!report) {
    return null;
  }

  const statusColor = getStatusColor(report.status);
  const statusLabel = t(`reports.status.${report.status}`, report.status);
  const themeName = report.attributes?.themeName || t('reports.details.notAvailable');
  const communeName = report.commune?.title || t('reports.details.notAvailable');
  const departmentName = report.departement?.name || t('reports.details.notAvailable');
  const authorName = report.author?.username || t('reports.details.notAvailable');
  const responses = report.replies || [];
  const attributesText = formatReportAttributes(report, user?.communities_member);
  const pageClassName = joinCSSClassNames(
    isEditOpen ? styles.hiddenBehindChild : undefined,
    isViewingOnMap ? styles.locationViewerSheet : undefined
  );
  const showPreviousReportButton = hasPreviousReport && Boolean(onPreviousReport);
  const showNextReportButton = hasNextReport && Boolean(onNextReport);
  const showReportNavigation =
    !isViewingOnMap &&
    (showPreviousReportButton || showNextReportButton || isReportNavigationLoading);

  return (
    <>
      <SlideUpPage
        isOpen={isOpen}
        onClose={handlePageClose}
        level={2}
        className={pageClassName}
      >
        <PageHeader
          title={t('reports.details.headerTitle')}
          subtitle={activeCommunity?.name ?? t('reports.details.headerSubtitle')}
          showBackButton
          onBack={handlePageBack}
          onClose={handlePageClose}
        />

        <main className={screen.screenContainer + " " + styles.content}>
          <div className={styles.titleSection}>
            <div className={styles.titleHeadingRow}>
              <h1 className={typography.title}>{t('reports.details.title')}</h1>
              {canViewOnMap && (
                <Button
                  type="button"
                  color="secondary"
                  variant="ghost"
                  iconOnly
                  className={styles.positionViewButton}
                  onClick={handleViewOnMap}
                  aria-label={t('reports.details.viewOnMapButton')}
                >
                  <IconEye className={styles.positionViewIcon} />
                </Button>
              )}
            </div>
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
              <span className={styles.detailValue}>{activeCommunity?.name ?? t('reports.details.notAvailable')}</span>
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
                <span className={styles.detailValue}>
                  {position.lon.toFixed(6)}, {position.lat.toFixed(6)}
                </span>
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
                  <Button color="tertiary" onClick={handleSendReport} loading={isSending}>
                    <IconSend className={buttonStyles.icon} />
                    {t('reports.details.sendButton')}
                  </Button>
                  <Button color="primary" onClick={handleEditReport}>
                    <IconPencil className={buttonStyles.icon} />
                    {t('reports.details.editButton')}
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
                    <IconPencil className={buttonStyles.icon} />
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
                {t(getAppErrorTranslationKey(replyError, 'reports.details.reply.errorMessage'))}
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

        <Alert
          isOpen={isSendSuccessOpen}
          onClose={handleSendSuccessClose}
          title={t('reports.details.sendSuccess.title')}
          subtitle={t('reports.details.sendSuccess.message')}
          buttons={[
            {
              label: t('reports.general.ok'),
              onClick: handleSendSuccessClose,
              color: 'primary',
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
          vectorLayers={vectorLayers}
          onSearchPanelVisibilityChange={onSearchPanelVisibilityChange}
          onMapPickerActiveChange={onMapPickerActiveChange}
        />

        {showReportNavigation && (
          <div className={styles.reportNavigationControls}>
            {showPreviousReportButton && (
              <Button
                type="button"
                color="light"
                iconOnly
                className={joinCSSClassNames(
                  styles.reportNavigationButton,
                  styles.reportNavigationPreviousButton
                )}
                onClick={onPreviousReport}
                disabled={isReportNavigationLoading}
                aria-label={t('reports.details.previousReportButton')}
              >
                <IconArrowLeft className={buttonStyles.icon} />
              </Button>
            )}

            {isReportNavigationLoading && (
              <Loading
                size="small"
                className={styles.reportNavigationLoading}
              />
            )}

            {showNextReportButton && (
              <Button
                type="button"
                color="light"
                iconOnly
                className={joinCSSClassNames(
                  styles.reportNavigationButton,
                  styles.reportNavigationNextButton
                )}
                onClick={onNextReport}
                disabled={isReportNavigationLoading}
                aria-label={t('reports.details.nextReportButton')}
              >
                <IconArrowRight className={buttonStyles.icon} />
              </Button>
            )}
          </div>
        )}
      </SlideUpPage>

      {isViewingOnMap && typeof document !== 'undefined'
        ? createPortal(
          <div className={styles.locationViewerOverlay}>
            <div className={styles.backToReportButtonContainer}>
              <Button
                color="primary"
                onClick={handleBackToReport}
                className={styles.backToReportButton}
              >
                {t('reports.details.backToReportButton')}
              </Button>
            </div>
          </div>,
          document.body
        )
        : null}
    </>
  );
}
