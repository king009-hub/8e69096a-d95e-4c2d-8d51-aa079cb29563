import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, BedDouble } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { HotelBooking, HotelRoom } from '@/types/hotel';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RoomAvailabilityCalendarProps {
  bookings: HotelBooking[];
  rooms: HotelRoom[];
}

export function RoomAvailabilityCalendar({ bookings, rooms }: RoomAvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const totalRooms = rooms.length;
  
  const getOccupancyForDay = (day: Date) => {
    if (totalRooms === 0) return { occupied: 0, available: totalRooms, percentage: 0 };
    
    const occupiedRooms = bookings.filter(booking => {
      const checkIn = new Date(booking.check_in_date);
      const checkOut = new Date(booking.check_out_date);
      return isWithinInterval(day, { start: checkIn, end: checkOut }) &&
             ['confirmed', 'checked_in'].includes(booking.status);
    }).length;
    
    return {
      occupied: occupiedRooms,
      available: totalRooms - occupiedRooms,
      percentage: Math.round((occupiedRooms / totalRooms) * 100)
    };
  };
  
  const getOccupancyColor = (percentage: number) => {
    if (percentage === 0) return 'bg-green-500/20 text-green-700 dark:text-green-400';
    if (percentage < 50) return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
    if (percentage < 75) return 'bg-amber-500/20 text-amber-700 dark:text-amber-400';
    if (percentage < 100) return 'bg-orange-500/20 text-orange-700 dark:text-orange-400';
    return 'bg-red-500/20 text-red-700 dark:text-red-400';
  };
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <BedDouble className="h-5 w-5" />
          Room Availability Calendar
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500/20" />
            <span>0% Occupied</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-500/20" />
            <span>1-49%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500/20" />
            <span>50-74%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500/20" />
            <span>75-99%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500/20" />
            <span>100% Full</span>
          </div>
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Header */}
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
          
          {/* Days */}
          {days.map((day, index) => {
            const occupancy = getOccupancyForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            
            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "relative p-1 min-h-[60px] rounded-md border transition-colors cursor-pointer",
                      isCurrentMonth ? "bg-card" : "bg-muted/30",
                      isToday && "ring-2 ring-primary",
                      !isCurrentMonth && "opacity-50"
                    )}
                  >
                    <div className={cn(
                      "text-xs font-medium mb-1",
                      isToday ? "text-primary" : "text-foreground"
                    )}>
                      {format(day, 'd')}
                    </div>
                    {isCurrentMonth && totalRooms > 0 && (
                      <div className={cn(
                        "text-[10px] font-medium px-1 py-0.5 rounded text-center",
                        getOccupancyColor(occupancy.percentage)
                      )}>
                        {occupancy.available}/{totalRooms}
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <div className="space-y-1">
                    <p className="font-medium">{format(day, 'EEEE, MMM d, yyyy')}</p>
                    <p className="text-green-600">{occupancy.available} rooms available</p>
                    <p className="text-orange-600">{occupancy.occupied} rooms occupied</p>
                    <p className="text-muted-foreground">{occupancy.percentage}% occupancy</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        
        {/* Summary for current month */}
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-muted-foreground">Total Rooms</p>
              <p className="text-lg font-bold">{totalRooms}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Active Bookings</p>
              <p className="text-lg font-bold">
                {bookings.filter(b => ['confirmed', 'checked_in'].includes(b.status)).length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Avg Occupancy</p>
              <p className="text-lg font-bold">
                {totalRooms > 0 
                  ? Math.round(
                      eachDayOfInterval({ start: monthStart, end: monthEnd })
                        .map(d => getOccupancyForDay(d).percentage)
                        .reduce((a, b) => a + b, 0) / 
                      eachDayOfInterval({ start: monthStart, end: monthEnd }).length
                    )
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
