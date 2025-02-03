import React from 'react';
import { Button } from "@/components/ui/button";

interface ResetCheckboxButtonProps {
  onReset: () => void;
  className?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "xs";
}

const ResetCheckboxButton: React.FC<ResetCheckboxButtonProps> = ({ 
  onReset,
  className = "",
  variant = "outline",
  size = "sm"
}) => {
  return (
    <Button 
      variant={variant}
      size={size}
      onClick={onReset}
      className={`text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors ${className}`}
    >
      Auswahl zurücksetzen
    </Button>
  );
};

export default ResetCheckboxButton;
