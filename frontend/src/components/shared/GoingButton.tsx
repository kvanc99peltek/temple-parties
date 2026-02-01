"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface GoingButtonProps {
  isGoing: boolean;
  onToggle: () => void;
  className?: string;
  size?: "default" | "lg";
}

export function GoingButton({
  isGoing,
  onToggle,
  className,
  size = "default",
}: GoingButtonProps) {
  return (
    <Button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "font-bold tracking-wider transition-all",
        isGoing
          ? "bg-neon-cyan text-black hover:bg-neon-cyan/90 shadow-neon-cyan"
          : "bg-transparent border-2 border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10",
        size === "lg" && "text-lg py-6 px-8",
        className
      )}
    >
      {isGoing ? "GOING" : "I'M GOING"}
    </Button>
  );
}
