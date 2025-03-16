import { Group } from 'timelines-chart';

abstract class Parser {
  requestedLabels: string[] = [];
  input: string;
  private _allLabels?: string[];

  detectorData: Group = { group: 'det', data: [] };
  signalData: Group = { group: 'sig', data: [] };
  otherData: Group = { group: 'other', data: [] };

  detectorLabelSubstrings = ['DR'];
  signalLabelSubstrings = ['SG'];

  constructor (input: string) {
    this.input = input;
  }

  protected abstract extractLabels(): string[];
  get allLabels () {
    if (!this._allLabels) this._allLabels = this.extractLabels();
    return this._allLabels;
  }

  abstract parse(requestedLabels: string[]): Group[];
}

export function convertExcelDateAndFracHourToDate (excelDay: string, excelHour: string): Date { // Thanks chatgpt
  const excelEpochStart = new Date(Date.UTC(1899, 11, 30)); // Excel's epoch starts at 1899-12-30
  const date = new Date(excelEpochStart.getTime() + parseInt(excelDay) * 24 * 60 * 60 * 1000 - 60 * 60 * 1000); // Remove 1h time zone offset

  const timeInMs = parseFloat(excelHour) * 24 * 60 * 60 * 1000;
  date.setTime(date.getTime() + timeInMs);

  return date;
}

export default Parser;
