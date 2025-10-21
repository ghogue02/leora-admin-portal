import React, { ReactNode } from 'react';

export interface DashboardTileProps {
  /** The content to be displayed inside the tile */
  children: ReactNode;

  /** The type of drill-down to open when clicked */
  drilldownType?: string;

  /** The title/label for the tile (used for accessibility) */
  title: string;

  /** Click handler to open drill-down modal */
  onClick?: () => void;

  /** Whether to show a subtle "click for details" hint */
  showClickHint?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Whether the tile is clickable/interactive */
  interactive?: boolean;
}

/**
 * DashboardTile - A reusable wrapper component that makes dashboard tiles clickable
 *
 * Features:
 * - Hover effects with visual feedback
 * - Keyboard accessible (Enter/Space to activate)
 * - Mobile-friendly touch targets
 * - ARIA labels for screen readers
 * - Optional click hint
 *
 * @example
 * <DashboardTile
 *   drilldownType="at-risk-cadence"
 *   title="At Risk Customers"
 *   onClick={() => openDrilldown('at-risk-cadence')}
 *   showClickHint
 * >
 *   <div>Your tile content here</div>
 * </DashboardTile>
 */
export const DashboardTile: React.FC<DashboardTileProps> = ({
  children,
  drilldownType,
  title,
  onClick,
  showClickHint = true,
  className = '',
  interactive = true,
}) => {
  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (interactive && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Activate on Enter or Space
    if (interactive && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleClick(e);
    }
  };

  const baseClasses = `
    relative
    transition-all
    duration-200
    ease-in-out
    ${className}
  `.trim();

  const interactiveClasses = interactive && onClick ? `
    cursor-pointer
    hover:shadow-lg
    hover:border-blue-400
    hover:-translate-y-0.5
    active:translate-y-0
    focus:outline-none
    focus:ring-2
    focus:ring-blue-500
    focus:ring-offset-2
    min-h-[44px]
    min-w-[44px]
  ` : '';

  const combinedClasses = `${baseClasses} ${interactiveClasses}`.trim();

  const ariaProps = interactive && onClick ? {
    role: 'button',
    tabIndex: 0,
    'aria-label': `${title}. Click for details.`,
    'aria-describedby': drilldownType ? `drilldown-${drilldownType}` : undefined,
  } : {};

  return (
    <div
      className={combinedClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...ariaProps}
    >
      {children}

      {/* Optional click hint overlay */}
      {interactive && onClick && showClickHint && (
        <div
          className="
            absolute
            bottom-2
            right-2
            opacity-0
            group-hover:opacity-100
            transition-opacity
            duration-200
            pointer-events-none
          "
          aria-hidden="true"
        >
          <span className="
            text-xs
            text-gray-500
            bg-white
            px-2
            py-1
            rounded
            shadow-sm
            border
            border-gray-200
          ">
            Click for details
          </span>
        </div>
      )}

      {/* Screen reader only description */}
      {drilldownType && (
        <span
          id={`drilldown-${drilldownType}`}
          className="sr-only"
        >
          Opens {title} drill-down view with detailed information
        </span>
      )}
    </div>
  );
};

export default DashboardTile;
