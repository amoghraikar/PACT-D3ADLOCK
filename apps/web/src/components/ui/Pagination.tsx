"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-2 ${className}`}
    >
      {totalItems !== undefined && (
        <div className="text-xs text-ink-600">
          Showing{" "}
          <span className="font-semibold text-ink-800">
            {(currentPage - 1) * (itemsPerPage || 1) + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-ink-800">
            {Math.min(currentPage * (itemsPerPage || 1), totalItems)}
          </span>{" "}
          of <span className="font-semibold text-ink-800">{totalItems}</span> items
        </div>
      )}

      <div className="flex items-center gap-1.5 ml-auto">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canPrev}
          onClick={() => onPageChange(currentPage - 1)}
          icon={<ChevronLeft className="w-4 h-4" />}
        >
          Previous
        </Button>

        <span className="px-3 py-1 text-xs font-semibold text-ink-800 bg-white border border-ice-200 rounded-md">
          Page {currentPage} of {totalPages}
        </span>

        <Button
          variant="secondary"
          size="sm"
          disabled={!canNext}
          onClick={() => onPageChange(currentPage + 1)}
          icon={<ChevronRight className="w-4 h-4" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
