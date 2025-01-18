import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FilterControlsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedClass: string;
  onClassChange: (value: string) => void;
  availableStudents: [string, any][];
}

const FilterControls = ({
  searchQuery,
  onSearchChange,
  selectedClass,
  onClassChange,
  availableStudents
}: FilterControlsProps) => {
  // Get unique classes from available students
  const classes = React.useMemo(() => {
    const uniqueClasses = new Set(availableStudents.map(([_, stats]) => stats.klasse));
    return ['Alle', ...Array.from(uniqueClasses)].sort();
  }, [availableStudents]);

  return (
    <div className="flex items-center gap-4">
      <div className="w-72">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Namen eingeben..."
          className="w-full"
        />
      </div>
      <div className="w-40">
        <Select value={selectedClass} onValueChange={onClassChange}>
          <SelectTrigger>
            <SelectValue placeholder="Klasse auswählen" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((className) => (
              <SelectItem key={className} value={className}>
                {className}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default FilterControls;
