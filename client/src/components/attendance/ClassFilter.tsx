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

const ClassFilter: React.FC<ClassFilterProps> = ({ availableClasses, selectedClasses, onChange }) => {
 return (
   <div className="w-48">
     <Select
       value={selectedClasses.length === 0 ? "all" : selectedClasses.join(",")}
       onValueChange={(value) => {
         if (value === "all") {
           onChange([]);
         } else {
           onChange(value.split(","));
         }
       }}
     >
       <SelectTrigger className="w-full">
         <SelectValue placeholder="Klasse(n) auswählen" />
       </SelectTrigger>
       <SelectContent>
         <SelectItem value="all">Alle Klassen</SelectItem>
         {availableClasses.map((className) => (
           <SelectItem key={className} value={className}>
             {className}
           </SelectItem>
         ))}
       </SelectContent>
     </Select>
   </div>
 );
};

export default ClassFilter;
