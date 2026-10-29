import { describe, expect, it } from 'bun:test';
import { RecurrenceService } from '../domain/recurrence.service.js';
import { createTestEvent } from '../testing/factories.js';
const service = new RecurrenceService();
const start = new Date('2026-01-01T09:00:00Z');
describe('recurrence work budgets', () => {
 it('rejects second-frequency work before materializing a year', () => {
  expect(() => service.materialize(createTestEvent({startTime:start,recurrenceRule:'FREQ=SECONDLY'}), [], {start,end:new Date('2027-01-01')})).toThrow('work budget');
 });
 it('rejects reversed, invalid, and excessive ranges', () => {
  for(const end of [new Date('2025-01-01'),new Date('invalid'),new Date('2099-01-01')]) {
   expect(() => service.materialize(createTestEvent({startTime:start}), [], {start,end})).toThrow();
  }
 });
 it('rejects a narrow query with excessive recurrence lookback', () => {
  expect(() => service.materialize(createTestEvent({startTime:new Date('1900-01-01'),recurrenceRule:'FREQ=DAILY'}), [], {start,end:new Date('2026-02-01')})).toThrow('work budget');
 });
 it('retains bounded high frequency and weekly recurrences', () => {
  expect(service.materialize(createTestEvent({startTime:start,recurrenceRule:'FREQ=SECONDLY;COUNT=3'}), [], {start,end:new Date(start.getTime()+3000)})).toHaveLength(3);
  expect(service.materialize(createTestEvent({startTime:start,recurrenceRule:'FREQ=WEEKLY;COUNT=4'}), [], {start,end:new Date('2026-02-01')})).toHaveLength(4);
 });
 it('rejects output overflow rather than returning partial data', () => {
  expect(() => service.materialize(createTestEvent({startTime:start,recurrenceRule:'FREQ=SECONDLY'}), [], {start,end:new Date(start.getTime()+11000*1000)})).toThrow('Too many');
 });
 it('rejects oversized rules and nonpositive intervals', () => {
  expect(service.validateRule('FREQ=DAILY;INTERVAL=0')).not.toBeNull();
  expect(service.validateRule('FREQ=DAILY;'+' '.repeat(4096))).not.toBeNull();
 });
});
