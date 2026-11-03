/** The words of the page for the values of Funk. */
import { fold, type Either } from "funk/optional/either";

/** This function gives the text of a value, as a reader of TypeScript writes it. */
export function text(value: unknown): string {
  if (typeof value === "symbol") return value.description ?? String(value);
  if (typeof value === "string" || (typeof value === "object" && value !== null)) return JSON.stringify(value);
  return String(value);
}

/** This function gives the text of an Either. The real function `fold` reads the Either. */
export function showEither<L, R>(e: Either<L, R>): string {
  return fold(
    e,
    (l) => `Left(${text(l)})`,
    (r) => `Right(${text(r)})`,
  );
}
