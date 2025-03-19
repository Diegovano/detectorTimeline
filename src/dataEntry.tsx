import { ChangeEvent, Dispatch, FC, SetStateAction, useState, useRef } from 'react';
import { CheckboxList, CheckboxSelectAllClearAll, DateRangeBoxes } from './genericComponents';
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

  function resetStartAndEndDates () {
    setStartDate(parserRef.current?.allLabelsAndBounds.earliestMeasurement);
    setEndDate(parserRef.current?.allLabelsAndBounds.latestMeasurement);
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setData([]);
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
      resetStartAndEndDates();
    }
  };

  const visualiseData = () => {
    if (!parserRef.current) return;
    const selectedCategories = dataLabels.filter((_label, index) => checkedIndices[index] === true);
    try {
      const newData = parserRef.current.parse(selectedCategories, startDate, endDate);
      setData(newData);
    } catch (error) {
      if (typeof error === 'string') setErrorMessage(error);
      else if (error instanceof Error) setErrorMessage(error.message);
      else setErrorMessage('Unknown Error :(');
    }
  };

  interface LabelFilter {
    name: string;
    mask: boolean[];
  }

  // regexp to select the lane number from the data labels. I have had to make some guesses
  // as to what the numbers represent. For example, bus priority seems to be encoded as a 6+lane number.
  // https://regex101.com/r/QfdGyM/2
  const laneRegex = /.*(?:\D{2})[5-9]?(\d{2})(?:\.|\D(?:\d|\D?){1,2})?$/;

  const detectorFilter = { name: 'DRs', mask: dataLabels.map(label => label.includes('DR')) };
  const signalFilter = { name: 'Signals', mask: dataLabels.map(label => label.includes('SG')) };
  const redGreenFilter = { name: 'RT and GR', mask: dataLabels.map(label => label.includes('RT') || label.includes('GR')) };

  const laneLabels = new Map<string, string[]>();

  dataLabels.forEach(label => {
    const result = laneRegex.exec(label);

    if (result?.[0]) {
      if (laneLabels.has(result[1])) laneLabels.get(result[1])!.push(result[0]);
      else laneLabels.set(result[1], [result[0]]);
    }
  });

  const laneFilters: LabelFilter[] = [...laneLabels].map(([laneName, labelsRelatedToLane]) => ({
    name: laneName, mask: dataLabels.map(label => labelsRelatedToLane.includes(label))
  }));

  const filters: LabelFilter[] = [detectorFilter, signalFilter, redGreenFilter, ...laneFilters];

  // Detemine all the labels which have not shown up in a filter yet
  const masks = filters.map(filter => filter.mask);
  const uncategorisedMask = masks.reduce((accuMask, mask) => accuMask.map((A, i) => A && !mask[i]), new Array<boolean>(dataLabels.length).fill(true));
  const uncategorisedFilter: LabelFilter = { name: 'Uncategorised', mask: uncategorisedMask };

  const labelProps = { labels: dataLabels, checkedIndices, setCheckedIndices };

  return (
    <div className="dataEntry">
     <div className="fileUpload">
        <span>Select Data File: </span>
        <div>
          <input type="file" accept=".csv,.xml" onChange={handleFileChange}/>
        </div>
      </div>
      <div>
        <span>Select Date and Time Range to Visualise: </span>
        <div>
          <input type="button" value="Reset" onClick={resetStartAndEndDates}/>
          <DateRangeBoxes userEditable={parserRef.current?.supportsDateFiltering ?? false} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate}/>
        </div>
      </div>
      <div id="checkboxSelect">
        <span>Select Data to Visualise: </span>
        <div>All: <CheckboxSelectAllClearAll {...labelProps}/></div>
        {[...filters, uncategorisedFilter].map((filter, index) => {
          // if mask is fully false, no point displaying the filter
          if (filter.mask.every(b => !b)) return null;
          else return (<div key={index}>{filter.name}: <CheckboxList mask={filter.mask} {...labelProps}/></div>);
        })}
      </div>
      <input type='button' value='Visualise' onClick={visualiseData}/>
      <span>{data.length > 0 ? 'Valid Data Parsed' : `No Data Parsed: ${errorMessage ?? ''}`}</span>
    </div>
  );
};

export default SignalDataImportComponent;
