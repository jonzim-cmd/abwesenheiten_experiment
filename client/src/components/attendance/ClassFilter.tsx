import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check } from "lucide-react";

interface ClassFilterProps {
  availableClasses: string[];
  selectedClasses: string[];
  onChange: (classes: string[]) => void;
}

export function ClassFilter({ availableClasses, selectedClasses, onChange }: ClassFilterProps) {
  const [open, setOpen] = useState(false);

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
        open={open}
        onOpenChange={setOpen}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            {selectedClasses.length === 0 ? "Alle Klassen" : selectedClasses.join(", ")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem 
            value="all"
            className="relative flex items-center"
          >
            <div className="flex items-center gap-2 flex-1">
              Alle Klassen
              {selectedClasses.length === 0 && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </div>
          </SelectItem>
          {availableClasses.map((className) => (
            <SelectItem 
              key={className} 
              value={className}
              className="relative flex items-center"
              onSelect={(e) => {
                e.preventDefault();
                toggleClass(className);
              }}
            >
              <div className="flex items-center gap-2 flex-1">
                {className}
                {selectedClasses.includes(className) && (
                  <Check className="h-4 w-4 ml-auto" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
