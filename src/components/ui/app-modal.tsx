"use client";

import { AppDialog, type AppDialogProps } from "@/components/layout/app-dialog";

export type AppModalProps = AppDialogProps;

export function AppModal({
  isOpen,
  isClosing = false,
  onClose,
  labelledBy,
  describedBy,
  panelClassName = "",
  children,
}: AppModalProps) {
  return (
    <AppDialog
      isOpen={isOpen}
      isClosing={isClosing}
      onClose={onClose}
      labelledBy={labelledBy}
      describedBy={describedBy}
      panelClassName={panelClassName}
    >
      {children}
    </AppDialog>
  );
}
