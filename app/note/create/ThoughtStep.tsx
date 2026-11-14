"use client";

import { useNoteCreation } from "@/app/contexts/NoteCreationContext";

export const ThoughtStep = () => {
  const { thought, setThought } = useNoteCreation();
  return <div>
    <h2 className="text-xl font-bold mb-2">Suy nghĩ hôm nay</h2>
    <p className="text-sm opacity-70 mb-4">Bạn cảm nhận thế nào về cây hôm nay?</p>
    <textarea className="textarea textarea-bordered w-full min-h-36" placeholder="Ghi lại suy nghĩ của bạn về cây..." value={thought} onChange={(event) => setThought(event.target.value)} maxLength={2000} />
    <p className="text-xs opacity-60 text-right">{thought.length}/2000</p>
  </div>;
};
