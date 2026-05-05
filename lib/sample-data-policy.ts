export function shouldUseSampleFinancialData() {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return process.env.DENIAROS_ALLOW_SAMPLE_DATA === "1";
}
