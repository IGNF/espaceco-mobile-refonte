import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import type { RemoteWmsLayer } from '@/features/map/types/userWmsLayers';

import styles from './UserWmsLayerDialog.module.css';
import { Divider } from '@/shared/ui/Divider/Divider';

interface UserWmsLayerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadRemoteWmsLayers?: (url: string) => Promise<RemoteWmsLayer[]>;
  onAddUserWmsLayer?: (layer: RemoteWmsLayer) => void;
}

export function UserWmsLayerDialog({
  isOpen,
  onClose,
  onLoadRemoteWmsLayers,
  onAddUserWmsLayer,
}: UserWmsLayerDialogProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [layers, setLayers] = useState<RemoteWmsLayer[]>([]);
  const [previewLayer, setPreviewLayer] = useState<RemoteWmsLayer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setUrl('');
      setLayers([]);
      setPreviewLayer(null);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const trimmedUrl = url.trim();
    if (!trimmedUrl || !onLoadRemoteWmsLayers) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setPreviewLayer(null);

    try {
      const remoteLayers = await onLoadRemoteWmsLayers(trimmedUrl);
      setLayers(remoteLayers);
      if (remoteLayers.length === 0) {
        setError(t('layers.userWms.noLayers'));
      }
    } catch {
      setLayers([]);
      setError(t('layers.userWms.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLayer = (layer: RemoteWmsLayer) => {
    onAddUserWmsLayer?.(layer);
    onClose();
  };

  const getWmsLayerValue = (value: string | number | boolean | string[] | undefined) => {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : t('layers.userWms.emptyValue');
    }

    if (typeof value === 'boolean') {
      return value ? t('layers.userWms.yes') : t('layers.userWms.no');
    }

    if (typeof value === 'number') {
      return String(value);
    }

    return value && value.length > 0 ? value : t('layers.userWms.emptyValue');
  };

  return (
    <Alert
      isOpen={isOpen}
      onClose={onClose}
      title={t('layers.userWms.title')}
      size='wide'
      buttons={[
        {
          label: t('common.cancel'),
          onClick: onClose,
          variant: 'outline',
        },
        {
          label: t('layers.userWms.search'),
          onClick: () => void handleSubmit(),
          disabled: !url.trim() || !onLoadRemoteWmsLayers,
          loading: isLoading,
        },
      ]}
    >
      <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
        <label className={styles.label} htmlFor='user-wms-url'>
          {t('layers.userWms.urlLabel')}
        </label>
        <input
          id='user-wms-url'
          className={styles.input}
          type='url'
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={t('layers.userWms.urlPlaceholder')}
          disabled={isLoading}
        />
      </form>

      {error && <p className={styles.error}>{error}</p>}

      {layers.length > 0 && (
        <>
        <Divider />
          <ul className={styles.layerList}>
            {layers.map((layer) => {
              const isPreviewed = previewLayer === layer;

              return (
                <li key={`${layer.url}-${layer.layerName}`} className={styles.layerItem}>
                  <button
                    type='button'
                    className={styles.layerButton}
                    onClick={() => setPreviewLayer(isPreviewed ? null : layer)}
                    aria-expanded={isPreviewed}
                  >
                    <div className={styles.layerTitleBlock}>
                      <span className={styles.layerTitle}>{layer.title}</span>
                      <span className={styles.layerName}>{layer.layerName}</span>
                    </div>
                  </button>

                  {isPreviewed && (
                    <div className={styles.previewPanel}>
                      <h3 className={styles.previewTitle}>{t('layers.userWms.preview')}</h3>
                      <div className={styles.visualPreview}>
                        {layer.previewUrl ? (
                          <img
                            className={styles.previewImage}
                            src={layer.previewUrl}
                            alt={`${t('layers.userWms.preview')} ${layer.title}`}
                          />
                        ) : (
                          <div className={styles.previewFallback}>
                            {t('layers.userWms.previewUnavailable')}
                          </div>
                        )}
                        {(layer.legend?.length ?? 0) > 0 ? (
                          <div className={styles.legendBlock}>
                            <span className={styles.legendTitle}>
                              {t('layers.userWms.legend')}
                            </span>
                            <div className={styles.legendImages}>
                              {layer.legend!.map((legendUrl) => (
                                <img
                                  key={legendUrl}
                                  className={styles.legendImage}
                                  src={legendUrl}
                                  alt={t('layers.userWms.legend')}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className={styles.legendSwatch} aria-hidden='true' />
                        )}
                      </div>
                      {layer.description && (
                        <p className={styles.previewDescription}>{layer.description}</p>
                      )}
                      <dl className={styles.preview}>
                        <div>
                          <dt>{t('layers.userWms.previewTitle')}</dt>
                          <dd>{getWmsLayerValue(layer.title)}</dd>
                        </div>
                        <div>
                          <dt>{t('layers.userWms.previewLayer')}</dt>
                          <dd>{getWmsLayerValue(layer.layerName)}</dd>
                        </div>
                      </dl>
                      <Button
                        type='button'
                        onClick={() => handleAddLayer(layer)}
                        disabled={!onAddUserWmsLayer}
                        fullWidth
                      >
                        {t('layers.userWms.load')}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Alert>
  );
}
