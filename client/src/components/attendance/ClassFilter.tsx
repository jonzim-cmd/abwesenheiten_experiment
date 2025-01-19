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
  const [isOpen, setIsOpen] = useState(false);

  const formatSelectedClasses = () => {
    if (selectedClasses.length === 0) return "Alle Klassen";
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

  const handleTriggerClick = () => {
    setIsOpen(true);
  };

  return (
    <div className="w-48">
      <Select 
        value={formatSelectedClasses()}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger className="w-full" onClick={handleTriggerClick}>
          <SelectValue placeholder="Klasse(n) auswählen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem 
            value="all" 
            onSelect={(e) => {
              e.preventDefault();
              onChange([]);
            }}
          >
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
              onSelect={(e) => {
                e.preventDefault();
                toggleClass(className);
              }}
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
