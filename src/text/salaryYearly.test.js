import { test } from 'node:test';
import assert from 'node:assert/strict';
import { salaryYearUsd } from './salaryYearly.js';

test('salaryYearUsd takes the top of the range, as a year, in dollars', () => {
  assert.equal(salaryYearUsd({ salaryMin: 130000, salaryMax: 160000, salaryCurrency: 'USD', salaryPeriod: 'year' }), 160000);
  // Only a floor stated: the floor is all there is.
  assert.equal(salaryYearUsd({ salaryMin: 150000, salaryMax: null, salaryCurrency: 'USD', salaryPeriod: 'year' }), 150000);
  assert.equal(salaryYearUsd({ salaryMin: null, salaryMax: 90000, salaryCurrency: 'USD', salaryPeriod: 'year' }), 90000);
});

test('salaryYearUsd puts hourly, monthly and weekly pay on a year', () => {
  assert.equal(salaryYearUsd({ salaryMin: 60, salaryMax: 80, salaryCurrency: 'USD', salaryPeriod: 'hour' }), 166400);
  assert.equal(salaryYearUsd({ salaryMin: 8000, salaryMax: 10000, salaryCurrency: 'USD', salaryPeriod: 'month' }), 120000);
  assert.equal(salaryYearUsd({ salaryMax: 3000, salaryCurrency: 'USD', salaryPeriod: 'week' }), 156000);
});

test('salaryYearUsd reads a period the posting leaves out from the size of the figure', () => {
  assert.equal(salaryYearUsd({ salaryMin: 45, salaryMax: 60, salaryCurrency: 'USD', salaryPeriod: '' }), 124800); // hourly
  assert.equal(salaryYearUsd({ salaryMax: 9000, salaryCurrency: 'USD', salaryPeriod: '' }), 108000); // monthly
  assert.equal(salaryYearUsd({ salaryMax: 175000, salaryCurrency: 'USD', salaryPeriod: '' }), 175000); // yearly
});

test('salaryYearUsd converts other currencies, and leaves out one it cannot', () => {
  assert.equal(salaryYearUsd({ salaryMax: 100000, salaryCurrency: 'EUR', salaryPeriod: 'year' }), 108000);
  assert.equal(salaryYearUsd({ salaryMax: 100000, salaryCurrency: 'gbp', salaryPeriod: 'year' }), 127000);
  assert.equal(salaryYearUsd({ salaryMax: 100000, salaryCurrency: 'XYZ', salaryPeriod: 'year' }), null);
  // No currency: the US boards that omit it.
  assert.equal(salaryYearUsd({ salaryMax: 140000, salaryCurrency: '', salaryPeriod: 'year' }), 140000);
});

test('salaryYearUsd is null without pay, and for a figure no salary reaches', () => {
  assert.equal(salaryYearUsd({ salaryMin: null, salaryMax: null, salaryCurrency: 'USD' }), null);
  assert.equal(salaryYearUsd({ salaryMin: 0, salaryMax: 0, salaryCurrency: 'USD' }), null);
  assert.equal(salaryYearUsd({ salaryMax: 5_000_000, salaryCurrency: 'USD', salaryPeriod: 'year' }), null);
  assert.equal(salaryYearUsd(), null);
});
