import classNames from "classnames";
import { Accessor, Component, For, Show } from "solid-js";
import {
  errors,
  focusTile,
  lockNum,
  notesMode,
  setFocusTile,
  setLockNum,
  sudoku,
} from "~/sudoku/states";
import type { Notes } from "~/sudoku/type";

function getNoteClassName(i: number, total: number) {
  const isTop = total > 4 ? i < 3 : i < 2;
  const isMiddle = !isTop && total > 6 && i > 2 && i < total - 3;
  const isBottom = !isTop && !isMiddle;
  let isLeft = false;
  if (i === 0) isLeft = true;
  else if (total < 5) isLeft = i === 2;
  else if (i === 3) isLeft = true;
  else if (total > 6) isLeft = total - 3 === i;
  let isMid = false;
  if (total > 4) {
    if (i === 1) isMid = true;
    else if (total < 7) isMid = i === 4;
    else if (i === total - 2) isMid = true;
    else if (total === 9) isMid = i === 4;
  }
  const isRight = !isLeft && !isMid;
  return classNames("absolute text-xs text-gray-500", {
    "top-[1px]": isTop,
    "top-1/2 -translate-y-1/2": isMiddle,
    "bottom-[1px]": isBottom,
    "left-[1px]": isLeft,
    "left-1/2 -translate-x-1/2": isMid,
    "right-[1px]": isRight,
  });
}

export const BigGrid: Component<{
  id: number;
  mutable: Accessor<boolean[][]>;
  onNumberClick: (v: {
    num?: number;
    isDelete?: boolean;
    pos?: [number, number];
  }) => void;
}> = ({ id, mutable, onNumberClick }) => {
  return (
    <li class={classNames("border border-black")}>
      <ul class="grid grid-cols-3">
        <For each={Array(9)}>
          {(_, i) => {
            const row = Math.floor(id / 3) * 3 + Math.floor(i() / 3);
            const col = (id % 3) * 3 + (i() % 3);
            const tile = () => sudoku()[row][col];
            const error = () => errors()[row][col];
            const isMutable = () => mutable()[row][col];
            const pos = () => focusTile() || [-1, -1];
            const x = () => pos()[1];
            const y = () => pos()[0];
            const sameBlock =
              Math.floor(y() / 3) === Math.floor(row / 3) &&
              Math.floor(x() / 3) === Math.floor(col / 3);
            const focus = () => (focusTile() ? sudoku()[y()][x()] : null);
            let focusNum: null | number = null;
            if (lockNum()) {
              focusNum = lockNum();
            } else {
              focusNum = typeof focus() === "number" ? (focus() as any) : null;
            }
            let bgClass = () => {
              if (error()) {
                return "bg-red-200";
              } else if (focusNum) {
                if (tile() === focusNum) {
                  return "bg-blue-100";
                } else if (y() === row || x() === col || sameBlock) {
                  return "bg-blue-50";
                }
              } else if (focus() && (y() === row || x() === col || sameBlock)) {
                return "bg-blue-50";
              }
            };
            return (
              <li class={classNames("aspect-square border-black border")}>
                <button
                  class={classNames(
                    "h-full w-full flex justify-center items-center focus:outline-none font-medium relative",
                    !isMutable() && "text-blue-600",
                    bgClass()
                  )}
                  onClick={() => {
                    if (!lockNum() || notesMode() === 0) {
                      setFocusTile([row, col]);
                    }
                    if (lockNum() !== null) {
                      if (typeof tile() !== "number") {
                        if (lockNum() !== 0)
                          onNumberClick({ num: lockNum()!, pos: [row, col] });
                      } else {
                        setLockNum(tile() as any);
                      }
                    }
                  }}
                >
                  <Show
                    when={typeof tile() !== "number"}
                    fallback={<>{tile()}</>}
                  >
                    <div class="absolute inset-0">
                      <For each={(tile() as Notes).c}>
                        {(n, i) => (
                          <span
                            class={classNames(
                              getNoteClassName(i(), (tile() as Notes).c.length),
                              typeof focusNum === "number" &&
                                focusNum === n &&
                                "bg-blue-200 text-black"
                            )}
                          >
                            {n}
                          </span>
                        )}
                      </For>
                    </div>
                    <div class="absolute inset-0 flex items-center justify-center gap-[1px] text-center text-xs text-gray-500">
                      <For each={(tile() as Notes).m}>
                        {(n) => (
                          <span
                            class={classNames(
                              typeof focusNum === "number" &&
                                focusNum === n &&
                                "bg-blue-200 text-black"
                            )}
                          >
                            {n}
                          </span>
                        )}
                      </For>
                    </div>
                  </Show>
                </button>
              </li>
            );
          }}
        </For>
      </ul>
    </li>
  );
};
