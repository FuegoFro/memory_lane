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
      className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4 sm:p-6 w-full h-full max-w-none max-h-none m-0 backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div className="bg-gray-900 border border-gray-700 w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl relative flex flex-col overflow-hidden">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="flex-1 overflow-y-auto w-full">
          {children}
        </div>
      </div>
    </dialog>
  );
}
