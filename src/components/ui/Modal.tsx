'use client';

import { useEffect, useRef } from 'react';

export function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4 sm:p-6 w-full h-full max-w-none max-h-none m-0 backdrop:bg-[rgba(43,30,18,0.55)] backdrop:backdrop-blur-[4px]"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-5xl max-h-[calc(100vh-48px)] rounded-xl shadow-2xl relative flex flex-col overflow-hidden"
        style={{ background: 'var(--color-paper)' }}
      >
        <div className="flex-1 overflow-y-auto w-full">
          {children}
        </div>
      </div>
    </dialog>
  );
}
