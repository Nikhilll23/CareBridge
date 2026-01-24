import * as React from "react";
import { cn } from "@/lib/utils";

interface BentoGridShowcaseProps {
  integration: React.ReactNode;
  trackers: React.ReactNode;
  statistic: React.ReactNode;
  focus: React.ReactNode;
  productivity: React.ReactNode;
  shortcuts: React.ReactNode;
}

export function BentoGridShowcase({
  integration,
  trackers,
  statistic,
  focus,
  productivity,
  shortcuts,
}: BentoGridShowcaseProps) {
  return (
    <div className="grid auto-rows-[192px] grid-cols-1 gap-4 md:grid-cols-3">
      {/* Integration - spans 2 columns on desktop */}
      <div className="col-span-1 md:col-span-2 md:row-span-2">
        {integration}
      </div>

      {/* Trackers - top right */}
      <div className="col-span-1 md:row-span-1">
        {trackers}
      </div>

      {/* Statistic - middle right */}
      <div className="col-span-1 md:row-span-1">
        {statistic}
      </div>

      {/* Focus - bottom left */}
      <div className="col-span-1 md:row-span-1">
        {focus}
      </div>

      {/* Productivity - bottom middle */}
      <div className="col-span-1 md:row-span-1">
        {productivity}
      </div>

      {/* Shortcuts - bottom right */}
      <div className="col-span-1 md:row-span-1">
        {shortcuts}
      </div>
    </div>
  );
}
