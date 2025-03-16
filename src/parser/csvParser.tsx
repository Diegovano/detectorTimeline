import Parser, { convertExcelDateAndFracHourToDate } from './parser.tsx';
import { Segment, Group } from 'timelines-chart';

class CSVParser extends Parser {
  readonly dayColumnName = 'Datum';
  readonly timeColumnName = 'Uhrzeit';

  extractLabels () {
    const colNames = this.input.split('\n')[0].split(',');
    const nonDataLabels = ['Datum', 'Uhrzeit', 'Time', 'ms'];

    return colNames.filter(colName => !nonDataLabels.includes(colName));
  }

  parse (requestedLabels: string[] = this.allLabels) {
    this.detectorData.data = [];
    this.signalData.data = [];
    this.otherData.data = [];

    const csvData = this.input.split('\n').map(row => row.split(','));
    const header = csvData[0];

    const daycol = header.findIndex(colName => colName === this.dayColumnName);
    if (daycol === -1) throw new Error('Could not find day index');
    const timecol = header.findIndex(colName => colName === this.timeColumnName);
    if (timecol === -1) throw new Error('Could not find time index');

    header.forEach((colName, colIndex) => {
      if (!requestedLabels.includes(colName)) return;
      if (colName.includes('DR')) {
        let detectionBegin: Date | null = null;
        const segments: Segment[] = [];
        csvData.slice(1).forEach((row, rowIndex) => {
          if (row[colIndex] === '1') {
            if (detectionBegin) throw new Error(`new detection from ${colName} started without previous one ending on row ${rowIndex}`);
            detectionBegin = convertExcelDateAndFracHourToDate(row[daycol], row[timecol]);
          } else if (row[colIndex] === '0') {
            if (detectionBegin === null) console.log(`INFO: Ending detection from ${colName} never started on row ${rowIndex}`);
            else {
              segments.push({ timeRange: [detectionBegin, convertExcelDateAndFracHourToDate(row[daycol], row[timecol])], val: '1' });
              detectionBegin = null;
            }
          }
        });
        this.detectorData.data.push({ label: colName, data: segments });
      } else if (colName.includes('SG')) {
        let signalStateBegin: Date = convertExcelDateAndFracHourToDate(csvData[1][daycol], csvData[1][timecol]);
        let previousSignalState: string = '3';
        const segments: Segment[] = [];
        csvData.slice(1).forEach(row => {
          if (row[colIndex] !== '') {
            const eventDate = convertExcelDateAndFracHourToDate(row[daycol], row[timecol]);
            segments.push({ timeRange: [signalStateBegin, eventDate], val: previousSignalState }); // if there is no data, assume red (used for initialisation)
            signalStateBegin = eventDate;
            previousSignalState = row[colIndex];
          }
        });
        this.signalData.data.push({ label: colName, data: segments });
      } else if (colName.includes('US')) {
        const segments: Segment[] = [];
        csvData.slice(1).forEach(row => {
          if (row[colIndex] === '1') {
            const eventDate = convertExcelDateAndFracHourToDate(row[daycol], row[timecol]);
            const nextSecond = new Date(eventDate);
            nextSecond.setSeconds(eventDate.getSeconds() + 1);
            segments.push({ timeRange: [eventDate, nextSecond], val: '2' });
          }
        });
        this.otherData.data.push({ label: colName, data: segments });
      }
    });

    return [this.detectorData, this.signalData, this.otherData] as Group[];
  }
}

export default CSVParser;
