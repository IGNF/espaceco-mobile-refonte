import type { LayerDisplayState, LayerGroupVisibility } from '@/features/map/types/layerGroups';
import type { SignalementLayerState } from '@/features/map/constants/signalementLayers.constants';
import type { FastReportGpsSettings } from '@/features/report/types/fastReportGps';
import type { TraceRecordingSettings } from '@/features/report/constants/reportTrace.constants';
import type { OfflineZone } from '@/domain/offline/models';
import type { GpsSourceType } from '@/platform/device/gpsSource';
import {
  listUserLayersConfigurations,
  replaceExportedLayersConfigurations,
  type LayersConfiguration,
} from '@/features/map/services/layersConfigurationStorage';
import { OfflineZonesRepository } from '@/infra/offline/OfflineZonesRepository';
import { EspaceCo_SettingsStore } from '@/infra/persistence/settingsStore';
import { EspaceCo_GpsSource } from '@/platform/device/gpsSource';
import { writeExportFile } from '@/platform/device/exportFile';

const offlineZonesRepository = new OfflineZonesRepository();

interface LayerPreferencesExport {
  exportedAt: string;
  userId: number;
  layers: Array<{
    communityId: number;
    layerOrder: string[];
    layersByKey: Record<string, { visible?: boolean; opacity?: number }>;
    groupVisibility: LayerGroupVisibility;
    geoportailLayerState: LayerDisplayState;
    signalementLayerState: SignalementLayerState;
  }>;
  offlineZones: OfflineZone[];
  gnss: {
    source: GpsSourceType;
    trace: TraceRecordingSettings;
    fastReportOffsets: FastReportGpsSettings;
  };
}

/**
 * Exports layer order, opacity and visibility, offline zones, and GNSS settings.
 */
export async function exportLayerPreferences(userId: number): Promise<string> {
  const exportedAt = new Date();
  const dateStamp = formatExportDate(exportedAt);
  const fileName = `${dateStamp}_pref_app.json`;
  const [storedConfigurations, offlineZones, source, trace, fastReportOffsets] = await Promise.all([
    listUserLayersConfigurations(userId),
    offlineZonesRepository.listZones(),
    EspaceCo_GpsSource.getPreferredSource(),
    EspaceCo_SettingsStore.getTraceRecordingSettings(),
    EspaceCo_SettingsStore.getFastReportGpsSettings(),
  ]);
  const payload: LayerPreferencesExport = {
    exportedAt: exportedAt.toISOString(),
    userId,
    layers: storedConfigurations.map(({ communityId, configuration }) => ({
      communityId,
      layerOrder: configuration.layerOrder,
      layersByKey: toExportedLayerStates(configuration.layersByKey),
      groupVisibility: configuration.groupVisibility,
      geoportailLayerState: configuration.geoportailLayerState,
      signalementLayerState: configuration.signalementLayerState,
    })),
    offlineZones,
    gnss: {
      source,
      trace,
      fastReportOffsets,
    },
  };

  await writeExportFile(`${dateStamp}_exp_esco`, fileName, JSON.stringify(payload, null, 2));
  return fileName;
}

function toExportedLayerStates(
  layersByKey: LayersConfiguration['layersByKey']
): Record<string, { visible?: boolean; opacity?: number }> {
  const exported: Record<string, { visible?: boolean; opacity?: number }> = {};

  for (const [layerKey, layerState] of Object.entries(layersByKey)) {
    exported[layerKey] = {
      visible: layerState.visible,
      opacity: layerState.opacity,
    };
  }

  return exported;
}

/**
 * Replaces stored layer preferences, offline zones and GNSS settings from an export file.
 */
export async function importLayerPreferences(
  userId: number,
  fileText: string
): Promise<TraceRecordingSettings | null> {
  const payload = JSON.parse(fileText) as LayerPreferencesExport;
  if (!Array.isArray(payload.layers)) {
    throw new Error('Invalid layer preferences file');
  }

  await replaceExportedLayersConfigurations(userId, payload.layers);

  if (Array.isArray(payload.offlineZones)) {
    for (const zone of payload.offlineZones) {
      await offlineZonesRepository.saveZone(zone.name, zone.extents);
    }
  }

  if (!payload.gnss) return null;

  await EspaceCo_SettingsStore.saveFastReportGpsSettings(payload.gnss.fastReportOffsets);
  await EspaceCo_GpsSource.setSource(payload.gnss.source);
  return payload.gnss.trace;
}

function formatExportDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}${month}${day}`;
}
