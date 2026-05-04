import { useEffect, useState } from 'react';
import {
  type Recording,
  deleteRecording,
  formatDuration,
  listRecordings,
  renameRecording,
} from './recordings';

type Props = {
  refreshKey: number;
  onRefresh: () => void;
  onPlay: (rec: Recording) => void;
  onCancel: () => void;
  playingId: string | null;
};

export function RecordingsStrip({
  refreshKey,
  onRefresh,
  onPlay,
  onCancel,
  playingId,
}: Props) {
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

  if (items === null) return null;

  if (items.length === 0) {
    return (
      <div className="rec-empty">
        Toggle <strong>Record</strong> and capture a sequence — your recordings will live here.
      </div>
    );
  }

  return (
    <div className="rec-strip" role="list" aria-label="Saved recordings">
      {items.map((rec) => {
        const isPlaying = playingId === rec.id;
        const isEditing = editingId === rec.id;
        return (
          <div key={rec.id} className={`rec-card ${isPlaying ? 'playing' : ''}`} role="listitem">
            <button
              type="button"
              className="rec-card-play"
              onClick={() => (isPlaying ? onCancel() : onPlay(rec))}
              aria-label={isPlaying ? `Stop ${rec.name}` : `Play ${rec.name}`}
            >
              {isPlaying ? <StopIcon /> : <PlayIcon />}
            </button>
            <div className="rec-card-meta">
              {isEditing ? (
                <input
                  autoFocus
                  className="rec-card-rename"
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
                  className="rec-card-name"
                  onClick={() => startRename(rec)}
                  title="Rename"
                >
                  {rec.name}
                </button>
              )}
              <span className="rec-card-dur">{formatDuration(rec.duration)}</span>
            </div>
            <button
              type="button"
              className="rec-card-del"
              onClick={() => handleDelete(rec.id)}
              aria-label={`Delete ${rec.name}`}
              title="Delete"
            >
              <CloseIcon />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
