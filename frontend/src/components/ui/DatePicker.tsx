'use client';

import { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

export function DatePicker({ selectedDate, onDateSelect, minDate, maxDate }: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const startDay = startOfMonth(currentMonth).getDay();
  const today = startOfDay(new Date());

  const isDateDisabled = (date: Date) => {
    if (isBefore(date, today)) return true;
    if (minDate && isBefore(date, minDate)) return true;
    if (maxDate && isBefore(maxDate, date)) return true;
    return false;
  };

  return (
    <div className="bg-white rounded-xl p-4 w-72 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1 hover:bg-cream rounded transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <span className="font-medium text-text-primary">{format(currentMonth, 'MMMM yyyy')}</span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1 hover:bg-cream rounded transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-text-secondary" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center text-xs text-text-muted py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before start of month */}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map((day) => {
          const disabled = isDateDisabled(day);
          const selected = isSameDay(day, selectedDate);
          const current = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => !disabled && onDateSelect(day)}
              disabled={disabled}
              className={cn(
                'w-9 h-9 rounded-lg text-sm transition-colors',
                disabled && 'text-gray-300 cursor-not-allowed',
                !disabled && !selected && 'hover:bg-cream text-text-primary',
                selected && 'bg-primary text-white',
                current && !selected && 'ring-1 ring-primary',
                !isSameMonth(day, currentMonth) && 'text-gray-300'
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Horizontal date selector (like filmhouse.sg)
interface DateSelectorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  days?: number;
}

export function DateSelector({ selectedDate, onDateSelect, days = 14 }: DateSelectorProps) {
  const dates = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  return (
    <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
      {dates.map((date) => {
        const selected = isSameDay(date, selectedDate);
        const current = isToday(date);

        return (
          <button
            key={date.toISOString()}
            onClick={() => onDateSelect(date)}
            className={cn(
              'flex flex-col items-center px-3 py-2 rounded-lg min-w-[60px] transition-colors border',
              selected 
                ? 'bg-primary text-white border-primary' 
                : 'bg-white hover:bg-cream border-gray-200 text-text-primary',
              current && !selected && 'ring-1 ring-primary'
            )}
          >
            <span className={cn('text-xs uppercase', selected ? 'text-white/80' : 'text-text-muted')}>
              {format(date, 'EEE')}
            </span>
            <span className="text-lg font-semibold">{format(date, 'd')}</span>
            <span className={cn('text-xs', selected ? 'text-white/80' : 'text-text-muted')}>
              {format(date, 'MMM')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
