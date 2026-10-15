import React from 'react';
import { History, ArrowDownRight, ArrowUpRight, Clock, MapPin } from 'lucide-react';
import { TodayAttendanceItem } from '../../../api/attendanceApi';

interface AttendanceActivityFeedProps {
  activity: TodayAttendanceItem[];
  isLoading: boolean;
}

export const AttendanceActivityFeed: React.FC<AttendanceActivityFeedProps> = ({
  activity,
  isLoading,
}) => {
  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-sky-400" />
            Today's Attendance Activity
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Chronological audit stream of facility check-ins and check-outs today.
          </p>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {activity.length} records
        </span>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-xs text-slate-400">Loading activity feed...</div>
      ) : activity.length === 0 ? (
        <div className="border border-dashed border-slate-800/80 rounded-lg p-8 text-center text-xs text-slate-500">
          No attendance recorded today.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {activity.map((item) => {
            const isCompleted = item.status === 'completed';
            return (
              <div
                key={item.id}
                className="p-3 bg-[#111622]/60 border border-slate-800/80 rounded-lg flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                      isCompleted
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {isCompleted ? (
                      <ArrowUpRight className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0 truncate">
                    <p className="text-slate-200 font-medium truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>In {formatTime(item.checkInTime)}</span>
                      {isCompleted && item.checkOutTime && (
                        <>
                          <span>•</span>
                          <span>Out {formatTime(item.checkOutTime)}</span>
                          {item.durationMinutes !== null && (
                            <span className="text-slate-400">({item.durationMinutes}m)</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.locationName && (
                    <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {item.locationName}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                      isCompleted
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {isCompleted ? 'Completed' : 'Active Inside'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
