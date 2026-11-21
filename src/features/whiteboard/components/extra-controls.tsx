import type { useWhiteboardExtras } from "../hooks/use-whiteboard-extras";

type Extras = ReturnType<typeof useWhiteboardExtras>;

type Props = {
  extras: Extras;
  tool: string;
  resolution: 1 | 2;
  transparent: boolean;
  exporting: boolean;
  onResolutionChange: (value: 1 | 2) => void;
  onTransparentChange: (value: boolean) => void;
  onExport: () => void;
};

const control =
  "border border-stone-300 bg-white px-2 py-1 text-xs " + "disabled:opacity-40";

export function ExtraControls(props: Props) {
  const { extras } = props;
  const library = extras.library;
  const busy = !!extras.editing;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-white p-2">
      <select
        aria-label="Current Board"
        value={library.activeId}
        disabled={busy || !library.activeId}
        onChange={(event) => library.switchBoard(event.target.value)}
        className={`${control} max-w-40`}
      >
        {library.boards.map((board) => (
          <option key={board.id} value={board.id}>
            {board.name}
          </option>
        ))}
      </select>

      <button
        className={control}
        disabled={busy || !library.activeId}
        onClick={library.createBoard}
      >
        New Board
      </button>

      <button
        className={control}
        disabled={busy || !library.activeId}
        onClick={library.renameBoard}
      >
        Rename
      </button>

      <button
        className={control}
        disabled={busy || !library.activeId}
        onClick={library.deleteBoard}
      >
        Delete
      </button>
      <button
        className={control}
        aria-pressed={props.tool === "text"}
        onClick={() => extras.changeTool("text")}
      >
        Text (T)
      </button>

      <button
        className={control}
        aria-pressed={props.tool === "note"}
        onClick={() => extras.changeTool("note")}
      >
        Note (N)
      </button>

      <label className="flex items-center gap-1 text-xs">
        Font
        <select
          value={extras.fontSize}
          onChange={(event) =>
            extras.changeFontSize(Number(event.target.value))
          }
          className={control}
        >
          <option value={extras.fontSize}>{extras.fontSize}px</option>

          {[12, 16, 20, 25, 32, 40, 48, 64, 72]
            .filter((size) => size !== extras.fontSize)
            .map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
        </select>
      </label>

      <label className="flex items-center gap-1 text-xs">
        Note color
        <input
          type="color"
          aria-label="Sticky note"
          value={extras.noteColor}
          onChange={(event) => extras.changeNoteColor(event.target.value)}
          className="h-7 w-8 cursor-pointer border border-stone-300"
        />
      </label>

      <button className={control} onClick={extras.resetView}>
        Reset view * {Math.round(extras.zoom * 100)}%
      </button>

      <span className="mx-1 text-stone-300">|</span>

      <select
        aria-label="PNG Resolution"
        value={props.resolution}
        onChange={(event) =>
          props.onResolutionChange(Number(event.target.value) as 1 | 2)
        }
        className={control}
      >
        <option value={1}>PNG 1</option>
        <option value={2}>PNG 2</option>
      </select>

      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={props.transparent}
          onChange={(event) => props.onTransparentChange(event.target.checked)}
        />
        Transparent
      </label>

      <button
        className={control}
        disabled={busy || props.exporting}
        onClick={props.onExport}
      >
        {props.exporting ? "EXportingg.." : "Export PNG"}
      </button>
    </div>
  );
}
