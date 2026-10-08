// A job's stated pay as one comparable number for the salary filter: the top of its range, a year's
// worth, in US dollars. "$80–95 an hour", "€120k" and "£9,000 a month" are each only comparable to
// "$150k+" once they are on one scale. The posting's own figures, currency and period are kept as
// they are for display; this is only what the filter reads.
//
// The top of the range is what the job can pay, so "$130–160k" is found by "$150k+": the filter
// answers "could this job pay me that", which is what a reader choosing a floor asks.

// Approximate US dollars per unit. The filter's steps are $20–50k apart, so rates a few percent off
// move nothing across a step; a currency not listed is left out of the filter rather than guessed.
const USD_PER = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  CHF: 1.13,
  CAD: 0.73,
  AUD: 0.66,
  NZD: 0.6,
  SGD: 0.74,
  HKD: 0.128,
  JPY: 0.0067,
  INR: 0.012,
  ILS: 0.27,
  AED: 0.27,
  SEK: 0.095,
  NOK: 0.093,
  DKK: 0.145,
  PLN: 0.25,
  CZK: 0.043,
  BRL: 0.18,
  MXN: 0.055,
  ZAR: 0.055,
};

const PER_YEAR = { year: 1, month: 12, week: 52, day: 260, hour: 2080 };

// Beyond this a figure is a parsing slip (a posting's total budget, a phone number), not a salary.
const MAX_YEARLY = 2_000_000;

/**
 * The period a posting that names none most likely means, from the size of the figure: under 500 is
 * an hourly rate, under 20,000 a monthly one (in the currencies listed, a year's pay is more).
 */
function impliedPeriod(amount) {
  if (amount < 500) return 'hour';
  if (amount < 20_000) return 'month';
  return 'year';
}

/**
 * Yearly pay in US dollars at the top of a job's stated range, rounded to the dollar; null when it
 * states none, or in a currency the table does not hold. A job with no currency is taken as US
 * dollars, as the sources that leave it out are US boards.
 */
export function salaryYearUsd({ salaryMin, salaryMax, salaryCurrency, salaryPeriod } = {}) {
  const top = [salaryMax, salaryMin].find((v) => Number.isFinite(v) && v > 0);
  if (top == null) return null;
  const rate = USD_PER[String(salaryCurrency || 'USD').trim().toUpperCase()];
  if (!rate) return null;
  const yearly = top * PER_YEAR[PER_YEAR[salaryPeriod] ? salaryPeriod : impliedPeriod(top)] * rate;
  return yearly > 0 && yearly <= MAX_YEARLY ? Math.round(yearly) : null;
}

/** The salary filter's floors, in yearly US dollars (the client offers the same list). */
export const SALARY_FLOORS = [50_000, 75_000, 100_000, 120_000, 150_000, 200_000];
