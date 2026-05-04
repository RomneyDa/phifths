import { useEffect, useState } from 'react';
import {
  type Recording,
  deleteRecording,
  formatDuration,
  listRecordings,
  renameRecording,
} from './recordings';

type Props = {
  onClose: () => void;
  onPlay: (rec: Recording) => void;
  refreshKey: number;
  onRefresh: () => void;
};

export function RecordingsLibrary({ onClose, onPlay, refreshKey, onRefresh }: Props) {
  const [items, setItems] = useState<Recording[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    let cancelled = false;
    listRecordings().then((recs) => {
      if (!cancelled) setItems(recs);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleDelete = async (id: string) => {
    await deleteRecording(id);
    onRefresh();
  };

  const startRename = (rec: Recording) => {
    setEditingId(rec.id);
    setEditValue(rec.name);
  };

  const commitRename = async () => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (trimmed) {
      await renameRecording(editingId, trimmed);
      onRefresh();
    }
    setEditingId(null);
    setEditValue('');
  };

  return (
    <div className="library-backdrop" onClick={onClose}>
      <div
        className="library-sheet"
        role="dialog"
        aria-label="Recordings"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="library-header">
          <h2>Recordings</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>

        {items === null ? (
          <div className="library-empty">Loading…</div>
        ) : items.length === 0 ? (
          <div className="library-empty">
            No recordings yet. Toggle <strong>Record</strong> in the circle, then hit
            Record to capture one.
          </div>
        ) : (
          <ul className="library-list">
            {items.map((rec) => (
              <li key={rec.id} className="library-item">
                {editingId === rec.id ? (
                  <input
                    autoFocus
                    className="rename-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      else if (e.key === 'Escape') {
                        setEditingId(null);
                        setEditValue('');
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="library-play"
                    onClick={() => onPlay(rec)}
                    aria-label={`Play ${rec.name}`}
                  >
                    <PlayIcon />
                  </button>
                )}
                <div className="library-meta">
                  {editingId !== rec.id && (
                    <button
                      type="button"
                      className="library-name"
                      onClick={() => onPlay(rec)}
                    >
                      {rec.name}
                    </button>
                  )}
                  <div className="library-sub">
                    {formatDuration(rec.duration)} · {new Date(rec.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="library-actions">
                  <button
                    type="button"
                    className="icon-btn small"
                    onClick={() => startRename(rec)}
                    aria-label={`Rename ${rec.name}`}
                    title="Rename"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    className="icon-btn small danger"
                    onClick={() => handleDelete(rec.id)}
                    aria-label={`Delete ${rec.name}`}
                    title="Delete"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    </svg>
  );
}
