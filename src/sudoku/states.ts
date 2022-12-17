import { createMemo, createSignal } from "solid-js";
import { State } from "./type";
import { updateCounts } from "./utils";

export const [sudoku, setSudoku] = createSignal<State["sudoku"]>(
  Array(9).fill(Array(9).fill({ c: [], m: [] }))
);

export const [focusTile, setFocusTile] = createSignal<State["focusTile"]>(null);
export const counts = createMemo(() => updateCounts(sudoku()));
export const [errors, setErrors] = createSignal<State["errors"]>(
  Array(9).fill(Array(9).fill(false))
);
export const [notesMode, setNotesMode] = createSignal<number>(0);
export const [lockNum, setLockNum] = createSignal<number | null>(null);
export const [finished, setFinished] = createSignal<boolean>(false);
