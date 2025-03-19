import { Dispatch, FC, SetStateAction, useEffect, ChangeEventHandler } from 'react';

export const Checkbox: FC<{ label: string; state: boolean; onChange: () => void; }> = ({ label, state, onChange }) => {
  return (
    <span className='checkbox' onClick={onChange}>
      <input type="checkbox" checked={state || false} readOnly/>{label}
    </span>
  );
};

interface checkboxListProps {
  labels: string[];
  mask?: boolean[];
  checkedIndices: boolean[];
  setCheckedIndices: Dispatch<SetStateAction<boolean[]>>;
}

export const CheckboxSelectAllClearAll: FC<checkboxListProps> = ({ labels, mask = new Array<boolean>(labels.length).fill(true), checkedIndices, setCheckedIndices }) => {
  const handleSelectAll = () => {
    if (mask.length !== labels.length) throw new Error('Mask dimension mismatch');
    setCheckedIndices(checkedIndices.map((value, index) => mask[index] ? true : value));
  };

  const handleClearSelection = () => {
    if (mask.length !== labels.length) throw new Error('Mask dimension mismatch');
    setCheckedIndices(checkedIndices.map((value, index) => mask[index] ? false : value));
  };
  return (
    <>
      <input type='button' value='Select All' onClick={handleSelectAll}/>
      <input type='button' value='Clear Selection' onClick={handleClearSelection}/>
    </>
  );
};

export const CheckboxList: FC<checkboxListProps> = ({ labels, mask = new Array<boolean>(labels.length).fill(true), checkedIndices, setCheckedIndices }) => {
  useEffect(() => {
    if (checkedIndices.length !== labels.length) {
      setCheckedIndices(labels.map(() => false));
    }
  }, [labels, checkedIndices, setCheckedIndices]);

  const handleCheckboxChange = (index: number) => {
    setCheckedIndices((prev) =>
      prev.map((checked, i) => (i === index ? !checked : checked))
    );
  };
  return (
    <>
    <CheckboxSelectAllClearAll labels={labels} mask={mask} checkedIndices={checkedIndices} setCheckedIndices={setCheckedIndices}/>
    <div className='checkboxList'>
      {labels.map((label, index) => {
        if (mask[index]) {
          return (
            <Checkbox key={index} label={label} state={checkedIndices[index]} onChange={() => handleCheckboxChange(index)}></Checkbox>
          );
        } else return null;
      })}
    </div>
    </>
  );
};

interface DateRangeProps {
  userEditable: boolean;
  startDate?: Date,
  setStartDate: Dispatch<SetStateAction<Date | undefined>>,
  endDate?: Date,
  setEndDate: Dispatch<SetStateAction<Date | undefined>>
}

export const DateRangeBoxes: FC<DateRangeProps> = ({ userEditable, startDate, setStartDate, endDate, setEndDate }) => {
  const handleStartChange: ChangeEventHandler<HTMLInputElement> = change => {
    setStartDate(new Date(change.target.value));
  };

  const handleEndChange: ChangeEventHandler<HTMLInputElement> = change => {
    setEndDate(new Date(change.target.value));
  };

  return (
    <span>
      <input type="datetime-local" step='1' disabled={!userEditable} value={startDate?.toLocaleString('sv').replace(' ', 'T') || ''} onChange={handleStartChange}/>
      <input type="datetime-local" step='1' disabled={!userEditable} value={endDate?.toLocaleString('sv').replace(' ', 'T') || ''} onChange={handleEndChange}/>
    </span>
  );
};
