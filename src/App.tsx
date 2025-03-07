import { useState, useEffect, useRef } from 'react';
import './App.css';
import TimelinesChart, { Group } from 'timelines-chart';
import ParseData from './ParseData.tsx';

// import getRandomData from './randomData';

// const myData = getRandomData(true);
// const sampleData: Group[] = [{ group: 'test', data: [{ label: 'hi', data: [{ timeRange: [1, 2], val: 10 }, { timeRange: [4, 6], val: 2 }] }] }];

const TimelineComponent = () => {
  const [data, setData] = useState<Group[]>([]);
  const timelineRef = useRef(null);

  useEffect(() => {
    if (timelineRef.current) {
      const chart = new TimelinesChart(timelineRef.current).data(data);
      chart.refresh();
    }
  }, [data]);
  return (
    <div>
      <ParseData data={data} setData={setData}></ParseData>
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
