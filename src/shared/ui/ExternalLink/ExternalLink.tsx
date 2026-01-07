import type { AnchorHTMLAttributes, ReactNode } from 'react'
import styles from './ExternalLink.module.css'
import ExternalLinkIcon from '@/shared/assets/icons/icon-external-link.svg'

export interface ExternalLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode
  href: string
  showIcon?: boolean
}

export function ExternalLink({
  children,
  href,
  showIcon = true,
  className,
  target = '_blank',
  rel = 'noopener noreferrer',
  ...rest
}: ExternalLinkProps) {
  const classNames = [
    styles.externalLink,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={classNames}
      {...rest}
    >
      {children}
      {showIcon && (
        <img
          src={ExternalLinkIcon}
          alt=""
          className={styles.icon}
        />
      )}
    </a>
  )
}

