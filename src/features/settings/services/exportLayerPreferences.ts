import type { LayerDisplayState, LayerGroupVisibility } from '@/features/map/types/layerGroups';
import type { SignalementLayerState } from '@/features/map/constants/signalementLayers.constants';
import {
  listUserLayersConfigurations,
  type LayersConfiguration,
} from '@/features/map/services/layersConfigurationStorage';
import { writeExportFile } from '@/platform/device/exportFile';

interface LayerPreferencesExport {
  version: 1;
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
}

/**
 * Exports stored layer order, opacity and visibility for every community of the user.
 */
export async function exportLayerPreferences(userId: number): Promise<string> {
  const storedConfigurations = await listUserLayersConfigurations(userId);
  const exportedAt = new Date();
  const dateStamp = formatExportDate(exportedAt);
  const fileName = `${dateStamp}_pref_app.json`;
  const payload: LayerPreferencesExport = {
    version: 1,
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

function formatExportDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}${month}${day}`;
}
