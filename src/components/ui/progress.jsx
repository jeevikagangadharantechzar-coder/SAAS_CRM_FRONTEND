import React from "react";
import { cn } from "../../lib/utils";

const Progress = React.forwardRef(({ 
  className, 
  value = 0, 
  max = 100,
  indicatorClassName,
  ...props 
}, ref) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-gray-100",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full w-full flex-1 transition-all duration-300 ease-in-out",
          indicatorClassName
        )}
        style={{ 
          width: `${percentage}%`,
          transform: "translateX(0%)"
        }}
      />
    </div>
  );
});

Progress.displayName = "Progress";

export { Progress };