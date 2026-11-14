"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface NoteCreationContextType {
  thumbnailPath: string | null;
  setThumbnailPath: (path: string | null) => void;
  leafPaths: string[];
  setLeafPaths: (path: string[]) => void;
  thought: string;
  setThought: (thought: string) => void;
  submitting: boolean;
  setSubmitting: (sub: boolean) => void;
  resetForm: () => void;
}

const NoteCreationContext = createContext<NoteCreationContextType | undefined>(undefined);

export function NoteCreationProvider({ children }: { children: ReactNode }) {
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null);
  const [leafPaths, setLeafPaths] = useState<string[]>([]);
  const [thought, setThought] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setThumbnailPath(null);
    setLeafPaths([]);
    setThought("");
  };

  return (
    <NoteCreationContext.Provider value={{
      thumbnailPath, setThumbnailPath, leafPaths, setLeafPaths,
      thought, setThought, resetForm, submitting, setSubmitting,
    }}>
      {children}
    </NoteCreationContext.Provider>
  );
}

export function useNoteCreation() {
  const context = useContext(NoteCreationContext);
  if (!context) throw new Error("useNoteCreation phải được dùng bên trong NoteCreationProvider");
  return context;
}
