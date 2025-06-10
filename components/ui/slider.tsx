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
  const [isDragging, setIsDragging] = React.useState<number | null>(null)
  const sliderRef = React.useRef<HTMLDivElement>(null)
  
  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = (index: number, newValue: number) => {
    const newValues = [...localValue]
    newValues[index] = Math.round(newValue / step) * step
    
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

  const handleMouseDown = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(index)
  }

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDragging === null || !sliderRef.current) return

    const rect = sliderRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const newValue = (percent / 100) * (max - min) + min
    
    handleChange(isDragging, newValue)
  }, [isDragging, max, min, step])

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(null)
  }, [])

  React.useEffect(() => {
    if (isDragging !== null) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div ref={sliderRef} className={`relative w-full h-6 flex items-center ${className}`}>
      <div className="relative w-full h-2 bg-gray-200 rounded-full">
        <div
          className="absolute h-2 bg-blue-500 rounded-full transition-none"
          style={{
            left: `${percentage(localValue[0])}%`,
            width: `${percentage(localValue[1]) - percentage(localValue[0])}%`,
          }}
        />
        <div
          className="absolute w-5 h-5 bg-white border-2 border-blue-500 rounded-full -mt-1.5 cursor-grab hover:scale-110 transition-transform"
          style={{ left: `calc(${percentage(localValue[0])}% - 10px)` }}
          onMouseDown={handleMouseDown(0)}
        />
        <div
          className="absolute w-5 h-5 bg-white border-2 border-blue-500 rounded-full -mt-1.5 cursor-grab hover:scale-110 transition-transform"
          style={{ left: `calc(${percentage(localValue[1])}% - 10px)` }}
          onMouseDown={handleMouseDown(1)}
        />
      </div>
    </div>
  )
}