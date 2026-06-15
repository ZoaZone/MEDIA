import { Clock } from "lucide-react";

/**
 * Per-image duration editor for the compiled video. `durations[i]` is the
 * seconds for `images[i]`; any missing entry defaults to 3s. Always emits an
 * array the same length as `images` so it stays in sync as clips are added
 * or removed.
 */
export default function ClipTimeline({ images, durations, onChange }) {
  if (!images.length) return null;

  const getDur = (i) => durations?.[i] ?? 3;
  const setDur = (i, val) => {
    const next = images.map((_, j) => (j === i ? val : getDur(j)));
    onChange(next);
  };
  const total = images.reduce((sum, _, i) => sum + getDur(i), 0);

  return (
    <div className="pt-6 border-t border-neutral-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2"><Clock className="w-4 h-4 text-fuchsia-400" /> Clip Timing</h3>
        <p className="text-xs text-neutral-500">Total length ≈ {total.toFixed(1)}s</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((url, i) => (
          <div key={i} className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="aspect-video bg-black">
              <img src={url} alt={`Clip ${i + 1}`} className="w-full h-full object-cover" />
            </div>
            <div className="p-3">
              <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 mb-1.5 block">Clip {i + 1} · {getDur(i)}s</label>
              <input type="range" min={1} max={8} step={0.5} value={getDur(i)} onChange={e => setDur(i, +e.target.value)} className="w-full accent-fuchsia-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
