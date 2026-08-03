// used by units.ts and IdCounter.ts to create nominal types

declare const brandSymbol: unique symbol;

/** creates a nominal type from T tagged with TBrand to prevent mixing incompatible values */
export type Brand<T, TBrand extends string> = T & { readonly [brandSymbol]: TBrand };

