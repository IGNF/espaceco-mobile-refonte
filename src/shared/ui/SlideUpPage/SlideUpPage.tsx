import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	type CSSProperties,
	type PointerEvent as ReactPointerEvent,
	type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useBackHandler } from '@/shared/hooks/useBackHandler';


import { EspaceCo_SettingsStore } from '@/infra/persistence/settingsStore';

import {
	useMapPanel,
	type MapPanelRegistrationHandle,
} from '@/shared/layout/useMapPanel';
import { joinCSSClassNames } from '@/shared/utils/join';
import styles from './SlideUpPage.module.css';

export const SLIDE_UP_ANIMATION_MS = 300; // matches the CSS transform duration
const BASE_Z_INDEX = 100;
const DEFAULT_SNAP_POINTS = [20, 35, 45, 55, 95];
const DEFAULT_SNAP = 55;

export type SlideUpPresentation = 'fullscreen' | 'sheet';

interface SheetDragHandle {
	onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
	style: CSSProperties;
}

const SheetDragContext = createContext<SheetDragHandle | null>(null);

export function useSheetDragHandle(): SheetDragHandle | null {
	return useContext(SheetDragContext);
}

export interface SlideUpPageProps {
	children: ReactNode;
	isOpen: boolean;
	onClose: () => void;
	className?: string;
	/**
	 * Stack level for nested modals. Higher levels appear on top.
	 * Default is 1. Use 2 for modals opened from within another modal.
	 */
	level?: number;
	/**
	 * Whether this is a full-page overlay that needs safe area padding.
	 * Set to false for partial overlays (e.g., with top: 10%) that already have spacing.
	 * Default is true.
	 */
	fullPage?: boolean;
	/**
	 * fullscreen covers the map. sheet keeps the map visible: a bottom sheet on a
	 * phone, a side column when the viewport is at least 1024px wide.
	 */
	presentation?: SlideUpPresentation;
	/**
	 * When false, a sheet stays on screen but no longer shrinks the map.
	 * Used when the side column slides away so the map can be edited underneath.
	 */
	reserveMapSpace?: boolean;
	/**
	 * Heights, in percent of the viewport, the bottom sheet can snap to.
	 * Dragging the header moves between them. Ignored when the sheet is docked.
	 */
	snapPoints?: number[];
	/**
	 * Snap height used until the user has chosen one.
	 * Afterwards the last saved snap is reused, on the closest snap point.
	 */
	defaultSnap?: number;
}

