import { ChangeEvent, Dispatch, FC, SetStateAction, useState } from 'react';
import { Group, Segment } from 'timelines-chart';

function convertExcelDateAndFracHourToDate (excelDay: string, excelHour: string): Date { // Thanks chatgpt
  const excelEpochStart = new Date(Date.UTC(1899, 11, 30)); // Excel's epoch starts at 1899-12-30
  const date = new Date(excelEpochStart.getTime() + parseInt(excelDay) * 24 * 60 * 60 * 1000 - 60 * 60 * 1000); // Remove 1h time zone offset

  const timeInMs = parseFloat(excelHour) * 24 * 60 * 60 * 1000;
  date.setTime(date.getTime() + timeInMs);

  return date;
}

const SignalDataImportComponent: FC<{data: Group[]; setData: Dispatch<SetStateAction<Group[]>>}> = ({ data, setData }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dayColumnName = 'Datum';
  const timeColumnName = 'Uhrzeit';

  const detectorData: Group = { group: 'det', data: [] };
  const signalData: Group = { group: 'sig', data: [] };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Parse file
      const parsedData = e.target.files[0].text().then(csvString => {
        const csvData = csvString.split('\n').map(row => row.split(','));
        const header = csvData[0];

        const daycol = header.findIndex(colName => colName === dayColumnName);
        if (daycol === -1) throw new Error('Could not find day index');
        const timecol = header.findIndex(colName => colName === timeColumnName);
        if (timecol === -1) throw new Error('Could not find time index');

        header.forEach((colName, colIndex) => {
          if (colName.includes('DR') || colName.includes('US')) {
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
            detectorData.data.push({ label: colName, data: segments });
          } else if (colName.includes('SG')) {
            let signalStateBegin: Date = convertExcelDateAndFracHourToDate(csvData[1][daycol], csvData[1][timecol]);
            let previousSignalState: string = '3';
            const segments: Segment[] = [];
            csvData.slice(1).forEach((row, _) => {
              if (row[colIndex] !== '') {
                const eventDate = convertExcelDateAndFracHourToDate(row[daycol], row[timecol]);
                segments.push({ timeRange: [signalStateBegin, eventDate], val: previousSignalState }); // if there is no data, assume red (used for initialisation)
                signalStateBegin = eventDate;
                previousSignalState = row[colIndex];
              }
            });
            signalData.data.push({ label: colName, data: segments });
          }
        });

        return [detectorData, signalData] as Group[];
      });

      parsedData.then(groups => setData(groups), (err: Error) => {
        setData([]);
        setErrorMessage(err.message);
      });
    }
  };

  return (
    <div id="fileUpload">
      <input type="file" accept=".csv" onChange={handleFileChange}/>
      <span>{data.length > 0 ? 'Valid Data File' : `Invalid Data File: ${errorMessage}`}</span>
    </div>
  );
};

export default SignalDataImportComponent;
