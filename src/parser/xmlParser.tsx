import { Group, Line } from 'timelines-chart';
import Parser from './parser';
import { parser } from 'sax';

interface DataSourceType {
  Code: string;
  Channel: string;
  ShortText: string;
  DataSourceType: string;
  NodeName: string;
  Suffix: string;
  Lane: string;
  List: string;
  Bit: string;
}

class XMLParser extends Parser {
  saxParser;

  constructor (input: string) {
    super(input);

    this.saxParser = parser(true);

    this.saxParser.onerror = error => {
      console.log(error);
    };
  }

  extractLabels () {
    const dataLabels: DataSourceType[] = [];
    let currentLabel: Partial<DataSourceType> = {};
    let currentTag: keyof DataSourceType | null = null;
    let insideElement = false;

    this.saxParser.onopentag = tag => {
      if (tag.name === 'Element') {
        insideElement = true;
        currentLabel = {}; // Start a new event object
      } else if (insideElement) {
        currentTag = tag.name as keyof DataSourceType;
      }
    };

    this.saxParser.ontext = text => {
      if (currentTag && currentLabel) {
        currentLabel[currentTag] = text.trim();
      }
    };

    this.saxParser.onclosetag = tagName => {
      if (tagName === 'Element') {
        if (Object.keys(currentLabel).length > 0) {
          dataLabels.push(currentLabel as DataSourceType);
        }
        currentLabel = {};
        insideElement = false;
      } else if (tagName === 'Elements') {
        // TODO: ideally, stop parsing at this point, because we have already found all the labels.
      }
      currentTag = null;
    };

    this.saxParser.write(this.input).close();

    return dataLabels.map(labelDetails => labelDetails.ShortText);
  }

  parse (requestedLabels: string[] = this.allLabels): Group[] {
    this.detectorData.data = [];
    this.signalData.data = [];
    this.otherData.data = [];

    let insideTimestamp = false;
    let insideValue = false;

    let currentTimestamp: string | null = null;
    let currentAttributes: { [key: string]: string };
    const measurements: Line[] = requestedLabels.map(label => ({ label, data: [] }));
    const previousMeasurements: Map<number, { timestamp: string; value: string }> = new Map();

    this.saxParser.onopentag = tag => {
      if (tag.name === 'Timestamp') {
        insideTimestamp = true;
      } else if (insideTimestamp && currentTimestamp && tag.name === 'Value') {
        insideValue = true;
        currentAttributes = tag.attributes as { [key: string]: string };
      }
    };

    this.saxParser.ontext = text => {
      if (insideTimestamp) {
        if (!currentTimestamp) currentTimestamp = text.trim();
        else if (insideValue) {
          const currentIndex = parseInt(currentAttributes?.Index);
          const currentLabel = this.allLabels[currentIndex];

          if (requestedLabels.includes(currentLabel)) {
            const previousMeasurement = previousMeasurements.get(currentIndex);
            previousMeasurements.set(currentIndex, { timestamp: currentTimestamp, value: text.trim() });
            if (previousMeasurement && previousMeasurement.value !== '0') {
              measurements.find(line =>
                line.label === this.allLabels[currentIndex])?.data.push(
                { timeRange: [new Date(previousMeasurement.timestamp), new Date(currentTimestamp)], val: previousMeasurement.value });
            }
          }
        }
      }
    };

    this.saxParser.onclosetag = tagName => {
      if (tagName === 'Timestamp') {
        insideTimestamp = false;
        currentTimestamp = null;
      } else if (tagName === 'Value') {
        insideValue = false;
        currentAttributes = {};
      }
    };

    this.saxParser.write(this.input).close();

    measurements.forEach(line => {
      if (this.detectorLabelSubstrings.some(sub => line.label.includes(sub))) {
        this.detectorData.data.push(line);
      } else if (this.signalLabelSubstrings.some(sub => line.label.includes(sub))) {
        this.signalData.data.push(line);
      } else {
        this.otherData.data.push(line);
      }
    });

    return [this.detectorData, this.signalData, this.otherData];
  }
}

export default XMLParser;
