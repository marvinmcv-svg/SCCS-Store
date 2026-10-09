'use client';

import * as React from 'react';
import { getImageProps } from 'next/image';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ButtonLink } from '@/components/ui/button';

export type HeroData = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  cta?: { label: string; href: string };
  cta2?: { label: string; href: string };
  imageMobile: string;
  imageDesktop: string;
  blur?: string | null;
  priority?: boolean;
  tall?: boolean;
};

/**
 * Full-bleed editorial banner: one headline, one primary CTA.
 * Art-directed <picture> so each device downloads only its own image
 * (portrait on phones, landscape on desktop). Gentle parallax, disabled
 * with reduced motion.
 */
export function Hero({ data }: { data: HeroData }) {
  const ref = React.useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '14%']);
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.06]);

  const common = { alt: '', sizes: '100vw', priority: data.priority };
  const {
    props: { srcSet: desktop },
  } = getImageProps({ ...common, src: data.imageDesktop, width: 2400, height: 1200, quality: 75 });
  const {
    props: { srcSet: mobile, ...rest },
  } = getImageProps({ ...common, src: data.imageMobile, width: 1200, height: 1600, quality: 75 });

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#1b1b45] text-white">
      <motion.div
        style={{ y, scale, backgroundImage: data.blur ? `url(${data.blur})` : undefined }}
        className="absolute inset-0 bg-cover bg-center will-change-transform"
      >
        <picture>
          <source media="(min-width: 768px)" srcSet={desktop} />
          <source srcSet={mobile} />
          <img {...rest} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </picture>
      </motion.div>
      <div
        className={`container-page relative flex flex-col justify-end pt-24 pb-10 md:pb-16 ${data.tall ? 'min-h-[min(82svh,760px)] md:min-h-[min(86svh,860px)]' : 'min-h-[min(68svh,620px)] md:min-h-[560px]'}`}
      >
        <div className="max-w-2xl animate-fade-up">
          {data.eyebrow && <p className="t-label mb-4 text-white/80">{data.eyebrow}</p>}
          <h1 className="t-display text-balance">{data.title}</h1>
          {data.subtitle && <p className="t-body mt-4 max-w-md text-[16px] text-white/85">{data.subtitle}</p>}
          {(data.cta || data.cta2) && (
            <div className="mt-7 flex flex-wrap gap-3">
              {data.cta && (
                <ButtonLink href={data.cta.href} variant="inverse" size="lg">
                  {data.cta.label}
                </ButtonLink>
              )}
              {data.cta2 && (
                <ButtonLink href={data.cta2.href} variant="outlineInverse" size="lg">
                  {data.cta2.label}
                </ButtonLink>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
