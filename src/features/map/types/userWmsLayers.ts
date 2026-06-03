export interface UserWmsLayer {
  id: number;
  title: string;
  description?: string;
  url: string;
  layerName: string;
  map?: string;
  visible?: boolean;
  opacity?: number;
}

export interface RemoteWmsLayer {
  title: string;
  description?: string;
  layerName: string;
  url: string;
  map?: string;
  legend?: string[];
  previewUrl?: string;
}
