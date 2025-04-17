import { ChangeEvent, Dispatch, FC, SetStateAction, useState, useRef } from 'react';
import { CheckboxList, CheckboxSelectAllClearAll, DateRangeBoxes, TimestampRangeBoxes } from './genericComponents';
import { Group } from 'timelines-chart';
import Parser from './parser/parser';
import determineXMLFormat from './parser/determineXMLFormat';
import CSVParser from './parser/csvParser';
import ZHXMLParser from './parser/ZHXMLParser';
import SUMOXMLParser from './parser/sumoXMLParser';

type TimeFormatType = 'date' | 'timestamp';

interface dataImportProps {
  data: Group[];
  setData: Dispatch<SetStateAction<Group[]>>;
  timeFormat: TimeFormatType;
  setTimeFormat: Dispatch<SetStateAction<TimeFormatType>>;
}

const SignalDataImportComponent: FC<dataImportProps> = ({ data, setData, timeFormat, setTimeFormat }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dataLabels, setDataLabels] = useState<string[]>([]);
  const [checkedIndices, setCheckedIndices] = useState<boolean[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [startTimestamp, setStartTimestamp] = useState<number>();
  const [endDate, setEndDate] = useState<Date>();
  const [endTimestamp, setEndTimestamp] = useState<number>();
  const [categoryVisible, setCategoryVisible] = useState<boolean>(true);
  const [laneVisible, setLaneVisible] = useState<boolean>(true);

  const parserRef = useRef<Parser | null>(null);

  function resetStartAndEndDates () {
    const earliestMeasurement = parserRef.current?.allLabelsAndBounds.earliestMeasurement;
    const latestMeasurement = parserRef.current?.allLabelsAndBounds.latestMeasurement;
    if (earliestMeasurement instanceof Date && latestMeasurement instanceof Date) {
      setStartDate(earliestMeasurement);
      setEndDate(latestMeasurement);
    } else if (typeof earliestMeasurement === 'number' && typeof latestMeasurement === 'number') {
      setStartTimestamp(earliestMeasurement);
      setEndTimestamp(latestMeasurement);
    }
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setData([]);
      // inital file parse
      const inputFile = e.target.files[0];
      if (inputFile.name.split('.')[1] === 'csv') {
        const inputText = await inputFile.text();

        setTimeFormat('date');
        parserRef.current = new CSVParser(inputText);
      } else if (inputFile.name.split('.')[1] === 'xml') {
        const inputText = await inputFile.text();
        const format = determineXMLFormat(inputText);

        if (format === 'ZHFormat') {
          setTimeFormat('date');
          parserRef.current = new ZHXMLParser(inputText);
        } else if (format === 'SUMOFormat') {
          setTimeFormat('timestamp');
          parserRef.current = new SUMOXMLParser(inputText);
        } else {
          setData([]);
          setErrorMessage('Could not recognise XML format provided');
          return;
        }
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
      let newData = null;
      if (timeFormat === 'date') newData = parserRef.current.parse(selectedCategories, startDate, endDate);
      else newData = parserRef.current.parse(selectedCategories, startTimestamp, endTimestamp);

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
  const DAFilter = { name: 'DAs', mask: dataLabels.map(label => label.includes('DA')) };
  const redAmberGreenFilter = { name: 'RT, GE, and GR', mask: dataLabels.map(label => label.includes('RT') || label.includes('GE') || label.includes('GR')) };
  const BSFilter = { name: 'BS', mask: dataLabels.map(labels => labels.includes('BS')) };

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

  const categoryFilters: LabelFilter[] = [detectorFilter, signalFilter, DAFilter, redAmberGreenFilter, BSFilter];

  // Detemine all the labels which have not shown up in a filter yet
  const masks = [...categoryFilters, ...laneFilters].map(filter => filter.mask);
  const uncategorisedMask = masks.reduce((accuMask, mask) => accuMask.map((A, i) => A && !mask[i]), new Array<boolean>(dataLabels.length).fill(true));
  const uncategorisedFilter: LabelFilter = { name: 'Uncategorised', mask: uncategorisedMask };

  const labelProps = { labels: dataLabels, checkedIndices, setCheckedIndices };

  function getCheckboxListFromFilter (filters: LabelFilter[]) {
    return (filters.map((filter, index) => {
      // if mask is fully false, no point displaying the filter
      if (filter.mask.every(b => !b)) return null;
      else return (<div key={index}>{filter.name}: <CheckboxList mask={filter.mask} {...labelProps}/></div>);
    }));
  }

  return (
    <div className="dataEntry">
     <div className="fileUpload">
        <h3>Select Data File: </h3>
        <div>
          <input type="file" accept=".csv,.xml" onChange={handleFileChange}/>
        </div>
      </div>
      <div>
        {
          timeFormat === 'date'
            ? (<h3>Select Date and Time Range to Visualise: </h3>)
            : (<h3>Select Tick Range to Visualise: </h3>)
        }
        <div>
          <input type="button" value="Reset" onClick={resetStartAndEndDates}/>
          {
            timeFormat === 'date'
              ? <DateRangeBoxes userEditable={parserRef.current?.supportsDateFiltering ?? false} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate}/>
              : <TimestampRangeBoxes userEditable={parserRef.current?.supportsDateFiltering ?? false} startTimestamp={startTimestamp} setStartTimestamp={setStartTimestamp} endTimestamp={endTimestamp} setEndTimestamp={setEndTimestamp}/>
          }
        </div>
      </div>
      <div id="checkboxSelect">
        <h3>Select Data to Visualise: </h3>
        <div>All: <CheckboxSelectAllClearAll {...labelProps}/></div>
        <h4 className="collapseMenu" onClick={() => setCategoryVisible(state => !state)}>&gt; Select Category</h4>
        {categoryVisible && getCheckboxListFromFilter(categoryFilters)}
          <h4 className="collapseMenu" onClick={() => setLaneVisible(state => !state)}>&gt; Select Lane</h4>
        {laneVisible && getCheckboxListFromFilter(laneFilters)}
        {getCheckboxListFromFilter([uncategorisedFilter])}
      </div>
      <input type='button' value='Visualise' onClick={visualiseData}/>
      <span>Status Message: {data.length > 0 ? 'Valid Data Parsed' : `No Data Parsed: ${errorMessage ?? ''}`}</span>
    </div>
  );
};

export default SignalDataImportComponent;
