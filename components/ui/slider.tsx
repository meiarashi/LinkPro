import * as React from "react"

interface SliderProps {
  min: number
  max: number
  step?: number
  value: number[]
  onValueChange: (value: number[]) => void
  className?: string
}

export function Slider({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  className = "",
}: SliderProps) {
  const [localValue, setLocalValue] = React.useState(value)
  
  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = (index: number, newValue: number) => {
    const newValues = [...localValue]
    newValues[index] = newValue
    
    // 値の順序を保つ
    if (index === 0 && newValues[0] > newValues[1]) {
      newValues[0] = newValues[1]
    } else if (index === 1 && newValues[1] < newValues[0]) {
      newValues[1] = newValues[0]
    }
    
    setLocalValue(newValues)
    onValueChange(newValues)
  }

  const percentage = (val: number) => ((val - min) / (max - min)) * 100

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative h-2 bg-gray-200 rounded-full">
        <div
          className="absolute h-2 bg-blue-500 rounded-full"
          style={{
            left: `${percentage(localValue[0])}%`,
            width: `${percentage(localValue[1]) - percentage(localValue[0])}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[0]}
          onChange={(e) => handleChange(0, Number(e.target.value))}
          className="absolute w-full h-2 opacity-0 cursor-pointer"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[1]}
          onChange={(e) => handleChange(1, Number(e.target.value))}
          className="absolute w-full h-2 opacity-0 cursor-pointer"
        />
        <div
          className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full -mt-1 cursor-pointer"
          style={{ left: `calc(${percentage(localValue[0])}% - 8px)` }}
        />
        <div
          className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full -mt-1 cursor-pointer"
          style={{ left: `calc(${percentage(localValue[1])}% - 8px)` }}
        />
      </div>
    </div>
  )
}