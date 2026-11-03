/**
 * The sponge of the page. A real `sponge` gets each feed. The state of a `sponge` is private. So each pore on the page
 * is a real `sponge` with one key, and it gets the same water. Thus the picture also comes from Funk.
 */
import { sponge } from "funk/functional/sponge";

export const PORES = ["host", "port", "db"] as const;
export type Pore = (typeof PORES)[number];
export type Water = Readonly<Record<string, unknown>>;

/** The state of one pore on the page. */
export interface PoreState {
  readonly filled: boolean;
  readonly value: unknown;
}

/** One line of the feed log. */
export interface Feeding {
  readonly water: Water;
  /** "absorb" when the sponge wants more, "result" when it squeezed. */
  readonly gave: "absorb" | "result";
  readonly result: string | undefined;
  /** True when the sponge gave back the same function. */
  readonly sameFunction: boolean;
}

/** A piece of water that the visitor can feed with one click. */
export const DROPS: readonly { readonly id: string; readonly water: Water }[] = [
  { id: "host", water: { host: "localhost" } },
  { id: "port", water: { port: 5432 } },
  { id: "db", water: { db: "shop" } },
  { id: "port2", water: { port: 6543 } },
  { id: "undef", water: { db: undefined } },
  { id: "extra", water: { color: "red" } },
];

interface Filled {
  readonly host: string;
  readonly port: number;
  readonly db: string;
}

type Absorb = (water: Partial<Filled>) => unknown;
const SHAPE: Filled = { host: "", port: 0, db: "" };

export class Feed {
  /** The number of calls of the squeeze function. */
  squeezes = 0;
  /** The last result of the sponge. */
  result: string | undefined;

  private readonly absorb: Absorb = sponge(SHAPE, ({ host, port, db }) => {
    this.squeezes += 1;
    return `postgres://${host}:${port}/${db}`;
  });

  private readonly single = PORES.map((pore) => ({
    pore,
    absorb: sponge({ [pore]: 0 }, (filled) => ({ value: filled[pore] })) as (water: Water) => unknown,
    state: { filled: false, value: undefined } as PoreState,
  }));

  /** This function gives the state of each pore. */
  pores(): Readonly<Record<Pore, PoreState>> {
    return Object.fromEntries(this.single.map((entry) => [entry.pore, entry.state])) as Record<Pore, PoreState>;
  }

  /** This function feeds water to the sponge and to each pore. */
  feed(water: Water): Feeding {
    for (const entry of this.single) {
      const out = entry.absorb(water);
      if (typeof out !== "function") entry.state = { filled: true, value: (out as { value: unknown }).value };
    }
    const out = this.absorb(water as Partial<Filled>);
    if (typeof out === "function") return { water, gave: "absorb", result: undefined, sameFunction: out === this.absorb };
    this.result = String(out);
    return { water, gave: "result", result: this.result, sameFunction: false };
  }
}
