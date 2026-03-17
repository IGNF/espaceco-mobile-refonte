import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';

export interface DirectContributionFeatureCandidate {
  key: string;
  label: string;
  secondaryLabel?: string;
  feature: Feature<Geometry>;
}
