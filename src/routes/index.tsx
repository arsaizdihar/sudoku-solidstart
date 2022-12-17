import classNames from "classnames";
import {
  Component,
  createEffect,
  createMemo,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import {
  RouteDataArgs,
  useNavigate,
  useRouteData,
  useSearchParams,
} from "solid-start";
import { createServerData$ } from "solid-start/server";
import { BigGrid } from "~/components/BigGrid";
import generator from "~/sudoku/generator";
import { Board, checkUnique } from "~/sudoku/solver";
import {
  counts,
  errors,
  finished,
  focusTile,
  lockNum,
  notesMode,
  setErrors,
  setFocusTile,
  setLockNum,
  setNotesMode,
  setSudoku,
  sudoku,
} from "~/sudoku/states";
import { Notes, State } from "~/sudoku/type";
import {
  autoNotate,
  checkError,
  getCopy,
  pushOrdered,
  searchFirstNum,
  updateNotes,
} from "~/sudoku/utils";

const difficulties = [
  { name: "Easy", value: 0 },
  { name: "Medium", value: 1 },
  { name: "Hard", value: 2 },
  { name: "Expert", value: 3 },
];

export function routeData({ location }: RouteDataArgs) {
  return createServerData$(
    ([_, _dif]) => {
      const level = [28, 37, 45, 58];
      let dif = Number(_dif);
      if (isNaN(dif) || dif < 0 || dif > 3) dif = 1;
      let missing = level[dif];
      let sd = [];
      let count = 0;
      const sudoku = [];
      let solution: Board | null = [];
      do {
        count++;
        if (count > 10) missing--;
        const { puzzle } = generator.getGame(missing);
        sd = [];
        for (let i = 0; i < 9; i++) {
          for (let j = 0; j < 9; j++) {
            const key = `${String.fromCharCode(65 + i)}${j + 1}`;
            let val: number | null = Number(puzzle.get(key)) - 1;
            if (val === -1) {
              val = null;
            }
            sd.push(val);
          }
        }
        solution = checkUnique(sd);
        if (solution) break;
        // eslint-disable-next-line no-constant-condition
      } while (true);
      for (let i = 0; i < 9; i++) {
        const row = [];
        for (let j = 0; j < 9; j++) {
          const val = sd[i * 9 + j];
          row.push(val !== null ? val + 1 : null);
        }
        sudoku.push(row);
      }

      const sol = [];

      for (let i = 0; i < 9; i++) {
        const row = [];
        for (let j = 0; j < 9; j++) {
          const val = solution[i * 9 + j];
          row.push(val !== null ? val + 1 : null);
        }
        sol.push(row);
      }
      return {
        sudoku,
        solution: sol,
      };
    },
    { key: () => ["game", location.query.dif] }
  );
}

export default function Home() {
  const data = useRouteData<typeof routeData>();
  createEffect(() => console.log(data()));
  return (
    <>
      <Show when={data()}>
        <App data={data()!} />
      </Show>
    </>
  );
}

const App: Component<{
  data: { sudoku: (number | null)[][]; solution: (number | null)[][] };
}> = ({ data }) => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dif = () => {
    const dif = Number(params.dif);
    if (isNaN(dif) || dif < 0 || dif > 3) return 1;
    return dif;
  };
  createEffect(() => {
    setSudoku(
      data.sudoku.map((row) =>
        row.map((value) => (value ? value : { c: [], m: [] }))
      )
    );
    // setMutable(data.sudoku.map((row) => row.map((v) => typeof v !== "number")));
    setFocusTile(null);
    setLockNum(null);
    setNotesMode(0);
  });

  const undoStack: State[] = [];
  const mutable = createMemo(() =>
    data.sudoku.map((row) => row.map((v) => typeof v !== "number"))
  );

  function onNumberClick(v: {
    num?: number;
    isDelete?: boolean;
    pos?: [number, number];
  }) {
    const pos = v.pos || focusTile();
    const isDelete = v.isDelete;
    const input = v.num as number;
    if (!pos || !mutable()[pos[0]][pos[1]]) return;
    const [row, col] = pos;
    const tile = sudoku()[row][col];
    const answered = typeof tile === "number";
    if (notesMode() !== 0 && !isDelete && answered) return;
    if (
      isDelete &&
      typeof tile !== "number" &&
      tile.c.length === 0 &&
      tile.m.length === 0
    )
      return;
    if (!isDelete && tile === input) return;
    const copy = getCopy(sudoku());
    if (isDelete) {
      if (typeof tile === "number") {
        copy[row][col] = {
          c: [],
          m: [],
        };
      }
    } else {
      if (notesMode() !== 0) {
        const tile = copy[row][col] as Notes;
        const notes = notesMode() === 1 ? tile.c : tile.m;
        const idx = notes.indexOf(input);
        if (idx === -1) {
          notes.splice(idx, 1);
        } else {
          pushOrdered(notes, input);
        }
      } else {
        if (counts()[input - 1] === 9) return;
        copy[row][col] = input;
        updateNotes(copy, row, col);
      }
    }
    undoStack.push({
      sudoku: sudoku(),
      focusTile: focusTile(),
      errors: errors(),
    });

    const newErrors = checkError(copy);
    setErrors(newErrors);
    setSudoku(copy);
  }

  function undo() {
    if (finished()) return;
    const last = undoStack.pop();
    if (last) {
      setSudoku(last.sudoku);
      setFocusTile(last.focusTile);
      setErrors(last.errors);
    }
  }

  function keyListener(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === "z") {
      undo();
      return;
    }
    if (event.key === "a") {
      setNotesMode(0);
      return;
    }
    if (event.key === "s") {
      setNotesMode(1);
      return;
    }
    if (event.key === "d") {
      setNotesMode(2);
      return;
    }
    if (focusTile()) {
      const [i, j] = focusTile()!;
      if (event.key === "ArrowUp") {
        if (i > 0) setFocusTile([i - 1, j]);
        return;
      } else if (event.key === "ArrowDown") {
        if (i < 8) setFocusTile([i + 1, j]);
        return;
      } else if (event.key === "ArrowLeft") {
        if (j > 0) setFocusTile([i, j - 1]);
        return;
      } else if (event.key === "ArrowRight") {
        if (j < 8) setFocusTile([i, j + 1]);
        return;
      }
    }
    const isDelete = event.key === "Backspace" || event.key === "Delete";
    const input = Number(event.key);
    if (!isDelete && (input < 1 || input > 9 || isNaN(input))) return;
    if (!isDelete && lockNum()) {
      if (counts()[input - 1] === 9) return;
      setLockNum(input);
      const pos: any = searchFirstNum(sudoku(), input);
      if (pos) {
        setFocusTile(pos);
      }
      return;
    }
    onNumberClick({ isDelete, num: input });
  }

  onMount(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("keydown", keyListener);
  });

  onCleanup(() => {
    if (typeof window === "undefined") return;
    window.removeEventListener("keydown", keyListener);
  });

  return (
    <div class="w-full min-h-screen flex flex-col items-center justify-center max-w-screen-sm mx-auto border">
      <ul class="grid grid-cols-3 w-full max-w-md box-content border border-black">
        <For each={Array(9)}>
          {(_, i) => (
            <BigGrid id={i()} mutable={mutable} onNumberClick={onNumberClick} />
          )}
        </For>
      </ul>
      <div class="flex mt-1 gap-2 flex-wrap justify-center">
        <button
          class={classNames(
            notesMode() === 0
              ? "bg-blue-400 text-blue-100"
              : "hover:bg-blue-300 text-blue-700",
            "border border-blue-500 rounded px-2 py-1 focus:outline-none"
          )}
          onClick={() => setNotesMode(0)}
        >
          Number
        </button>
        <button
          class={classNames(
            notesMode() === 1
              ? "bg-blue-400 text-blue-100"
              : "hover:bg-blue-300 text-blue-700",
            "border border-blue-500 rounded px-2 py-1 focus:outline-none"
          )}
          onClick={() => setNotesMode(1)}
        >
          Corner Notes
        </button>
        <button
          class={classNames(
            notesMode() === 2
              ? "bg-blue-400 text-blue-100"
              : "hover:bg-blue-300 text-blue-700",
            "border border-blue-500 rounded px-2 py-1 focus:outline-none"
          )}
          onClick={() => setNotesMode(2)}
        >
          Center Notes
        </button>
        <button
          class={classNames(
            "hover:bg-blue-300 text-blue-700",
            "border border-blue-500 rounded px-2 py-1 focus:outline-none"
          )}
          onClick={() => {
            if (finished()) return;
            onNumberClick({ isDelete: true });
          }}
        >
          Erase
        </button>
        <button
          class={classNames(
            "hover:bg-blue-300 text-blue-700",
            "border border-blue-500 rounded px-2 py-1 focus:outline-none"
          )}
          onClick={undo}
        >
          Undo
        </button>
        <button
          class={classNames(
            "hover:bg-blue-300 text-blue-700",
            "border border-blue-500 rounded px-2 py-1 focus:outline-none"
          )}
          onClick={() => {
            setSudoku((sudoku) => autoNotate(sudoku));
          }}
        >
          Auto Notes
        </button>
        <button
          class={classNames(
            "hover:bg-blue-300 text-blue-700",
            "border border-blue-500 rounded px-2 py-1 focus:outline-none"
          )}
          onClick={() => {
            const errors: boolean[][] = Array.from({ length: 9 }, () =>
              Array(9).fill(false)
            );
            for (let i = 0; i < 9; i++) {
              for (let j = 0; j < 9; j++) {
                const tile = sudoku()[i][j];
                if (typeof tile !== "number") continue;
                if (tile !== data.solution[i][j]) {
                  errors[i][j] = true;
                }
              }
            }
            setErrors(errors);
          }}
        >
          Check Solution
        </button>
        <button
          class={classNames(
            lockNum() !== null
              ? "bg-blue-400 text-blue-100"
              : "hover:bg-blue-300 text-blue-700",
            "border border-blue-500 rounded px-2 py-1 focus:outline-none"
          )}
          onClick={() => {
            // null if off, 0 if on but no number, 1-9 if on with number
            if (lockNum() !== null) {
              setLockNum(null);
              return;
            }

            if (focusTile()) {
              const [i, j] = focusTile()!;
              const num = sudoku()[i][j];
              if (typeof num === "number") {
                setLockNum(num);
                return;
              }
            }
            setLockNum(0);
          }}
        >
          Lock Mode
        </button>
      </div>
      <div class="mt-2 grid grid-cols-9 gap-1 w-full max-w-sm">
        <For each={counts()}>
          {(count, i) => (
            <button
              class={classNames(
                "pb-1 flex flex-col items-center rounded relative text-blue-800 font-medium text-lg focus:outline-none disabled:opacity-0",
                lockNum() !== null && lockNum() !== i() + 1
                  ? "bg-gray-200 hover:bg-blue-200"
                  : "bg-blue-200 hover:bg-blue-100"
              )}
              onClick={() => {
                if (lockNum() !== null) {
                  if (lockNum() !== i() + 1) {
                    const pos: any = searchFirstNum(sudoku(), i() + 1);
                    if (pos) {
                      setFocusTile(pos);
                    }
                    setLockNum(i() + 1);
                    return;
                  }
                }
                onNumberClick({ num: i() + 1 });
              }}
              disabled={count === 9}
            >
              <span>{i() + 1}</span>
              <span class="text-xs text-gray-500">{9 - count}</span>
            </button>
          )}
        </For>
      </div>
      <div class="mt-2">
        <select
          value={dif()}
          onChange={(e) => {
            const val = Number(e.currentTarget.value);
            if (val !== dif()) {
              navigate(`/?dif=${val}`, { replace: true });
            }
          }}
        >
          {difficulties.map((difficulty) => (
            <option value={difficulty.value}>{difficulty.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};