function nearestSnap(value: number, snapPoints: number[]): number {
	return snapPoints.reduce((closest, point) => (
		Math.abs(point - value) < Math.abs(closest - value) ? point : closest
	));
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

// Last snap chosen by the user. The read starts immediately and is reused as the
// next opening height; a drag replaces it before storage answers.
let savedModalHeight: number | null = null;
let modalHeightReady = false;

const modalHeightReadyPromise = EspaceCo_SettingsStore.getModalHeight()
	.catch(() => null)
	.then((height) => {
		if (!modalHeightReady) savedModalHeight = height;
		modalHeightReady = true;
		return savedModalHeight;
	});

export function SlideUpPage({
	children,
	isOpen,
	onClose,
	className,
	level = 1,
	fullPage = true,
	presentation = 'fullscreen',
	reserveMapSpace = true,
	snapPoints = DEFAULT_SNAP_POINTS,
	defaultSnap = DEFAULT_SNAP,
}: SlideUpPageProps) {
	const resolvedSnapPoints = snapPoints.length > 0 ? snapPoints : DEFAULT_SNAP_POINTS;
	const isSheet = presentation === 'sheet';
	const openingSnap = nearestSnap(savedModalHeight ?? defaultSnap, resolvedSnapPoints);
	const { isWideLayout, registerSheet } = useMapPanel();
	const isDocked = isSheet && isWideLayout;
	const canResize = isSheet && !isDocked;
	const [isVisible, setIsVisible] = useState(isOpen && !canResize);
	const [shouldRender, setShouldRender] = useState(isOpen);
	const [isDragging, setIsDragging] = useState(false);
	const [heightPercent, setHeightPercent] = useState(openingSnap);
	const [wasOpen, setWasOpen] = useState(isOpen);
	const heightPercentRef = useRef(heightPercent);
	const updateSheetHeightRef = useRef<(nextHeightPercent: number) => void>(() => {});
	const zIndex = BASE_Z_INDEX + (level - 1) * 10;

	if (isOpen !== wasOpen) {
		setWasOpen(isOpen);
		if (isOpen) {
			setHeightPercent(openingSnap);
			if (!canResize) setIsVisible(true);
		}
	}

	if (isOpen && !shouldRender) setShouldRender(true);
	if (!isOpen && isVisible) {
		setIsVisible(false);
		if (!canResize) setShouldRender(false);
	}

	useBackHandler(isOpen, onClose, zIndex);

	useEffect(() => {
		heightPercentRef.current = heightPercent;
	}, [heightPercent]);

	useEffect(() => {
		if (!isSheet || !isOpen || !reserveMapSpace) return;
		const registration: MapPanelRegistrationHandle = registerSheet(heightPercentRef.current);
		updateSheetHeightRef.current = registration.update;
		return () => {
			registration.unregister();
			updateSheetHeightRef.current = () => {};
		};
	}, [isOpen, isSheet, registerSheet, reserveMapSpace]);

	useEffect(() => {
		updateSheetHeightRef.current(heightPercent);
	}, [heightPercent]);

	useEffect(() => {
		if (!canResize) return;

		if (!isOpen) {
			const timer = window.setTimeout(() => setShouldRender(false), SLIDE_UP_ANIMATION_MS);
			return () => window.clearTimeout(timer);
		}

		let cancelled = false;
		let showTimer = 0;
		const show = () => {
			showTimer = window.setTimeout(() => {
				if (!cancelled) setIsVisible(true);
			}, 20);
		};

		if (modalHeightReady) {
			show();
		} else {
			void modalHeightReadyPromise.then((height) => {
				if (cancelled) return;
				if (height != null) setHeightPercent(nearestSnap(height, resolvedSnapPoints));
				show();
			});
		}

		return () => {
			cancelled = true;
			window.clearTimeout(showTimer);
		};
	}, [canResize, isOpen, resolvedSnapPoints]);

	const onDragHandlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
		if (!canResize || event.button !== 0) return;
		const target = event.target;
		if (target instanceof Element && target.closest('button, a, input, textarea, select, label')) {
			return;
		}

		const startY = event.clientY;
		const startPercent = heightPercentRef.current;
		const minSnap = Math.min(...resolvedSnapPoints);
		const maxSnap = Math.max(...resolvedSnapPoints);
		let dragging = false;
		event.currentTarget.setPointerCapture(event.pointerId);

		const handleMove = (moveEvent: PointerEvent) => {
			const deltaPercent = ((startY - moveEvent.clientY) / window.innerHeight) * 100;
			if (!dragging) {
				dragging = true;
				setIsDragging(true);
			}
			setHeightPercent(clamp(startPercent + deltaPercent, minSnap, maxSnap));
		};

		const handleEnd = (endEvent: PointerEvent) => {
			const deltaPercent = ((startY - endEvent.clientY) / window.innerHeight) * 100;
			const newHeightPercent = nearestSnap(startPercent + deltaPercent, resolvedSnapPoints);
			savedModalHeight = newHeightPercent;
			modalHeightReady = true;
			setHeightPercent(newHeightPercent);
			setIsDragging(false);
			window.removeEventListener('pointermove', handleMove);
			window.removeEventListener('pointerup', handleEnd);
			window.removeEventListener('pointercancel', handleEnd);
			void EspaceCo_SettingsStore.saveModalHeight(newHeightPercent).catch(() => undefined);
		};

		window.addEventListener('pointermove', handleMove);
		window.addEventListener('pointerup', handleEnd);
		window.addEventListener('pointercancel', handleEnd);
	};

	if (!shouldRender) return null;

	const classNames = joinCSSClassNames(
		styles.slideUpPage,
		isVisible ? styles.slideUpPageVisible : '',
		isDocked ? styles.slideUpPageDocked : '',
		isSheet && !isDocked ? styles.slideUpPageSheet : '',
		isDragging ? styles.slideUpPageDragging : '',
		className
	);

	const innerClassNames = joinCSSClassNames(
		styles.slideUpPageInner,
		fullPage ? styles.slideUpPageInnerFullPage : ''
	);

	const dragHandle: SheetDragHandle | null = canResize
		? {
			onPointerDown: onDragHandlePointerDown,
			style: {
				cursor: 'ns-resize',
				touchAction: 'none',
				userSelect: 'none',
			},
		}
		: null;

	const content = (
		<SheetDragContext.Provider value={dragHandle}>
			<div
				className={classNames}
				style={{
					zIndex,
					height: canResize ? `${heightPercent}vh` : undefined,
				}}
				data-scroll-root='true'
				data-docked={isDocked ? 'true' : undefined}
			>
				<div className={innerClassNames}>
					{children}
				</div>
			</div>
		</SheetDragContext.Provider>
	);

	// Use portal to render at document body level for proper stacking
	return createPortal(content, document.body);
}
