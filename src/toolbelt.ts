/**
  Tools for working easily with `Maybe` and `Result` *together*... but which do
  not *require* you to use both. If they were in the `true-myth/maybe` or
  `true-myth/result` modules, then importing either would always include the
  other. While that is not usually a concern with bundlers, it *is* an issue
  when using dynamic imports or otherwise doing runtime resolution in a browser
  or similar environment.

  The flip side of that is: importing from *this* module *does* require access
  to both `Maybe` and `Result` modules.

  @module
 */

import Result from './result.js';
import Maybe, { type AnyMaybe, type ValueFor } from './maybe.js';
import { curry1 } from './-private/utils.js';

/**
  Transposes a {@linkcode Result} of a {@linkcode Maybe} into a `Maybe` of a
  `Result`.

  | Input         | Output         |
  | ------------- | -------------- |
  | `Ok(Just(T))` | `Just(Ok(T))`  |
  | `Err(E)`      | `Just(Err(E))` |
  | `Ok(Nothing)` | `Nothing`      |

  @param result a `Result<Maybe<T>, E>` to transform to a `Maybe<Result<T, E>>`.
 */
export function transposeResult<T extends {}, E>(result: Result<Maybe<T>, E>): Maybe<Result<T, E>> {
  return result.match({
    Ok: (maybe) =>
      maybe.match({
        Just: (v) => Maybe.just(Result.ok<T, E>(v)),
        Nothing: () => Maybe.nothing(),
      }),
    Err: (e) => Maybe.just(Result.err<T, E>(e)),
  });
}

/**
  Convert a {@linkcode Result} to a {@linkcode Maybe}.

  The converted type will be {@linkcode "maybe".Just Just} if the `Result` is
  {@linkcode "result".Ok Ok} or {@linkcode "maybe".Nothing Nothing} if the
  `Result` is {@linkcode "result".Err Err}; the wrapped error value will be
  discarded.

  @param result The `Result` to convert to a `Maybe`
  @returns      `Just` the value in `result` if it is `Ok`; otherwise `Nothing`
 */
export function toMaybe<T extends {}>(result: Result<T, unknown>): Maybe<T> {
  return result.isOk ? Maybe.just(result.value) : Maybe.nothing();
}

/**
  Transform a {@linkcode Maybe} into a {@linkcode Result}.

  If the `Maybe` is a {@linkcode "maybe".Just Just}, its value will be wrapped
  in the {@linkcode "result".Ok Ok} variant; if it is a {@linkcode
  "maybe".Nothing Nothing}, the `errValue` will be wrapped in the {@linkcode
  "result".Err Err} variant.

  @param errValue A value to wrap in an `Err` if `maybe` is a `Nothing`.
  @param maybe    The `Maybe` to convert to a `Result`.
 */
export function fromMaybe<T extends {}, E>(errValue: E, maybe: Maybe<T>): Result<T, E>;
export function fromMaybe<T extends {}, E>(errValue: E): (maybe: Maybe<T>) => Result<T, E>;
export function fromMaybe<T extends {}, E>(
  errValue: E,
  maybe?: Maybe<T>
): Result<T, E> | ((maybe: Maybe<T>) => Result<T, E>) {
  const op = (m: Maybe<T>) => (m.isJust ? Result.ok<T, E>(m.value) : Result.err<T, E>(errValue));
  return curry1(op, maybe);
}

/**
  Transposes a {@linkcode Maybe} of a {@linkcode Result} into a `Result` of a
  `Maybe`.

  | Input          | Output        |
  | -------------- | ------------- |
  | `Just(Ok(T))`  | `Ok(Just(T))` |
  | `Just(Err(E))` | `Err(E)`      |
  | `Nothing`      | `Ok(Nothing)` |

  @param maybe a `Maybe<Result<T, E>>` to transform to a `Result<Maybe<T>, E>>`.
 */
export function transposeMaybe<T extends {}, E>(maybe: Maybe<Result<T, E>>): Result<Maybe<T>, E> {
  return maybe.match({
    Just: (result) =>
      result.match({
        Ok: (v) => Result.ok(Maybe.just(v)),
        Err: (e) => Result.err(e),
      }),
    Nothing: () => Result.ok(Maybe.nothing()),
  });
}

/**
  Transform the {@linkcode Maybe} into a {@linkcode Result}, using the wrapped
  value as the {@linkcode "result".Ok Ok} value if the `Maybe` is {@linkcode
  "maybe".Just Just}; otherwise using the supplied `error` value for {@linkcode
  "result".Err Err}.

  @template T  The wrapped value.
  @template E  The error type to in the `Result`.
  @param error The error value to use if the `Maybe` is `Nothing`.
  @param maybe The `Maybe` instance to convert.
  @returns     A `Result` containing the value wrapped in `maybe` in an `Ok`, or
               `error` in an `Err`.
 */
