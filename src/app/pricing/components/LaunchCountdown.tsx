"use client";

import { useEffect, useState } from "react";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
};

const getTimeLeft = (endDate: string): TimeLeft => {
  const target = new Date(endDate);
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  return { days, hours, minutes };
};

export function LaunchCountdown({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(endDate));

  useEffect(() => {
    const interval = window.setInterval(() => setTimeLeft(getTimeLeft(endDate)), 60_000);
    return () => window.clearInterval(interval);
  }, [endDate]);

  return (
    <span className="font-semibold text-white">
      {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
    </span>
  );
}
