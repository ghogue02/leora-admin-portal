export type DeliveryWindow = {
  type?: 'BEFORE' | 'AFTER' | 'BETWEEN' | null;
  time?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

function formatTime(value: string | null | undefined) {
  if (!value) return null;
  return value.trim();
}

export function formatDeliveryWindow(window?: DeliveryWindow | null): string | null {
  if (!window || !window.type) {
    return null;
  }

  switch (window.type) {
    case 'BEFORE': {
      const time = formatTime(window.time);
      return time ? `Before ${time}` : null;
    }
    case 'AFTER': {
      const time = formatTime(window.time);
      return time ? `After ${time}` : null;
    }
    case 'BETWEEN': {
      const start = formatTime(window.startTime);
      const end = formatTime(window.endTime);
      return start && end ? `Between ${start} - ${end}` : null;
    }
    default:
      return null;
  }
}

export function formatDeliveryWindows(windows?: DeliveryWindow[] | null): string[] {
  if (!Array.isArray(windows) || windows.length === 0) {
    return [];
  }

  const formatted = windows
    .map((window) => formatDeliveryWindow(window))
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(formatted));
}
