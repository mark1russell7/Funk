/**
 * The two pipelines of the railway. Each run calls the real `chain`, `mapRight`, `mapLeft`, `fold` and `orElse` of Funk.
 * A step records its name when Funk calls it. Thus "not called" on the page is a fact, not a guess.
 */
import { OptionalMap } from "funk/optional/collections/optional.map";
import { chain, fold, isLeft, isRight, left, mapLeft, mapRight, orElse, right, type Either } from "funk/optional/either";
import { some } from "funk/optional/optional";
import { showEither, text } from "./format.ts";

export type Mode = "order" | "lookup";
export type Track = "right" | "left";
export type StopState = "ran" | "failed" | "skipped";
export type StopKind = "chain" | "mapRight" | "mapLeft" | "end";

/** One stop of a pipeline, before a run. */
interface Plan {
  readonly id: string;
  readonly call: string;
  readonly kind: StopKind;
  readonly canFail: boolean;
}

/** One stop of a run. */
export interface Stop extends Plan {
  readonly state: StopState;
  /** The text of the value after this stop. */
  readonly after: string;
  /** True when Funk gave back the same object that it got. */
  readonly same: boolean;
  /** The track after this stop. */
  readonly track: Track;
}

/** One run of a pipeline. */
export interface Run {
  readonly mode: Mode;
  readonly stops: readonly Stop[];
  /** The text at the end of the run. */
  readonly final: string;
  readonly track: Track;
  /** The names of the steps that Funk called, in sequence. */
  readonly called: readonly string[];
}

/** A set of inputs that the visitor can start with one click. */
export interface Preset {
  readonly id: string;
  readonly label: string;
  readonly input: string;
  readonly flips: readonly string[];
}

/** The words of a pipeline. */
export interface ModeInfo {
  readonly tab: string;
  readonly inputLabel: string;
  readonly flipOff: string;
  readonly flipOn: string;
  readonly presets: readonly Preset[];
}

export const PRICE = 12;
export const STOCK = 10;

export const MODES: Readonly<Record<Mode, ModeInfo>> = {
  order: {
    tab: "Either: buy some records",
    inputLabel: "How many records?",
    flipOff: "Fail here",
    flipOn: "This step fails",
    presets: [
      { id: "clear", label: "All clear", input: "3", flips: [] },
      { id: "word", label: "Not a number", input: "three", flips: [] },
      { id: "many", label: "Too many", input: "40", flips: [] },
      { id: "card", label: "Card declined", input: "3", flips: ["pay"] },
    ],
  },
  lookup: {
    tab: "Optional: find a team lead",
    inputLabel: "Whose team lead?",
    flipOff: "Delete the entry",
    flipOn: "Entry deleted",
    presets: [
      { id: "found", label: "A known name", input: "ada", flips: [] },
      { id: "unknown", label: "An unknown name", input: "linus", flips: [] },
      { id: "team", label: "No team entry", input: "ada", flips: ["team"] },
      { id: "other", label: "A different team", input: "grace", flips: [] },
    ],
  },
};

/** The words of a forced failure of each step of the order. */
const FORCED: Readonly<Record<string, string>> = {
  parse: "the form sent nothing",
  check: "the shelf is empty",
  pay: "the card was declined",
};

/** This function gives the stop of a run from its plan and the values before and after it. */
function stopOf<L, R, LL, RR>(called: readonly string[], plan: Plan, before: Either<L, R>, after: Either<LL, RR>): Stop {
  const failed = isRight(before) && isLeft(after);
  return {
    ...plan,
    state: !called.includes(plan.id) ? "skipped" : failed ? "failed" : "ran",
    after: showEither(after),
    same: (after as unknown) === before,
    track: isRight(after) ? "right" : "left",
  };
}

