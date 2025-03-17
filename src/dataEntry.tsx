import { ChangeEvent, Dispatch, FC, SetStateAction, useState, useRef } from 'react';
import { CheckboxList, DateRangeBoxes } from './genericComponents';
import { Group } from 'timelines-chart';
import Parser from './parser/parser';
import CSVParser from './parser/csvParser';
import XMLParser from './parser/xmlParser';

const SignalDataImportComponent: FC<{data: Group[]; setData: Dispatch<SetStateAction<Group[]>>}> = ({ data, setData }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dataLabels, setDataLabels] = useState<string[]>([]);
  const [checkedIndices, setCheckedIndices] = useState<boolean[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const parserRef = useRef<Parser | null>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // inital file parse
      const inputFile = e.target.files[0];
      if (inputFile.name.split('.')[1] === 'csv') {
        const inputText = await inputFile.text();
        parserRef.current = new CSVParser(inputText);
      } else if (inputFile.name.split('.')[1] === 'xml') {
        const inputText = await inputFile.text();
        parserRef.current = new XMLParser(inputText);
      } else {
        setData([]);
        setErrorMessage('Invalid file type uploaded');
        return;
      }

      setDataLabels(parserRef.current.allLabelsAndBounds.labels);
      setStartDate(parserRef.current.allLabelsAndBounds.earliestMeasurement);
      setEndDate(parserRef.current.allLabelsAndBounds.latestMeasurement);
    }
  };

  const visualiseData = () => {
    if (!parserRef.current) return;
    const selectedCategories = dataLabels.filter((_label, index) => checkedIndices[index] === true);
    const newData = parserRef.current.parse(selectedCategories, startDate, endDate);
    setData(newData);
  };

  return (
    <div id="fileUpload">
      <div id="uploadAndConfirm">
        <input type="file" accept=".csv,.xml" onChange={handleFileChange}/>
        <span>{data.length > 0 ? 'Valid Data File' : `Invalid Data File: ${errorMessage}`}</span>
        <DateRangeBoxes startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate}></DateRangeBoxes>
        <input type='button' value='Visualise' onClick={visualiseData}></input>
      </div>
      <CheckboxList labels={dataLabels} checkedIndices={checkedIndices} setCheckedIndices={setCheckedIndices}></CheckboxList>
    </div>
  );
};

export default SignalDataImportComponent;