export function toOkOrErr<T extends {}, E>(error: E, maybe: Maybe<T>): Result<T, E>;
export function toOkOrErr<T extends {}, E>(error: E): (maybe: Maybe<T>) => Result<T, E>;
export function toOkOrErr<T extends {}, E>(
  error: E,
  maybe?: Maybe<T>
): Result<T, E> | ((maybe: Maybe<T>) => Result<T, E>) {
  const op = (m: Maybe<T>) => (m.isJust ? Result.ok<T, E>(m.value) : Result.err<T, E>(error));
  return maybe !== undefined ? op(maybe) : op;
}

/**
  Transform the {@linkcode Maybe} into a {@linkcode Result}, using the wrapped
  value as the {@linkcode "result".Ok Ok} value if the `Maybe` is {@linkcode
  "maybe".Just Just}; otherwise using `elseFn` to generate the {@linkcode
  "result".Err Err}.

  @template T  The wrapped value.
  @template E  The error type to in the `Result`.
  @param elseFn The function which generates an error of type `E`.
  @param maybe  The `Maybe` instance to convert.
  @returns     A `Result` containing the value wrapped in `maybe` in an `Ok`, or
               the value generated by `elseFn` in an `Err`.
 */
export function toOkOrElseErr<T extends {}, E>(elseFn: () => E, maybe: Maybe<T>): Result<T, E>;
export function toOkOrElseErr<T extends {}, E>(elseFn: () => E): (maybe: Maybe<T>) => Result<T, E>;
export function toOkOrElseErr<T extends {}, E>(
  elseFn: () => E,
  maybe?: Maybe<T>
): Result<T, E> | ((maybe: Maybe<T>) => Result<T, E>) {
  const op = (m: Maybe<T>) => (m.isJust ? Result.ok<T, E>(m.value) : Result.err<T, E>(elseFn()));
  return curry1(op, maybe);
}

/**
  Construct a {@linkcode "maybe".Maybe Maybe<T>} from a
  {@linkcode "result".Result Result<T, E>}.

  If the `Result` is a {@linkcode "result".Ok Ok}, wrap its value in {@linkcode
  "maybe".Just Just}. If the `Result` is an {@linkcode "result".Err Err}, throw
  away the wrapped `E` and transform to a {@linkcode "maybe".Nothing Nothing}.

  @template T  The type of the value wrapped in a {@linkcode "result".Ok Ok} and
    therefore in the {@linkcode "maybe".Just Just} of the resulting `Maybe`.
  @param result The `Result` to construct a `Maybe` from.
  @returns      `Just` if `result` was `Ok` or `Nothing` if it was `Err`.
 */
export function fromResult<T extends {}>(result: Result<T, unknown>): Maybe<T> {
  return result.isOk ? Maybe.just(result.value) : Maybe.nothing<T>();
}

/**
  Evaluate an iterable of {@linkcode Maybe} instances from left to right and
  collect their values into a {@linkcode Result} of an array, converting the
  first {@linkcode "maybe".Nothing Nothing} encountered into an
  {@linkcode "result".Err Err} with `errValue`. Stops advancing the iterator
  immediately upon encountering the first `Nothing`.

  @template T The type of the wrapped `Just` values.
  @template E The type of the error value if any item is `Nothing`.
  @param errValue The error value to wrap in `Err` if any item is `Nothing`.
  @param maybes Any iterable of `Maybe` instances.
  @returns `Ok` an array of unwrapped values if all items are `Just`, or
           `Err(errValue)` upon the first `Nothing`.
 */
export function sequenceMaybeAsResult<T extends {} = never, E = never>(
  errValue: E,
  maybes: Iterable<Maybe<T>>
): Result<T[], E>;
export function sequenceMaybeAsResult<R extends AnyMaybe, E>(
  errValue: E,
  maybes: Iterable<R>
): Result<Array<ValueFor<R>>, E>;
export function sequenceMaybeAsResult<E>(errValue: E): {
  <T extends {} = never>(maybes: Iterable<Maybe<T>>): Result<T[], E>;
  <R extends AnyMaybe>(maybes: Iterable<R>): Result<Array<ValueFor<R>>, E>;
};
export function sequenceMaybeAsResult<T extends {}, E>(
  errValue: E,
  maybes?: Iterable<Maybe<T>>
): Result<T[], E> | ((maybes: Iterable<Maybe<T>>) => Result<T[], E>) {
  return curry1((items: Iterable<Maybe<T>>) => fromMaybe(errValue, Maybe.sequence(items)), maybes);
}

