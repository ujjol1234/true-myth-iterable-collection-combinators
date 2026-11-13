import { describe, expect, expectTypeOf, test } from 'vitest';

import Maybe from 'true-myth/maybe';
import Result from 'true-myth/result';
import {
  transposeResult,
  transposeMaybe,
  toOkOrElseErr,
  toOkOrErr,
  fromResult,
  fromMaybe,
  toMaybe,
  sequenceMaybeAsResult,
  traverseMaybeAsResult,
  zipMaybeAsResult,
} from 'true-myth/toolbelt';

describe('transposeResult', () => {
  test('Ok(Just(T))', () => {
    let result = Result.ok<Maybe<number>, string>(Maybe.just(12));
    let transposed = transposeResult(result);
    expect(transposed).toStrictEqual(Maybe.just(Result.ok(12)));
    expectTypeOf(transposed).toEqualTypeOf<Maybe<Result<number, string>>>();
  });

  test('Ok(Nothing)', () => {
    let result = Result.ok<Maybe<number>, string>(Maybe.nothing<number>());
    let transposed = transposeResult(result);
    expect(transposed).toStrictEqual(Maybe.nothing());
    expectTypeOf(transposed).toEqualTypeOf<Maybe<Result<number, string>>>();
  });

  test('Err(E)', () => {
    let result = Result.err<Maybe<number>, string>('hello');
    let transposed = transposeResult(result);
    expect(transposed).toStrictEqual(Maybe.just(Result.err('hello')));
    expectTypeOf(transposed).toEqualTypeOf<Maybe<Result<number, string>>>();
  });
});

test('`toMaybe`', () => {
  const theValue = 'huzzah';
  const anOk = Result.ok(theValue);
  expect(toMaybe(anOk)).toEqual(Maybe.just(theValue));

  const anErr = Result.err<number, string>('uh uh');
  expect(toMaybe(anErr)).toEqual(Maybe.nothing());
});

test('fromMaybe', () => {
  const theValue = 'something';
  const errValue = 'what happened?';

  const aJust = Maybe.just(theValue);
  const anOk = Result.ok(theValue);
  expect(fromMaybe(errValue, aJust)).toEqual(anOk);

  const aNothing = Maybe.nothing();
  const anErr = Result.err(errValue);
  expect(fromMaybe(errValue, aNothing)).toEqual(anErr);
});

describe('transposeMaybe', () => {
  test('Just(Ok(T))', () => {
    let maybe = Maybe.just(Result.ok<number, string>(12));
    let transposed = transposeMaybe(maybe);
    expect(transposed).toStrictEqual(Result.ok(Maybe.just(12)));
    expectTypeOf(transposed).toEqualTypeOf<Result<Maybe<number>, string>>();
  });

  test('Just(Err(E))', () => {
    let maybe = Maybe.just(Result.err<number, string>('whoops'));
    let transposed = transposeMaybe(maybe);
    expect(transposed).toStrictEqual(Result.err('whoops'));
    expectTypeOf(transposed).toEqualTypeOf<Result<Maybe<number>, string>>();
  });

  test('Nothing', () => {
    let maybe = Maybe.nothing<Result<number, string>>();
    let transposed = transposeMaybe(maybe);
    expect(transposed).toStrictEqual(Result.ok(Maybe.nothing()));
    expectTypeOf(transposed).toEqualTypeOf<Result<Maybe<number>, string>>();
  });
});

test('`toOkOrErr`', () => {
  const theValue = 'string';
  const theJust = Maybe.of(theValue);
  const errValue = { reason: 'such badness' };

  expect(toOkOrErr(errValue, theJust)).toEqual(Result.ok(theValue));
  expect(toOkOrErr(errValue, Maybe.nothing())).toEqual(Result.err(errValue));

  expect(toOkOrErr<string, typeof errValue>(errValue)(theJust)).toEqual(
    toOkOrErr(errValue, theJust)
  );
});

test('`toOkOrElseErr`', () => {
  const theJust = Maybe.of(12);
  const errValue = 24;
  const getErrValue = () => errValue;

  expect(toOkOrElseErr(getErrValue, theJust)).toEqual(Result.ok(12));
  expect(toOkOrElseErr(getErrValue, Maybe.nothing())).toEqual(Result.err(errValue));

  expect(toOkOrElseErr<number, number>(getErrValue)(theJust)).toEqual(
    toOkOrElseErr(getErrValue, theJust)
  );
});

