import { Group, Line } from 'timelines-chart';
import Parser from './parser';
import { parser } from 'sax';

type previousMeasurementType = Map<number, { timestamp: number, value: string }>;

export default class SUMOXMLParser extends Parser {
  saxParser;

  constructor (input: string) {
    super(input, true);
    this.saxParser = parser(true);
  };

  _extractLabelsAndDateBounds () {
    let earliestMeasurement = Number.POSITIVE_INFINITY;
    let latestMeasurement = Number.NEGATIVE_INFINITY;
    let attributes = null;
    let longestStateString = 0;
    const iLoopNames = new Set<string>();

    this.saxParser.onopentag = tag => {
      if (tag.name === 'tlsState' || tag.name === 'instantOut') {
        attributes = tag.attributes as { [key: string]: string };

        const eventTimestamp = parseFloat(attributes?.time);
        if (eventTimestamp < earliestMeasurement) earliestMeasurement = eventTimestamp;
        if (eventTimestamp > latestMeasurement) latestMeasurement = eventTimestamp;

        if (tag.name === 'tlsState' && attributes?.state.length > longestStateString) longestStateString = attributes?.state.length;
        if (tag.name === 'instantOut' && attributes?.id) iLoopNames.add(attributes.id);
      }
    };

    this.saxParser.write(this.input).close();

    if (longestStateString > 0) return { labels: Array.from({ length: longestStateString }, (_, i) => i.toString()), earliestMeasurement, latestMeasurement };
    else return { labels: Array.from(iLoopNames), earliestMeasurement, latestMeasurement };
  }

  private checkTimestampBounds (candidate: number, startTimestamp?: number, endTimestamp?: number) {
    const startTime = startTimestamp ?? Number.NEGATIVE_INFINITY;
    const endTime = endTimestamp ?? Number.POSITIVE_INFINITY;

    return { afterStart: candidate >= startTime, beforeEnd: candidate <= endTime };
  }

  private processEvent (label: string, value: string, processEventParams: { requestedLabels: string[], measurements: Line[], previousMeasurements: previousMeasurementType, time: number, startTimestamp?: number, endTimestamp?: number }) {
    // const currentLabel = this.allLabelsAndBounds.labels[index];
    const { requestedLabels, measurements, previousMeasurements, time, startTimestamp, endTimestamp } = processEventParams;

    const currentLabel = label;
    const labelIndex = requestedLabels.findIndex(rLabel => rLabel === label);

    if (labelIndex !== -1) {
      const { afterStart, beforeEnd } = this.checkTimestampBounds(time, startTimestamp, endTimestamp);

      const previousMeasurement = previousMeasurements.get(labelIndex);
      if (beforeEnd) {
        const measurementStart = startTimestamp ? Math.max(time, startTimestamp) : time;
        previousMeasurements.set(labelIndex, { timestamp: measurementStart, value });
      }
      if (previousMeasurement && previousMeasurement.value !== '0') {
        if (afterStart && beforeEnd) {
          measurements.find(line => line.label === currentLabel)?.data.push(
            { timeRange: [previousMeasurement.timestamp, time], val: previousMeasurement.value }
          );
        }
      };
    }
  }

  parse (requestedLabels: string[] = this.allLabelsAndBounds.labels, startTimestamp?: number, endTimestamp?: number): Group[] {
    this.detectorData.data = [];
    this.signalData.data = [];
    this.otherData.data = [];

    // const requestedStateIndices = requestedLabels.map(x => parseInt(x));

    let attributes: { [key: string]: string } | null = null;

    const measurements: Line[] = requestedLabels.map(label => ({ label, data: [] }));
    const previousMeasurements: previousMeasurementType = new Map();

    this.saxParser.onopentag = tag => {
      if (tag.name === 'tlsState' || tag.name === 'instantOut') {
        attributes = tag.attributes as { [key: string]: string };

        if (attributes?.time) {
          const time = parseInt(attributes.time);

          const processEventParams = { requestedLabels, measurements, previousMeasurements, time, startTimestamp, endTimestamp };

          if (tag.name === 'tlsState') {
            attributes.state.split('').forEach((tlsState, index) => {
              this.processEvent(this.allLabelsAndBounds.labels[index], tlsState, processEventParams);
            });
          } else if (tag.name === 'instantOut') {
            if (attributes.state === 'enter') this.processEvent(attributes.id, '1', processEventParams);
            else if (attributes.state === 'leave') this.processEvent(attributes.id, '0', processEventParams);
          }
        }
      }
    };

    this.saxParser.write(this.input).close();

    if (endTimestamp) {
      previousMeasurements.forEach((previousMeasurements, labelIndex) => {
        if (previousMeasurements.value === '0') return;
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