/**
  Map each element of an iterable to a {@linkcode Maybe} and collect the
  unwrapped values into a {@linkcode Result} of an array, converting the first
  {@linkcode "maybe".Nothing Nothing} encountered into an
  {@linkcode "result".Err Err} with `errValue`. Stops advancing the iterator
  immediately upon encountering the first `Nothing`.

  @template T The type of items in the input iterable.
  @template U The type of values inside the resulting `Ok` array.
  @template E The type of the error value if any mapped item is `Nothing`.
  @param errValue The error value to wrap in `Err` if any mapped item is `Nothing`.
  @param items Any iterable of items to traverse.
  @param fn A function mapping each item to a `Maybe`.
  @returns `Ok` an array of unwrapped values if all mapped items are `Just`,
           or `Err(errValue)` upon the first `Nothing`.
 */
export function traverseMaybeAsResult<T, U extends {}, E>(
  errValue: E,
  items: Iterable<T>,
  fn: (item: T) => Maybe<U>
): Result<U[], E>;
export function traverseMaybeAsResult<T, R extends AnyMaybe, E>(
  errValue: E,
  items: Iterable<T>,
  fn: (item: T) => R
): Result<Array<ValueFor<R>>, E>;
export function traverseMaybeAsResult<T, E>(
  errValue: E,
  items: Iterable<T>
): {
  <U extends {}>(fn: (item: T) => Maybe<U>): Result<U[], E>;
  <R extends AnyMaybe>(fn: (item: T) => R): Result<Array<ValueFor<R>>, E>;
};
export function traverseMaybeAsResult<E>(errValue: E): {
  <T, U extends {}>(items: Iterable<T>, fn: (item: T) => Maybe<U>): Result<U[], E>;
  <T, R extends AnyMaybe>(items: Iterable<T>, fn: (item: T) => R): Result<Array<ValueFor<R>>, E>;
  <T>(items: Iterable<T>): {
    <U extends {}>(fn: (item: T) => Maybe<U>): Result<U[], E>;
    <R extends AnyMaybe>(fn: (item: T) => R): Result<Array<ValueFor<R>>, E>;
  };
};
export function traverseMaybeAsResult<T, U extends {}, E>(
  errValue: E,
  items?: Iterable<T>,
  fn?: (item: T) => Maybe<U>
):
  | Result<U[], E>
  | ((fn: (item: T) => Maybe<U>) => Result<U[], E>)
  | ((
      items: Iterable<T>,
      fn?: (item: T) => Maybe<U>
    ) => Result<U[], E> | ((fn: (item: T) => Maybe<U>) => Result<U[], E>)) {
  const withItems = (
    curriedItems: Iterable<T>,
    curriedFn?: (item: T) => Maybe<U>
  ): Result<U[], E> | ((fn: (item: T) => Maybe<U>) => Result<U[], E>) =>
    curry1(
      (mapper: (item: T) => Maybe<U>) => fromMaybe(errValue, Maybe.traverse(curriedItems, mapper)),
      curriedFn
    );

  return items === undefined ? withItems : withItems(items, fn);
}

/**
  Combine two {@linkcode Maybe} instances into a {@linkcode Result} containing
  a tuple of both values if both are {@linkcode "maybe".Just Just}, or
  `Err(errValue)` if either is {@linkcode "maybe".Nothing Nothing}.

  @template T The type of the value in the first `Maybe`.
  @template U The type of the value in the second `Maybe`.
  @template E The type of the error value if either `Maybe` is `Nothing`.
  @param errValue The error value to wrap in `Err` if either `Maybe` is `Nothing`.
  @param a The first `Maybe`.
  @param b The second `Maybe`.
  @returns `Ok([a, b])` if both are `Just`, otherwise `Err(errValue)`.
 */
export function zipMaybeAsResult<T extends {}, U extends {}, E>(
  errValue: E,
  a: Maybe<T>,
  b: Maybe<U>
): Result<[T, U], E>;
export function zipMaybeAsResult<T extends {}, E>(
  errValue: E,
  a: Maybe<T>
): <U extends {}>(b: Maybe<U>) => Result<[T, U], E>;
export function zipMaybeAsResult<E>(errValue: E): {
  <T extends {}, U extends {}>(a: Maybe<T>, b: Maybe<U>): Result<[T, U], E>;
  <T extends {}>(a: Maybe<T>): <U extends {}>(b: Maybe<U>) => Result<[T, U], E>;
};
export function zipMaybeAsResult<T extends {}, U extends {}, E>(
  errValue: E,
  a?: Maybe<T>,
  b?: Maybe<U>
):
  | Result<[T, U], E>
  | ((b: Maybe<U>) => Result<[T, U], E>)
  | ((a: Maybe<T>, b?: Maybe<U>) => Result<[T, U], E> | ((b: Maybe<U>) => Result<[T, U], E>)) {
  const withA = (
    curriedA: Maybe<T>,
    curriedB?: Maybe<U>
  ): Result<[T, U], E> | ((b: Maybe<U>) => Result<[T, U], E>) =>
    curry1((other: Maybe<U>) => fromMaybe(errValue, Maybe.zip(curriedA, other)), curriedB);

  return a === undefined ? withA : withA(a, b);
}
