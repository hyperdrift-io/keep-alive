declare module 'bun:test' {
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export function expect<T>(value: T): {
    toBe(expected: any): void;
    toEqual(expected: any): void;
    toBeDefined(): void;
    toBeNull(): void;
    toBeGreaterThan(expected: number): void;
    toContain(expected: string): void;
    not: {
      toBe(expected: any): void;
      toEqual(expected: any): void;
      toBeDefined(): void;
      toBeNull(): void;
    };
  };
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
  export function mock<T extends (...args: any[]) => any>(fn: T): T;
}

// Fix for testModulePath error
declare const testModulePath: string;
