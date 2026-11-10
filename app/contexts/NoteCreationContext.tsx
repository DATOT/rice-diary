"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface NoteCreationContextType {
  thumbnailPath: string | null;
  setThumbnailPath: (path: string | null) => void;
  leafPaths: string[];
  setLeafPaths: (path: string[]) => void;
  submitting: boolean;
  setSubmitting: (sub: boolean) => void;
  resetForm: () => void;
}

const NoteCreationContext = createContext<NoteCreationContextType | undefined>(
  undefined,
);

export function NoteCreationProvider({ children }: { children: ReactNode }) {
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null);
  const [leafPaths, setLeafPaths] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const resetForm = () => {
    setThumbnailPath(null);
    setLeafPaths([]);
  };

  return (
    <NoteCreationContext.Provider
      value={{
        thumbnailPath,
        setThumbnailPath,
        leafPaths,
        setLeafPaths,
        resetForm,
        submitting,
        setSubmitting,
      }}
    >
      {children}
    </NoteCreationContext.Provider>
  );
}

export function useNoteCreation() {
  const context = useContext(NoteCreationContext);
  if (!context) {
    throw new Error(
      "useNoteCreation must be used within a NoteCreationProvider",
    );
  }
  return context;
}
