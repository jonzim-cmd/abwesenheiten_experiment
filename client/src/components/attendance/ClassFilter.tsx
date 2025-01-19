import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClassFilterProps {
  availableClasses: string[];
  selectedClasses: string[];
  onChange: (classes: string[]) => void;
}

export function ClassFilter({ availableClasses, selectedClasses, onChange }: ClassFilterProps) {
  // Remove isOpen state as Select handles this internally
  
  const formatSelectedClasses = () => {
    if (selectedClasses.length === 0) return "all";
    return selectedClasses.join(", ");
  };

  const toggleClass = (className: string) => {
    const isCurrentlySelected = selectedClasses.includes(className);
    if (isCurrentlySelected) {
      onChange(selectedClasses.filter(c => c !== className));
    } else {
      onChange([...selectedClasses, className]);
    }
  };

  return (
    <div className="w-48">
      <Select 
        value={formatSelectedClasses()}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            {selectedClasses.length === 0 ? "Alle Klassen" : selectedClasses.join(", ")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedClasses.length === 0}
                onChange={() => onChange([])}
                onClick={(e) => e.stopPropagation()}
                className="mr-2"
              />
              Alle Klassen
            </div>
          </SelectItem>
          {availableClasses.map((className) => (
            <SelectItem 
              key={className} 
              value={className}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedClasses.includes(className)}
                  onChange={() => toggleClass(className)}
                  onClick={(e) => e.stopPropagation()}
                  className="mr-2"
                />
                {className}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
