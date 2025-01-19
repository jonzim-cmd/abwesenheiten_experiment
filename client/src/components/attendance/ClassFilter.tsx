import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown } from "lucide-react";

interface ClassFilterProps {
  availableClasses: string[];
  selectedClasses: string[];
  onChange: (classes: string[]) => void;
}

export function ClassFilter({ availableClasses, selectedClasses, onChange }: ClassFilterProps) {
  const [open, setOpen] = useState(false);

  const getDisplayText = () => {
    if (selectedClasses.length === 0) return "Alle Klassen";
    return selectedClasses.join(", ");
  };

  const toggleClass = (className: string) => {
    const isCurrentlySelected = selectedClasses.includes(className);
    const newSelection = isCurrentlySelected
      ? selectedClasses.filter(c => c !== className)
      : [...selectedClasses, className];
    onChange(newSelection);
  };

  const handleClick = (e: React.MouseEvent, className?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (className === undefined) {
      onChange([]);
    } else {
      toggleClass(className);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-48 justify-between">
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-48" 
        align="start"
        onClick={e => e.stopPropagation()}
      >
        <DropdownMenuItem
          className="flex items-center justify-between cursor-pointer"
          onClick={e => handleClick(e)}
        >
          <span>Alle Klassen</span>
          {selectedClasses.length === 0 && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        
        {availableClasses.map((className) => (
          <DropdownMenuItem
            key={className}
            className="flex items-center justify-between cursor-pointer"
            onClick={e => handleClick(e, className)}
          >
            <span>{className}</span>
            {selectedClasses.includes(className) && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
