import { Dispatch, FC, SetStateAction, useEffect, ChangeEventHandler } from 'react';

export const Checkbox: FC<{ label: string; state: boolean; onChange: () => void; }> = ({ label, state, onChange }) => {
  return (
    <div className='checkbox' onClick={onChange}>
      <input type="checkbox" checked={state || false} readOnly/>{label}
    </div>
  );
};

interface checkboxListProps {
  labels: string[];
  checkedIndices: boolean[];
  setCheckedIndices: Dispatch<SetStateAction<boolean[]>>;
}

export const CheckboxList: FC<checkboxListProps> = ({ labels, checkedIndices, setCheckedIndices }) => {
  useEffect(() => {
    if (checkedIndices.length !== labels.length) {
      setCheckedIndices(labels.map(() => false));
    }
  }, [labels, checkedIndices, setCheckedIndices]);

  const handleSelectAll = () => {
    setCheckedIndices(() => new Array(labels.length).fill(true));
  };

  const handleClearSelection = () => {
    setCheckedIndices(() => new Array(labels.length).fill(false));
  };

  const handleCheckboxChange = (index: number) => {
    setCheckedIndices((prev) =>
      prev.map((checked, i) => (i === index ? !checked : checked))
    );
  };
  return (
    <div className='columnSelection'>
      <input type='button' value='Select All' onClick={handleSelectAll}/>
      <input type='button' value='Clear Selection' onClick={handleClearSelection}/>
      {labels.map((label, index) => (
        <div key={index} className="columnSelectionCheckbox">
          <Checkbox label={label} state={checkedIndices[index]} onChange={() => handleCheckboxChange(index)}></Checkbox>
        </div>
      ))}
    </div>
  );
};

interface DateRangeProps {
  startDate?: Date,
  setStartDate: Dispatch<SetStateAction<Date | undefined>>,
  endDate?: Date,
  setEndDate: Dispatch<SetStateAction<Date | undefined>>
}

export const DateRangeBoxes: FC<DateRangeProps> = ({ startDate, setStartDate, endDate, setEndDate }) => {
  const handleStartChange: ChangeEventHandler<HTMLInputElement> = change => {
    setStartDate(new Date(change.target.value));
  };

  const handleEndChange: ChangeEventHandler<HTMLInputElement> = change => {
    setEndDate(new Date(change.target.value));
  };

  useEffect(() => {

  }, [startDate, endDate]);

  return (
    <div>
      <input type="datetime-local" value={startDate?.toLocaleString('sv').replace(' ', 'T') || ''} onChange={handleStartChange}/>
      <input type="datetime-local" value={endDate?.toLocaleString('sv').replace(' ', 'T') || ''} onChange={handleEndChange}/>
    </div>
  );
};