test('`fromResult`', () => {
  const value = 1000;
  const anOk = Result.ok(value);
  expect(fromResult(anOk)).toEqual(Maybe.just(value));

  const reason = 'oh teh noes';
  const anErr = Result.err<number, string>(reason);
  expect(fromResult(anErr)).toEqual(Maybe.nothing());
});

describe('`sequenceMaybeAsResult`, `traverseMaybeAsResult`, and `zipMaybeAsResult`', () => {
  test('`sequenceMaybeAsResult` converts iterable of `Maybe`s to `Result` and supports currying', () => {
    const empty = sequenceMaybeAsResult('err', []);
    expectTypeOf(empty).toEqualTypeOf<Result<never[], string>>();
    expect(empty).toEqual(Result.ok([]));

    const allJust = sequenceMaybeAsResult('err', [Maybe.just(1), Maybe.just(2), Maybe.just(3)]);
    expectTypeOf(allJust).toEqualTypeOf<Result<number[], string>>();
    expect(allJust).toEqual(Result.ok([1, 2, 3]));

    const withNothing = sequenceMaybeAsResult('missing', [
      Maybe.just(1),
      Maybe.nothing<number>(),
      Maybe.just(3),
    ]);
    expectTypeOf(withNothing).toEqualTypeOf<Result<number[], string>>();
    expect(withNothing).toEqual(Result.err('missing'));

    const curried = sequenceMaybeAsResult('curried-err');
    expect(curried(new Set([Maybe.just('a'), Maybe.just('b')]))).toEqual(Result.ok(['a', 'b']));
    expect(curried([Maybe.nothing<string>()])).toEqual(Result.err('curried-err'));

    let steps = 0;
    function* gen(): IterableIterator<Maybe<number>> {
      steps += 1;
      yield Maybe.just(10);
      steps += 1;
      yield Maybe.nothing();
      steps += 1;
      yield Maybe.just(30);
    }

    expect(sequenceMaybeAsResult('stopped', gen())).toEqual(Result.err('stopped'));
    expect(steps).toBe(2);
  });

  test('`traverseMaybeAsResult` maps iterable with `(errValue, items, fn)` and curried forms', () => {
    const parsePositive = (n: number): Maybe<number> =>
      n > 0 ? Maybe.just(n * 2) : Maybe.nothing();

    const nonCurried = traverseMaybeAsResult('non-positive', [1, 2, 3], (n) => parsePositive(n));
    expectTypeOf(nonCurried).toEqualTypeOf<Result<number[], string>>();
    expect(nonCurried).toEqual(Result.ok([2, 4, 6]));

    expect(traverseMaybeAsResult('non-positive', [1, -2, 3], parsePositive)).toEqual(
      Result.err('non-positive')
    );

    const withErr = traverseMaybeAsResult('bad-item');
    expect(withErr(new Set([2, 3]), parsePositive)).toEqual(Result.ok([4, 6]));
    expect(withErr([2, 3])(parsePositive)).toEqual(Result.ok([4, 6]));
    expect(traverseMaybeAsResult('bad-item', [2, -1])(parsePositive)).toEqual(
      Result.err('bad-item')
    );

    let visited = 0;
    function* numbers() {
      visited += 1;
      yield 1;
      visited += 1;
      yield -1;
      visited += 1;
      yield 3;
    }

    expect(traverseMaybeAsResult('stopped', numbers(), parsePositive)).toEqual(
      Result.err('stopped')
    );
    expect(visited).toBe(2);
  });

  test('`zipMaybeAsResult` combines two `Maybe`s into a `Result` and supports currying', () => {
    const justNum = Maybe.just(1);
    const justStr = Maybe.just('a');
    const nothingNum = Maybe.nothing<number>();
    const nothingStr = Maybe.nothing<string>();

    const zipped = zipMaybeAsResult('missing', justNum, justStr);
    expectTypeOf(zipped).toEqualTypeOf<Result<[number, string], string>>();
    expect(zipped).toEqual(Result.ok([1, 'a']));

    expect(zipMaybeAsResult('missing', justNum, nothingStr)).toEqual(Result.err('missing'));
    expect(zipMaybeAsResult('missing', nothingNum, justStr)).toEqual(Result.err('missing'));

    const withErr = zipMaybeAsResult('curried-missing');
    expect(withErr(justNum, justStr)).toEqual(Result.ok([1, 'a']));
    expect(withErr(justNum)(justStr)).toEqual(Result.ok([1, 'a']));
    expect(zipMaybeAsResult('curried-missing', justNum)(nothingStr)).toEqual(
      Result.err('curried-missing')
    );
  });
});
