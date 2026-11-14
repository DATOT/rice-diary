"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type CreationPhase = "idle" | "saving" | "leaves" | "diseases";
interface NoteCreationContextType {
  thumbnailPath: string | null; setThumbnailPath: (path: string | null) => void;
  leafPaths: string[]; setLeafPaths: (path: string[]) => void;
  thought: string; setThought: (thought: string) => void;
  submitting: boolean; setSubmitting: (sub: boolean) => void;
  phase: CreationPhase; setPhase: (phase: CreationPhase) => void;
  phaseMessage: string; setPhaseMessage: (message: string) => void;
  resetForm: () => void;
}
const NoteCreationContext = createContext<NoteCreationContextType | undefined>(undefined);
export function NoteCreationProvider({ children }: { children: ReactNode }) {
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null);
  const [leafPaths, setLeafPaths] = useState<string[]>([]);
  const [thought, setThought] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<CreationPhase>("idle");
  const [phaseMessage, setPhaseMessage] = useState("");
  const resetForm = () => { setThumbnailPath(null); setLeafPaths([]); setThought(""); setPhase("idle"); setPhaseMessage(""); };
  return <NoteCreationContext.Provider value={{ thumbnailPath, setThumbnailPath, leafPaths, setLeafPaths, thought, setThought, submitting, setSubmitting, phase, setPhase, phaseMessage, setPhaseMessage, resetForm }}>{children}</NoteCreationContext.Provider>;
}
export function useNoteCreation() {
  const context = useContext(NoteCreationContext);
  if (!context) throw new Error("useNoteCreation phải được dùng bên trong NoteCreationProvider");
  return context;
}
