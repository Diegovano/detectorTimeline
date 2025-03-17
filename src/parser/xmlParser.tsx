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
  }

  _extractLabelsAndDateBounds () {
    const dataLabels: DataSourceType[] = [];
    let currentLabel: Partial<DataSourceType> = {};
    let currentTag: keyof DataSourceType | null = null;

    let insideElement = false;
    let enteredTimestamp = false;

    let earliestTime = Number.POSITIVE_INFINITY;
    let latestTime = Number.NEGATIVE_INFINITY;

    this.saxParser.onopentag = tag => {
      if (tag.name === 'Element') {
        insideElement = true;
        currentLabel = {};
      } else if (tag.name === 'Timestamp') {
        enteredTimestamp = true;
      } else if (insideElement) {
        currentTag = tag.name as keyof DataSourceType;
      }
    };

    this.saxParser.ontext = text => {
      if (currentTag && currentLabel) {
        currentLabel[currentTag] = text.trim();
      } else if (enteredTimestamp) {
        enteredTimestamp = false;
        const currentTimestamp = new Date(text.trim());
        const currentTime = currentTimestamp.getTime();
        if (isNaN(currentTime)) return;
        if (currentTime < earliestTime) {
          if (currentTimestamp.getMilliseconds()) {
            const roundedTimestamp = new Date(currentTimestamp);
            roundedTimestamp.setMilliseconds(0);
            earliestTime = roundedTimestamp.getTime();
          } else earliestTime = currentTime;
        }
        if (currentTime > latestTime) {
          if (currentTimestamp.getMilliseconds()) {
            const roundedTimestamp = new Date(currentTimestamp);
            roundedTimestamp.setSeconds(currentTimestamp.getSeconds() + 1, 0);
            latestTime = roundedTimestamp.getTime();
          } else latestTime = currentTime;
        }
      }
    };

    this.saxParser.onclosetag = tagName => {
      if (tagName === 'Element') {
        if (Object.keys(currentLabel).length > 0) {
          dataLabels.push(currentLabel as DataSourceType);
        }
        currentLabel = {};
        insideElement = false;
      } else if (tagName === 'Timestamp') {
        //
      }
      currentTag = null;
    };

    this.saxParser.write(this.input).close();

    return { labels: dataLabels.map(labelDetails => labelDetails.ShortText), earliestMeasurement: new Date(earliestTime), latestMeasurement: new Date(latestTime) };
  }

  parse (requestedLabels: string[] = this.allLabelsAndBounds.labels, startDate?: Date, endDate?: Date): Group[] {
    this.detectorData.data = [];
    this.signalData.data = [];
    this.otherData.data = [];

    let inBoundMeasurementTimestamp: Date | null = null;
    let debugTimestamp: Date | null = null;

    const measurements: Line[] = requestedLabels.map(label => ({ label, data: [] }));
    const previousMeasurements: Map<number, { timestamp: Date; value: string }> = new Map();

    this.saxParser.onopentag = tag => {
      if (tag.name === 'Timestamp') {
        this.saxParser.ontext = timestamp => {
          const candidateTimestamp = new Date(timestamp.trim());
          const candidateTime = candidateTimestamp.getTime();
          const startTime = startDate?.getTime() ?? Number.NEGATIVE_INFINITY;
          const endTime = endDate?.getTime() ?? Number.POSITIVE_INFINITY;

          if (candidateTime >= startTime && candidateTime <= endTime) inBoundMeasurementTimestamp = candidateTimestamp;
          else debugTimestamp = candidateTimestamp;
        };
      } else if (tag.name === 'Value') {
        if (inBoundMeasurementTimestamp) {
          const currentAttributes = tag.attributes as { [key: string]: string };

          const currentIndex = parseInt(currentAttributes?.Index);
          if (isNaN(currentIndex)) throw new Error('No index in timestamp tag, cannot determine event type');

          this.saxParser.ontext = value => {
            if (!inBoundMeasurementTimestamp) throw new Error('Timestamp blank');
            const currentLabel = this.allLabelsAndBounds.labels[currentIndex];

            if (requestedLabels.includes(currentLabel)) {
              const previousMeasurement = previousMeasurements.get(currentIndex);
              previousMeasurements.set(currentIndex, { timestamp: inBoundMeasurementTimestamp, value: value.trim() });
              if (previousMeasurement && previousMeasurement.value !== '0') {
                measurements.find(line =>
                  line.label === this.allLabelsAndBounds.labels[currentIndex])?.data.push(
                  { timeRange: [new Date(previousMeasurement.timestamp), new Date(inBoundMeasurementTimestamp)], val: previousMeasurement.value });
              }
            }
          };
        } else {
          const currentAttributes = tag.attributes as { [key: string]: string };
          const currentIndex = parseInt(currentAttributes?.Index);
          if (isNaN(currentIndex)) throw new Error('No index in timestamp tag, cannot determine event type');
          console.log(`Skipped Measurement ${this.allLabelsAndBounds.labels[currentIndex]}: at time ${debugTimestamp}`);
        }
      }
    };

    this.saxParser.onclosetag = tagName => {
      if (tagName === 'Timestamp') {
        this.saxParser.ontext = _ => {}; // remove text callback, we need a tag next
        inBoundMeasurementTimestamp = null;
      } else if (tagName === 'Value') {
        this.saxParser.ontext = _ => {};
      }
    };

    this.saxParser.onerror = error => {
      console.log(`Error occured during XML parsing: ${error.message}`);
    };

    this.saxParser.write(this.input).close();

    // at this point, we may have measurements which occured, but are not displayed because they are
    // waiting for the next one to determine its end and then displayed.
    // To get them to display, we need to "pretend" they end at the endDate if specified by the user.
    if (endDate) {
      previousMeasurements.forEach((previousMeasurement, labelIndex) => {
        if (previousMeasurement.value === '0') return;
        measurements.find(line =>
          line.label === this.allLabelsAndBounds.labels[labelIndex])?.data.push(
          { timeRange: [new Date(previousMeasurement.timestamp), endDate], val: previousMeasurement.value });
      });
    }

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
