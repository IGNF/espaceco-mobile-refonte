import type { ComponentType } from 'react';

import { joinCSSClassNames } from '@/shared/utils/join';

import styles from './Segment.module.css';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface SegmentProps<T extends string> {
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

export function Segment<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  className,
}: SegmentProps<T>) {
  return (
    <div
      className={joinCSSClassNames(styles.segment, disabled && styles.disabled, className)}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            className={joinCSSClassNames(styles.option, isSelected && styles.optionSelected)}
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {Icon && <Icon className={styles.icon} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
