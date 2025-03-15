import { Dispatch, FC, SetStateAction, useEffect } from 'react';

export const Checkbox: FC<{ label: string; state: boolean; onChange: () => void; }> = ({ label, state, onChange }) => {
  return (
    <div className='checkbox'>
      <input type="checkbox" checked={state || false} onChange={onChange}/>{label}
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
