import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Plus } from '../icons';

export interface ClientNote {
  id: string;
  clientName: string;
  noteText: string;
  date: string;
}

export interface NotesPanelProps {
  initialNotes?: ClientNote[];
  className?: string;
}

export const NotesPanel: React.FC<NotesPanelProps> = React.memo(({
  initialNotes = [
    { id: '1', clientName: 'Alexander Hayes', noteText: 'Prefers 2-minute rest intervals on working sets over 90s.', date: 'Aug 02' },
    { id: '2', clientName: 'Sarah Jenkins', noteText: 'Recovering from mild rotator cuff strain. Avoid heavy shoulder press.', date: 'Jul 26' },
  ],
  className,
}) => {
  const [notes, setNotes] = useState<ClientNote[]>(initialNotes);
  const [newNote, setNewNote] = useState('');

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    setNotes((prev) => [
      { id: `n-${Date.now()}`, clientName: 'General Client Note', noteText: newNote, date: 'Today' },
      ...prev,
    ]);
    setNewNote('');
  };

  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Private Coaching Observations & Notes</span>

      <div className="flex gap-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add quick client cue or observation..."
          className="flex-1 bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4 text-indigo-400" />} onClick={handleAddNote}>
          Add
        </Button>
      </div>

      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
        {notes.map((n) => (
          <div key={n.id} className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-400">{n.clientName}</span>
              <span className="text-[10px] text-slate-500">{n.date}</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">{n.noteText}</p>
          </div>
        ))}
      </div>
    </Card>
  );
});

NotesPanel.displayName = 'NotesPanel';
