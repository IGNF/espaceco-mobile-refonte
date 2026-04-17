import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import type { CommunityLayer } from '@ign/mobile-core';

import Feature from 'ol/Feature';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { fromExtent } from 'ol/geom/Polygon';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import type Geometry from 'ol/geom/Geometry';
import type Map from 'ol/Map';
import type { Extent } from 'ol/extent';

import type { DirectContributionFeatureCandidate } from '@/features/map/types/directContributionFeatureCandidate';
import { getDirectContributionFeatureCandidatesAtPixel } from '@/features/map/utils/directContributionFeatureCandidates';

import { DirectContributionLayerService } from '@/infra/map/directContribution/DirectContributionLayerService';
import { findLayerGroupByName } from '@/infra/map/openlayers/layerGroups';

import IconEye from '@/shared/assets/icons/icon-eye.svg?react';
import IconGeolocation from '@/shared/assets/icons/icon-geolocation.svg?react';
import { getCommunityLayerTitle } from '@/shared/utils/communityLayer';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';

import { Button } from '@/shared/ui/Button';

import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';
import styles from './OfflineZoneEditorOverlay.module.css';

export type OfflineZoneEditorMode = 'custom' | 'select-obj';

interface OfflineZoneEditorOverlayProps {
  isOpen: boolean;
  map: Map | null;
  mode: OfflineZoneEditorMode;
  zoneName: string;
  layer: CommunityLayer | null;
  onCenterOnUserLocation?: () => Promise<void>;
  isLocating?: boolean;
  onCancel: () => void;
  onSave: (extents: Extent[]) => Promise<void>;
}

const draftExtentStyle = new Style({
  stroke: new Stroke({
    color: '#26A581',
    width: 2,
  }),
  fill: new Fill({
    color: 'rgba(38, 165, 129, 0.16)',
  }),
});

const selectedFeatureStyle = new Style({
  stroke: new Stroke({
    color: '#F18345',
    width: 2,
  }),
  fill: new Fill({
    color: 'rgba(241, 131, 69, 0.18)',
  }),
  image: new CircleStyle({
    radius: 7,
    fill: new Fill({
      color: '#F18345',
    }),
    stroke: new Stroke({
      color: '#ffffff',
      width: 2,
    }),
  }),
});

