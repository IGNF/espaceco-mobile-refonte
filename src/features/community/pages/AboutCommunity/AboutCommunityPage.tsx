import type { CommunityLayer } from '@ign/mobile-core';
import { PageHeader } from '@/shared/ui/PageHeader';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { Divider } from '@/shared/ui/Divider/Divider';
import { useTranslation } from 'react-i18next';

import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';
import { useCommunity } from '../../hooks/useCommunity';
import { useLegendImages } from '../../hooks/useLegendImages';
import { getCommunityLayerLegends } from '../../utils/communityLayerLegend';

import styles from './AboutCommunityPage.module.css';

export interface AboutCommunityPageProps {
  isOpen: boolean;
  onClose: () => void;
  layers: CommunityLayer[];
}

function LegendSwatch({
  color,
  imageUrl,
  imageUrls,
}: {
  color?: string;
  imageUrl?: string;
  imageUrls: Record<string, string>;
}) {
  const src = imageUrl ? imageUrls[imageUrl] : undefined;
  if (src) {
    return <img className={styles.legendItemImage} src={src} alt="" />;
  }

  if (!color) {
    return null;
  }

  return <div className={styles.legendItemColor} style={{ backgroundColor: color }} />;
}

export function AboutCommunityPage({ isOpen, onClose, layers }: AboutCommunityPageProps) {
  const { t } = useTranslation();
  const { activeCommunity } = useCommunity();
  const communityDescription = activeCommunity?.editorial || activeCommunity?.description || '';
  const legends = getCommunityLayerLegends(layers);
  const legendImages = useLegendImages(legends);

  return (
    <SlideUpPage isOpen={isOpen} onClose={onClose}>
      <PageHeader title={t('aboutCommunity.title')} subtitle={activeCommunity?.name ?? ''} onClose={onClose} />
      <main className={screen.screenContainer}>
        <h1 className={typography.title}>{t('aboutCommunity.title')}</h1>
        <p className={typography.subtitle}>{activeCommunity?.name ?? ''}</p>
        {communityDescription ? (
          <div
            className={typography.paragraph}
            dangerouslySetInnerHTML={{ __html: communityDescription }}
          />
        ) : (
          <p className={typography.paragraph}>{t('aboutCommunity.noDescription')}</p>
        )}
        {legends.length > 0 && (
          <>
            <Divider className={styles.divider} />
            <section className={styles.legendSection}>
              <p className={typography.subtitle}>{t('aboutCommunity.legendTitle')}</p>
              {legends.map((legend) => (
                <div key={legend.layerKey} className={styles.layerLegend}>
                  <div className={styles.legendItem}>
                    <LegendSwatch
                      color={legend.color}
                      imageUrl={legend.imageUrl}
                      imageUrls={legendImages}
                    />
                    <p className={`${typography.paragraph} ${styles.layerTitle}`}>{legend.title}</p>
                  </div>
                  {legend.items.length > 0 && (
                    <div className={styles.legendItems}>
                      {legend.items.map((item, index) => (
                        <div key={`${legend.layerKey}-${index}`} className={styles.legendItem}>
                          <LegendSwatch
                            color={item.color}
                            imageUrl={item.imageUrl}
                            imageUrls={legendImages}
                          />
                          <p className={typography.paragraph}>{item.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </SlideUpPage>
  );
}
