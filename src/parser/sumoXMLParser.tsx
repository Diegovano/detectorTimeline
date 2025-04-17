import { Group, Line } from 'timelines-chart';
import Parser from './parser';
import { parser } from 'sax';

// interface tlsStateType {
//   time: string;
//   id: string;
//   programID: string;
//   phase: string;
//   state: string;
// }

export default class SUMOXMLParser extends Parser {
  saxParser;

  constructor (input: string) {
    super(input, true);
    this.saxParser = parser(true);
  };

  _extractLabelsAndDateBounds () {
    let earliestMeasurement = Number.POSITIVE_INFINITY;
    let latestMeasurement = Number.NEGATIVE_INFINITY;
    let tlsStateAttributes = null;
    let longestStateString = 0;

    this.saxParser.onopentag = tag => {
      if (tag.name === 'tlsState') {
        tlsStateAttributes = tag.attributes as { [key: string]: string };

        const eventTimestamp = parseFloat(tlsStateAttributes?.time);
        if (eventTimestamp < earliestMeasurement) earliestMeasurement = eventTimestamp;
        if (eventTimestamp > latestMeasurement) latestMeasurement = eventTimestamp;

        if (tlsStateAttributes?.state.length > longestStateString) longestStateString = tlsStateAttributes?.state.length;
      }
    };

    this.saxParser.write(this.input).close();

    return { labels: Array.from({ length: longestStateString }, (_, i) => i.toString()), earliestMeasurement, latestMeasurement };
  }

  private checkTimestampBounds (candidate: number, startTimestamp?: number, endTimestamp?: number) {
    const startTime = startTimestamp ?? Number.NEGATIVE_INFINITY;
    const endTime = endTimestamp ?? Number.POSITIVE_INFINITY;

    return { afterStart: candidate >= startTime, beforeEnd: candidate <= endTime };
  }

  parse (requestedLabels: string[] = this.allLabelsAndBounds.labels, startTimestamp?: number, endTimestamp?: number): Group[] {
    this.detectorData.data = [];
    this.signalData.data = [];
    this.otherData.data = [];

    let afterStart = false;
    let beforeEnd = false;

    const requestedStateIndices = requestedLabels.map(x => parseInt(x));

    let tlsStateAttributes: { [key: string]: string } | null = null;

    const measurements: Line[] = requestedLabels.map(label => ({ label, data: [] }));
    const previousMeasurements: Map<number, { timestamp: number, value: string }> = new Map();

    this.saxParser.onopentag = tag => {
      if (tag.name === 'tlsState') {
        tlsStateAttributes = tag.attributes as { [key: string]: string };

        if (tlsStateAttributes.time) {
          const time = parseInt(tlsStateAttributes.time);
          tlsStateAttributes.state.split('').forEach((tlsState, index) => {
            const currentLabel = this.allLabelsAndBounds.labels[index];

            if (requestedStateIndices.includes(index) && tlsStateAttributes) {
              ({ afterStart, beforeEnd } = this.checkTimestampBounds(time, startTimestamp, endTimestamp));

              const previousMeasurement = previousMeasurements.get(index);
              if (beforeEnd) {
                const measurementStart = startTimestamp ? Math.max(time, startTimestamp) : time;
                previousMeasurements.set(index, { timestamp: measurementStart, value: tlsState });
              }
              if (previousMeasurement) {
                if (afterStart && beforeEnd) {
                  measurements.find(line => line.label === currentLabel)?.data.push(
                    { timeRange: [previousMeasurement.timestamp, time], val: previousMeasurement.value }
                  );
                }
              };
            }
          });
        }
      }
    };

    this.saxParser.write(this.input).close();

    if (endTimestamp) {
      previousMeasurements.forEach((previousMeasurements, labelIndex) => {
        measurements.find(line =>
          line.label === this.allLabelsAndBounds.labels[labelIndex])?.data.push(
          { timeRange: [previousMeasurements.timestamp, endTimestamp], val: previousMeasurements.value });
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
};
