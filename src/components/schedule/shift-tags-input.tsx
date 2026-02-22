"use client";

import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useShopTags } from "@/hooks/use-shifts";
import { useShopStore } from "@/stores/shop-store";
import { createShopTag } from "@/actions/shifts";
import { Tags, X } from "lucide-react";

type ShiftTagsInputProps = {
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
};

export function ShiftTagsInput({
  selectedTagIds,
  onChange,
}: ShiftTagsInputProps) {
  const shopId = useShopStore((s) => s.activeShopId);
  const queryClient = useQueryClient();
  const { data: tags = [] } = useShopTags();
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(filter.toLowerCase())
  );

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

  function toggleTag(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  }

  function removeTag(tagId: string) {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  }

  async function handleCreateTag() {
    if (!filter.trim() || !shopId) return;
    const result = await createShopTag(shopId, filter.trim());
    if ("data" in result && result.data) {
      await queryClient.invalidateQueries({ queryKey: ["shop-tags", shopId] });
      onChange([...selectedTagIds, result.data.id]);
      setFilter("");
    }
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      // If exact match exists, toggle it; otherwise create new
      const exactMatch = tags.find(
        (t) => t.name.toLowerCase() === filter.trim().toLowerCase()
      );
      if (exactMatch) {
        toggleTag(exactMatch.id);
        setFilter("");
      } else if (filter.trim()) {
        await handleCreateTag();
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Tags</div>
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="gap-1 text-xs">
              {tag.name}
              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start text-muted-foreground"
          >
            <Tags className="h-3 w-3 mr-2" />
            {selectedTagIds.length > 0
              ? `${selectedTagIds.length} tag${selectedTagIds.length === 1 ? "" : "s"} selected`
              : "Add tags..."}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <Input
            ref={inputRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or create tag..."
            className="h-8 text-sm mb-2"
          />
          <div className="max-h-40 overflow-y-auto space-y-1">
            {filteredTags.map((tag) => (
              <label
                key={tag.id}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer text-sm"
              >
                <Checkbox
                  checked={selectedTagIds.includes(tag.id)}
                  onCheckedChange={() => toggleTag(tag.id)}
                />
                {tag.name}
              </label>
            ))}
            {filter.trim() &&
              !tags.some(
                (t) => t.name.toLowerCase() === filter.trim().toLowerCase()
              ) && (
                <button
                  type="button"
                  onClick={handleCreateTag}
                  className="w-full text-left px-2 py-1 text-sm text-primary hover:bg-accent rounded"
                >
                  Create &ldquo;{filter.trim()}&rdquo;
                </button>
              )}
            {filteredTags.length === 0 && !filter.trim() && (
              <p className="text-xs text-muted-foreground px-2 py-1">
                No tags yet. Type to create one.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
