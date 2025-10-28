const PATCH_SYMBOL = Symbol.for("leora.roundedLocaleStringPatch");

if (!(globalThis as Record<string | symbol, unknown>)[PATCH_SYMBOL]) {
  const originalToLocaleString = Number.prototype.toLocaleString;

  Number.prototype.toLocaleString = function (
    locales?: string | string[],
    options?: Intl.NumberFormatOptions
  ): string {
    const roundedValue = Math.round(Number(this));
    const resolvedLocales = locales ?? "en-US";
    const mergedOptions: Intl.NumberFormatOptions = {
      ...(options ?? {}),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    };

    return originalToLocaleString.call(roundedValue, resolvedLocales, mergedOptions);
  };

  (globalThis as Record<string | symbol, unknown>)[PATCH_SYMBOL] = true;
}

