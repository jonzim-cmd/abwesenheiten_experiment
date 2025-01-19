import React from 'react';
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
  // Helfer-Funktion zum Formatieren der ausgewählten Klassen
  const formatSelectedClasses = () => {
    if (selectedClasses.length === 0) return "all";
    if (selectedClasses.length === 1) return selectedClasses[0];
    return `${selectedClasses.length} Klassen`;
  };

  // Helfer-Funktion zum Aktualisieren der Auswahl
  const handleSelection = (className: string) => {
    if (className === "all") {
      onChange([]);
    } else {
      const newSelection = selectedClasses.includes(className)
        ? selectedClasses.filter(c => c !== className)
        : [...selectedClasses, className];
      onChange(newSelection);
    }
  };

  return (
    <div className="w-48">
      <Select
        value={formatSelectedClasses()}
        onValueChange={handleSelection}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Klasse(n) auswählen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Klassen</SelectItem>
          {availableClasses.map((className) => (
            <SelectItem key={className} value={className}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedClasses.includes(className)}
                  onChange={() => handleSelection(className)}
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