export function OfflineZoneEditorOverlay({
  isOpen,
  map,
  mode,
  zoneName,
  layer,
  onCenterOnUserLocation,
  isLocating = false,
  onCancel,
  onSave,
}: OfflineZoneEditorOverlayProps) {
  const { t } = useTranslation();
  const [draftExtents, setDraftExtents] = useState<Extent[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<
    DirectContributionFeatureCandidate[]
  >([]);
  const [choiceCandidates, setChoiceCandidates] = useState<
    DirectContributionFeatureCandidate[]
  >([]);
  const [isGuichetGroupVisible, setIsGuichetGroupVisible] = useState(false);
  const overlayLayerRef = useRef<VectorLayer<VectorSource<Feature<Geometry>>> | null>(null);
  const selectionFrameRef = useRef<HTMLDivElement | null>(null);
  const previousGuichetGroupVisibilityRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!isOpen || !map) {
      return;
    }

    const overlayLayer = new VectorLayer({
      source: new VectorSource<Feature<Geometry>>(),
      style: (feature) => feature.get('kind') === 'draft-extent' ? draftExtentStyle : selectedFeatureStyle,
    });

    overlayLayerRef.current = overlayLayer;
    map.addLayer(overlayLayer);

    return () => {
      map.removeLayer(overlayLayer);
      overlayLayerRef.current = null;
    };
  }, [isOpen, map]);

  useEffect(() => {
    const source = overlayLayerRef.current?.getSource();
    if (!source) {
      return;
    }

    source.clear();

    // Populate the overlay layer with draft extents and selected features ('personnalisée').
    for (const extent of draftExtents) {
      const feature = new Feature({
        geometry: fromExtent(extent),
      });
      feature.set('kind', 'draft-extent');
      source.addFeature(feature);
    }

    // Populate the overlay layer with selected features ('Par sélection d'objets').
    for (const candidate of selectedCandidates) {
      const feature = new Feature({
        geometry: candidate.feature.getGeometry()!.clone(),
      });
      feature.set('kind', 'selected-feature');
      source.addFeature(feature);
    }
  }, [draftExtents, selectedCandidates]);

  // Add or remove a selected feature from the selection list (object choice).
  function toggleCandidate(candidate: DirectContributionFeatureCandidate) {
    setSelectedCandidates((current) => {
      const exists = current.some((item) => item.key === candidate.key);

      if (exists) {
        return current.filter((item) => item.key !== candidate.key);
      }

      return [...current, candidate];
    });
    setChoiceCandidates([]);
  }

  useEffect(() => {
    if (!isOpen || !map || mode !== 'select-obj') {
      return;
    }

    const selectedLayer = layer!;
    const layerService = new DirectContributionLayerService(map);
    const layerKey = getCommunityLayerKey(selectedLayer);
    const collabLayer = layerService.getCollabLayer(layerKey);
    const collabSource = layerService.getCollabSource(layerKey);

    if (!collabLayer || !collabSource) {
      return;
    }

    const handleMapSingleClick = (event: { pixel: number[] }) => {
      // Get the feature candidates at the clicked pixel.
      const candidates = getDirectContributionFeatureCandidatesAtPixel({
        map,
        pixel: event.pixel,
        layer: collabLayer,
        source: collabSource,
        communityLayer: selectedLayer,
        table: selectedLayer.table!,
        hitTolerance: 16,
        fallbackLabel: t('offline.editor.defaultObject'),
      });

      // If no candidates are found, do nothing.
      if (candidates.length === 0) {
        return;
      }

      // If only one candidate is found, add it to the selection list.
      if (candidates.length === 1) {
        toggleCandidate(candidates[0]);
        return;
      }

      // If multiple candidates are found, open the choice dialog.
      setChoiceCandidates(candidates);
    };

    map.on('singleclick', handleMapSingleClick);

    return () => {
      map.un('singleclick', handleMapSingleClick);
    };
  }, [isOpen, layer, map, mode, t]);

  useEffect(() => {
    if (!isOpen || !map || mode !== 'custom') {
      return;
    }

    const guichetLayerGroup = findLayerGroupByName(map, 'guichet');
    if (!guichetLayerGroup) {
      return;
    }

    previousGuichetGroupVisibilityRef.current = guichetLayerGroup.getVisible();
    guichetLayerGroup.setVisible(false);

    return () => {
      guichetLayerGroup.setVisible(previousGuichetGroupVisibilityRef.current ?? true);
      previousGuichetGroupVisibilityRef.current = null;
    };
  }, [isOpen, map, mode]);

  function getVisibleExtent() {
    return map?.getSize() ? map.getView().calculateExtent(map.getSize()) : null;
  }

  function getCustomFrameExtent() {
    if (!map) {
      return null;
    }

    const frameRect = selectionFrameRef.current?.getBoundingClientRect();

    if (!frameRect) {
      return getVisibleExtent();
    }

    const viewportRect = map.getViewport().getBoundingClientRect();
    const topLeft = map.getCoordinateFromPixel([
      frameRect.left - viewportRect.left,
      frameRect.top - viewportRect.top,
    ]);
    const bottomRight = map.getCoordinateFromPixel([
      frameRect.right - viewportRect.left,
      frameRect.bottom - viewportRect.top,
    ]);

    if (!topLeft || !bottomRight) {
      return getVisibleExtent();
    }

    return [topLeft[0], bottomRight[1], bottomRight[0], topLeft[1]] as Extent;
  }

  function addCurrentSelection() {
    if (mode === 'custom') {
      setDraftExtents((current) => [...current, getCustomFrameExtent()!]);
      return;
    }

    const extents = selectedCandidates.map((candidate) => candidate.feature.getGeometry()!.getExtent());

    setDraftExtents((current) => [...current, ...extents]);
    setSelectedCandidates([]);
  }

  async function handleSave() {
    const nextExtents =
      mode === 'custom' && draftExtents.length === 0
        ? [getCustomFrameExtent()!]
        : draftExtents;

    await onSave(nextExtents);
  }

  function toggleMapLayers() {
    if (!map) {
      return;
    }

    const guichetLayerGroup = findLayerGroupByName(map, 'guichet');
    if (!guichetLayerGroup) {
      return;
    }

    const nextVisibility = !guichetLayerGroup.getVisible();
    guichetLayerGroup.setVisible(nextVisibility);
    setIsGuichetGroupVisible(nextVisibility);
  }

  // Can add curent selection if the mode is 'personnalisée' and the map is not null, or if the mode is 'Par sélection d'objets' and there are selected candidates.
  const canAddCurrentSelection = mode === 'custom' ? map !== null : selectedCandidates.length > 0;

  // Can save if there are draft extents or if the mode is 'personnalisée' and the map is not null.
  const canSave = draftExtents.length > 0 || (mode === 'custom' && map !== null);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className={`${screen.overlay} ${styles.overlay}`}>
      {mode === 'custom' && (
        <>
          <div ref={selectionFrameRef} className={styles.customFrame} aria-hidden='true' />
          {onCenterOnUserLocation && (
            <button
              type='button'
              className={styles.centerButton}
              onClick={() => void onCenterOnUserLocation()}
              disabled={isLocating}
              aria-label={t('offline.editor.centerOnPosition')}
            >
              <IconGeolocation className={styles.centerIcon} />
            </button>
          )}
          <button
            type='button'
            className={styles.visibilityButton}
            onClick={toggleMapLayers}
            aria-label={
              isGuichetGroupVisible
                ? t('offline.editor.hideLayers')
                : t('offline.editor.showLayers')
            }
            title={
              isGuichetGroupVisible
                ? t('offline.editor.hideLayers')
                : t('offline.editor.showLayers')
            }
          >
            <IconEye className={styles.visibilityIcon} />
            {!isGuichetGroupVisible && <span className={styles.visibilitySlash} aria-hidden='true' />}
          </button>
        </>
      )}

      <div className={styles.headerCard}>
        <div className={styles.headerCardContent}>
          <p className={styles.eyebrow}>{t('offline.editor.title')}</p>
          <h2 className={styles.title}>{zoneName}</h2>
          <p className={`${typography.caption} ${styles.subtitle}`}>
            {mode === 'custom'
              ? t('offline.editor.customDescription')
              : t('offline.editor.selectDescription', {
                layer: layer ? getCommunityLayerTitle(layer) : t('offline.editor.defaultLayer'),
              })}
          </p>
        </div>

        <div className={styles.headerCardActions}>
          <Button variant='solid' color='light' onClick={onCancel}>
            {t('offline.editor.cancel')}
          </Button>
        </div>
      </div>

      {choiceCandidates.length > 1 && (
        <div className={styles.choicesCard}>
          <p className={styles.choicesTitle}>{t('offline.editor.chooseObject')}</p>
          <div className={styles.choicesList}>
            {choiceCandidates.map((candidate) => (
              <button
                key={candidate.key}
                type='button'
                className={styles.choiceButton}
                onClick={() => toggleCandidate(candidate)}
              >
                <span>{candidate.label}</span>
                {candidate.secondaryLabel && (
                  <span className={typography.caption}>{candidate.secondaryLabel}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.footerCard}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{draftExtents.length}</span>
            <span className={styles.statLabel}>{t('offline.editor.savedExtents')}</span>
          </div>
          {mode === 'select-obj' && (
            <div className={styles.stat}>
              <span className={styles.statValue}>{selectedCandidates.length}</span>
              <span className={`${typography.caption} ${styles.statLabel}`}>
                {t('offline.editor.selectedObjects')}
              </span>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <Button
            fullWidth
            color='secondary'
            variant='outline'
            onClick={addCurrentSelection}
            disabled={!canAddCurrentSelection}
          >
            {mode === 'custom'
              ? t('offline.editor.addVisibleExtent')
              : t('offline.editor.addSelectedObjects')}
          </Button>
          <Button fullWidth onClick={() => void handleSave()} disabled={!canSave}>
            {t('offline.editor.validate')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
