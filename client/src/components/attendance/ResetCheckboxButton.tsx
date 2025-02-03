import React from 'react';
import { Button } from "@/components/ui/button";

interface ResetCheckboxButtonProps {
  onReset: () => void;
}

const ResetCheckboxButton: React.FC<ResetCheckboxButtonProps> = ({ onReset }) => {
  return (
    <Button variant="outline" size="sm" onClick={onReset}>
      Auswahl zurücksetzen
    </Button>
  );
};

export default ResetCheckboxButton;
