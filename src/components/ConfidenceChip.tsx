'use client';

import { Badge } from './badge';

interface ConfidenceChipProps {
  confidence: "high" | "medium" | "low" | "none";
  className?: string;
  size?: "sm" | "default";
}

export function ConfidenceChip({ confidence, className = "", size = "default" }: ConfidenceChipProps) {
  const getVariant = (conf: string) => {
    switch (conf) {
      case "high":
        return "default"; // Green
      case "medium":
        return "secondary"; // Yellow/Orange
      case "low":
        return "outline"; // Gray outline
      case "none":
        return "destructive"; // Red
      default:
        return "outline";
    }
  };

  const getColor = (conf: string) => {
    switch (conf) {
      case "high":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "none":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getText = (conf: string) => {
    switch (conf) {
      case "high":
        return "High";
      case "medium":
        return "Med";
      case "low":
        return "Low";
      case "none":
        return "None";
      default:
        return "?";
    }
  };

  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1";

  return (
    <span 
      className={`inline-flex items-center rounded border font-medium ${getColor(confidence)} ${sizeClass} ${className}`}
      title={`Confidence: ${confidence}`}
    >
      {getText(confidence)}
    </span>
  );
}
