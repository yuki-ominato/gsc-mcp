import { appConfig } from './config.js';

export const resolveDateRange = (start?: string, end?: string) => {
  const endDate = end ? new Date(end) : new Date();
  const startDate = start
    ? new Date(start)
    : new Date(endDate.getTime() - appConfig.defaultRangeDays * 24 * 60 * 60 * 1000);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error('startDate と endDate には YYYY-MM-DD 形式の日付を指定してください。');
  }

  if (startDate > endDate) {
    throw new Error('startDate は endDate より前の日付である必要があります。');
  }

  const format = (value: Date) => value.toISOString().split('T')[0]!;

  return {
    startDate: format(startDate),
    endDate: format(endDate),
  };
};
