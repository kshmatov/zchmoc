import { describe, expect, it } from "vitest";
import { isBalancedScheme } from "./scheme-runner";

describe("isBalancedScheme", () => {
  it("принимает сбалансированный код", () => {
    expect(isBalancedScheme("(define x (+ 1 2))")).toBe(true);
    expect(isBalancedScheme("(let ([x 5]) (display x))")).toBe(true);
  });

  it("отклоняет несбалансированный код", () => {
    expect(isBalancedScheme("(define x (+ 1 2)")).toBe(false);
    expect(isBalancedScheme("(define x 5))")).toBe(false);
    expect(isBalancedScheme("(car (list 1 2)")).toBe(false);
  });

  it("не считает скобки внутри строк", () => {
    expect(isBalancedScheme('(display "(((")')).toBe(true);
    expect(isBalancedScheme('(define s ")")')).toBe(true);
  });

  it("не считает скобки в строковых комментариях", () => {
    expect(isBalancedScheme("(display 1) ; ((( )")).toBe(true);
  });

  it("не считает скобки в блочных комментариях", () => {
    expect(isBalancedScheme("(display 1) #| ((( ) |#")).toBe(true);
  });

  it("не считает символ-литерал #\\( как скобку", () => {
    expect(isBalancedScheme("(string-ref \"()\" 0) ; #\\( скобка в символе")).toBe(
      true
    );
  });

  it("молчаливый define сбалансирован", () => {
    expect(isBalancedScheme('(define x (string->number "vf"))')).toBe(true);
  });
});