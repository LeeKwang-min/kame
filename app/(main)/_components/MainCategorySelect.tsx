"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dispatch, SetStateAction } from "react";

interface IProps {
  category: string;
  setCategory: Dispatch<SetStateAction<string>>;
}

function MainCategorySelect({ category, setCategory }: IProps) {
  return (
    <Select value={category} onValueChange={setCategory}>
      <SelectTrigger className="w-[160px] data-[size=default]:h-10 border border-gray-300 rounded-md">
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All</SelectItem>
        <SelectItem value="About">About</SelectItem>
        <SelectItem value="Development">Development</SelectItem>
        <SelectItem value="Content">Content</SelectItem>
        <SelectItem value="Fun">Fun</SelectItem>
        <SelectItem value="Media">Media</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default MainCategorySelect;
