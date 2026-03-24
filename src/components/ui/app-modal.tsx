"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface AppModalProps {
  isOpen: boolean;
  isClosing?: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  panelClassName?: string;
  children: React.ReactNode;
}

export function AppModal({
  isOpen,
  isClosing = false,
  onClose,
  labelledBy,
  describedBy,
  panelClassName = "",
  children,
}: AppModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      data-app-modal-root="true"
      className={`fixed inset-0 z-[999] flex items-center justify-center p-4 transition-all duration-200 ${
        isClosing ? "bg-black/0 backdrop-blur-0" : "bg-black/78 backdrop-blur-sm"
      }`}
    >
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onClick={(event) => event.stopPropagation()}
        className={panelClassName}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
