import { Group } from 'timelines-chart';

abstract class Parser {
  requestedLabels: string[] = [];
  input: string;
  private _allLabels?: string[];
  private _earliestMeasurement?: Date | number;
  private _latestMeasurement?: Date | number;

  supportsDateFiltering: boolean;

  detectorData: Group = { group: 'det', data: [] };
  signalData: Group = { group: 'sig', data: [] };
  otherData: Group = { group: 'misc', data: [] };

  detectorLabelSubstrings = ['DR'];
  signalLabelSubstrings = ['SG'];

  constructor (input: string, supportsDateFiltering: boolean) {
    this.input = input;
    this.supportsDateFiltering = supportsDateFiltering;
  }

  protected abstract _extractLabelsAndDateBounds(): { labels: string[], earliestMeasurement?: Date | number, latestMeasurement?: Date | number };

  get allLabelsAndBounds (): { labels: string[], earliestMeasurement?: Date | number, latestMeasurement?: Date | number } {
    if (!this._allLabels) ({ labels: this._allLabels, earliestMeasurement: this._earliestMeasurement, latestMeasurement: this._latestMeasurement } = this._extractLabelsAndDateBounds());
    return { labels: this._allLabels, earliestMeasurement: this._earliestMeasurement, latestMeasurement: this._latestMeasurement };
  }

  abstract parse(requestedLabels: string[], startMeasurement?: Date | number, endMeasurement?: Date | number): Group[];
}

export function convertExcelDateAndFracHourToDate (excelDay: string, excelHour: string): Date { // Thanks chatgpt
  const excelEpochStart = new Date(Date.UTC(1899, 11, 30)); // Excel's epoch starts at 1899-12-30
  const date = new Date(excelEpochStart.getTime() + parseInt(excelDay) * 24 * 60 * 60 * 1000 - 60 * 60 * 1000); // Remove 1h time zone offset

  const timeInMs = parseFloat(excelHour) * 24 * 60 * 60 * 1000;
  date.setTime(date.getTime() + timeInMs);

  return date;
}

export default Parser;