/** This function buys `input` records. A name in `flips` is a step that fails. */
export function runOrder(input: string, flips: ReadonlySet<string>): Run {
  const called: string[] = [];
  const step =
    <A, B>(id: string, f: (a: A) => Either<string, B>) =>
    (a: A): Either<string, B> => {
      called.push(id);
      const reason = FORCED[id];
      return flips.has(id) && reason !== undefined ? left<string, B>(reason) : f(a);
    };
  const parse = step("parse", (raw: string) => {
    const n = raw.trim() === "" ? Number.NaN : Number(raw);
    return Number.isNaN(n) ? left<string, number>(`${text(raw)} is not a number`) : right<number, string>(n);
  });
  const check = step("check", (n: number) => {
    if (!Number.isInteger(n) || n < 1) return left<string, number>(`${n} is not a count of records`);
    return n > STOCK ? left<string, number>(`the shelf has only ${STOCK}`) : right<number, string>(n);
  });
  const pay = step("pay", (cost: number) => right<number, string>(cost));

  const e0 = right<string, string>(input);
  const e1 = chain(e0, parse);
  const e2 = chain(e1, check);
  const e3 = mapRight(e2, (n) => {
    called.push("price");
    return n * PRICE;
  });
  const e4 = chain(e3, pay);
  const e5 = mapLeft(e4, (reason) => {
    called.push("explain");
    return `No sale: ${reason}`;
  });
  const final = fold(
    e5,
    (reason) => reason,
    (cost) => `Paid $${cost}`,
  );
  called.push("end");

  const stops: Stop[] = [
    stopOf(called, { id: "parse", call: "chain(e, parse)", kind: "chain", canFail: true }, e0, e1),
    stopOf(called, { id: "check", call: "chain(e, check)", kind: "chain", canFail: true }, e1, e2),
    stopOf(called, { id: "price", call: "mapRight(e, price)", kind: "mapRight", canFail: false }, e2, e3),
    stopOf(called, { id: "pay", call: "chain(e, pay)", kind: "chain", canFail: true }, e3, e4),
    stopOf(called, { id: "explain", call: "mapLeft(e, explain)", kind: "mapLeft", canFail: false }, e4, e5),
    { id: "end", call: "fold(e, onLeft, onRight)", kind: "end", canFail: false, state: "ran", after: text(final), same: false, track: isRight(e5) ? "right" : "left" },
  ];
  return { mode: "order", stops, final, track: isRight(e5) ? "right" : "left", called };
}

interface Person {
  readonly team: string;
}
interface Team {
  readonly lead: string;
}

/** This function finds the team lead of `input` in three real `OptionalMap` tables. A name in `flips` is a table without the entry. */
export function runLookup(input: string, flips: ReadonlySet<string>): Run {
  const name = input.trim().toLowerCase();
  const called: string[] = [];
  const people = new OptionalMap<string, Person>();
  people.set("ada", some({ team: "core" }));
  people.set("grace", some({ team: "ops" }));
  const teams = new OptionalMap<string, Team>();
  teams.set("core", some({ lead: "katherine" }));
  teams.set("ops", some({ lead: "margaret" }));
  const leads = new OptionalMap<string, string>();
  leads.set("katherine", some("Katherine Johnson"));
  leads.set("margaret", some("Margaret Hamilton"));

  if (flips.has("person")) people.delete(name);
  if (flips.has("team")) teams.clear();
  if (flips.has("lead")) leads.clear();

  const o0 = some(name);
  const o1 = chain(o0, (key) => {
    called.push("person");
    return people.get(key);
  });
  const o2 = chain(o1, (person) => {
    called.push("team");
    return teams.get(person.team);
  });
  const o3 = chain(o2, (team) => {
    called.push("lead");
    return leads.get(team.lead);
  });
  const o4 = mapRight(o3, (lead) => {
    called.push("shout");
    return lead.toUpperCase();
  });
  const final = orElse(o4, () => "No lead found");
  called.push("end");

  const stops: Stop[] = [
    stopOf(called, { id: "person", call: "chain(o, people.get)", kind: "chain", canFail: true }, o0, o1),
    stopOf(called, { id: "team", call: "chain(o, teams.get)", kind: "chain", canFail: true }, o1, o2),
    stopOf(called, { id: "lead", call: "chain(o, leads.get)", kind: "chain", canFail: true }, o2, o3),
    stopOf(called, { id: "shout", call: "mapRight(o, upper)", kind: "mapRight", canFail: false }, o3, o4),
    { id: "end", call: 'orElse(o, () => "No lead found")', kind: "end", canFail: false, state: "ran", after: text(final), same: false, track: isRight(o4) ? "right" : "left" },
  ];
  return { mode: "lookup", stops, final, track: isRight(o4) ? "right" : "left", called };
}

/** This function runs the pipeline of a mode. */
export function run(mode: Mode, input: string, flips: ReadonlySet<string>): Run {
  return mode === "order" ? runOrder(input, flips) : runLookup(input, flips);
}
