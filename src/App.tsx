import { useState, useEffect, useRef, MutableRefObject } from 'react';
import './App.css';
import TimelinesChart, { Group, Val } from 'timelines-chart';
import { scaleOrdinal } from 'd3';
import DataEntry from './dataEntry.tsx';

type TimeFormatType = 'date' | 'timestamp';

// const customTimeFormat = timeFormatDefaultLocale().formatMulti([
//   ['.%L', (d: Date) => d.getMilliseconds()],
//   [':%S', (d: Date) => d.getSeconds()],
//   ['%I:%M', (d: Date) => d.getMinutes()],
//   ['%I %p', (d: Date) => d.getHours()],
//   ['%a %d', (d: Date) => d.getDay() && d.getDate() !== 1],
//   ['%b %d', (d: Date) => d.getDate() !== 1],
//   ['%B', (d: Date) => d.getMonth()],
//   ['%Y', () => true]
// ]);

const TimelineComponent = () => {
  const [data, setData] = useState<Group[]>([]);
  const [timeFormat, setTimeFormat] = useState<TimeFormatType>('date');
  const timelineRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<TimelinesChart>(null) as MutableRefObject<TimelinesChart>;

  useEffect(() => {
    const colourScale = scaleOrdinal<Val, string>()
      .domain(timeFormat === 'date'
        ? ['1', '3', '12', '15', '48']
        : ['1', 'r', 'y', 'G', 'g'])
      .range(timeFormat === 'date'
        ? ['blue', 'red', 'yellow', 'orange', 'green']
        : ['blue', 'red', 'yellow', 'lime', 'green'])
      .unknown('black');

    if (timelineRef.current && !chartInstance.current) chartInstance.current = new TimelinesChart(timelineRef.current);
    if (timelineRef.current) {
      chartInstance.current
        .xTickFormat(timeFormat === 'date'
          ? null
          : x => `${+x}`
        )
        .timeFormat(timeFormat === 'date'
          ? '%Y-%m-%d %-H:%M:%S.%L'
          : '%Q')
        .zQualitative(true)
        .zColorScale(colourScale)
        .enableAnimations(false)
        .data(data)
        .refresh();
    }
    return () => {
      chartInstance.current.data([]);
    };
  }, [data, timeFormat]);
  return (
    <div>
      <DataEntry data={data} setData={setData} timeFormat={timeFormat} setTimeFormat={setTimeFormat}></DataEntry>
      <div ref={timelineRef}></div>
    </div>
  );
};

function App () {
  return (
    <>
      <h1 id='main-title'>Detector Timeline</h1>
      <div id="content">
        <TimelineComponent></TimelineComponent>
      </div>
    </>
  );
}

export default App;
