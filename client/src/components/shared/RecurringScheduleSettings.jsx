import { useState, useEffect } from 'react';
import { Calendar, Clock, Repeat, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import {
  recurringTypes,
  durationModes,
  youtubeWeekdayOptions,
  formatRecurringSchedule,
  formatDurationMode,
  validateRecurringSettings,
  getNextExecutionPreview
} from '@/lib/campaignUtils.js';

export function RecurringScheduleSettings({ 
  settings = {}, 
  onChange,
  disabled = false 
}) {
  const [localSettings, setLocalSettings] = useState({
    recurringEnabled: false,
    recurringType: 'once',
    recurringDays: [],
    recurringTime: '09:00',
    recurringDurationMode: 'fixed',
    recurringDurationMinutes: 60,
    recurringDurationMin: 30,
    recurringDurationMax: 120,
    recurringEndDate: '',
    recurringTimezone: 'Asia/Jakarta',
    ...settings
  });

  const [errors, setErrors] = useState([]);

  useEffect(() => {
    setLocalSettings(prev => ({ ...prev, ...settings }));
  }, [settings]);

  const handleChange = (field, value) => {
    const updated = { ...localSettings, [field]: value };
    setLocalSettings(updated);
    
    // Validate
    const validationErrors = validateRecurringSettings(updated);
    setErrors(validationErrors);
    
    // Notify parent
    if (onChange) {
      onChange(updated, validationErrors.length === 0);
    }
  };

  const toggleDay = (day) => {
    const days = localSettings.recurringDays || [];
    const updated = days.includes(day) 
      ? days.filter(d => d !== day)
      : [...days, day];
    handleChange('recurringDays', updated);
  };

  return (
    <Card className="rounded-3xl border-slate-800 bg-slate-900/70 shadow-xl">
      <CardContent className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Repeat className="h-5 w-5 text-cyan-400" />
              Recurring Schedule
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Atur jadwal berulang untuk campaign otomatis
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={localSettings.recurringEnabled}
              onChange={(e) => handleChange('recurringEnabled', e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-2 focus:ring-cyan-500"
            />
            <span className="text-sm font-medium text-slate-300">Aktifkan</span>
          </label>
        </div>

        {localSettings.recurringEnabled && (
          <div className="space-y-6">
            {/* Recurring Type */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                <Calendar className="inline h-4 w-4 mr-2" />
                Tipe Jadwal
              </label>
              <div className="grid grid-cols-2 gap-3">
                {recurringTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleChange('recurringType', type.value)}
                    disabled={disabled}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      localSettings.recurringType === type.value
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-semibold">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Weekly Days Selection */}
            {localSettings.recurringType === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Pilih Hari
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {youtubeWeekdayOptions.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      disabled={disabled}
                      className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        (localSettings.recurringDays || []).includes(day)
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Execution Time */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                <Clock className="inline h-4 w-4 mr-2" />
                Waktu Eksekusi
              </label>
              <input
                type="time"
                value={localSettings.recurringTime}
                onChange={(e) => handleChange('recurringTime', e.target.value)}
                disabled={disabled}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-700 bg-slate-800 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Duration Mode */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Mode Durasi
              </label>
              <div className="space-y-3">
                {durationModes.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => handleChange('recurringDurationMode', mode.value)}
                    disabled={disabled}
                    className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                      localSettings.recurringDurationMode === mode.value
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-semibold">{mode.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Settings */}
            {localSettings.recurringDurationMode === 'fixed' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Durasi Tetap (menit)
                </label>
                <input
                  type="number"
                  min="1"
                  value={localSettings.recurringDurationMinutes}
                  onChange={(e) => handleChange('recurringDurationMinutes', parseInt(e.target.value))}
                  disabled={disabled}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-700 bg-slate-800 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            )}

            {localSettings.recurringDurationMode === 'random' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Durasi Min (menit)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={localSettings.recurringDurationMin}
                    onChange={(e) => handleChange('recurringDurationMin', parseInt(e.target.value))}
                    disabled={disabled}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-700 bg-slate-800 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Durasi Max (menit)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={localSettings.recurringDurationMax}
                    onChange={(e) => handleChange('recurringDurationMax', parseInt(e.target.value))}
                    disabled={disabled}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-700 bg-slate-800 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {localSettings.recurringDurationMode === 'pattern' && (
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700">
                <Info className="inline h-4 w-4 mr-2 text-cyan-400" />
                <span className="text-sm text-slate-300">
                  Pola durasi: 30, 60, 90, 120 menit (berulang secara otomatis)
                </span>
              </div>
            )}

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Tanggal Berakhir (Opsional)
              </label>
              <input
                type="date"
                value={localSettings.recurringEndDate}
                onChange={(e) => handleChange('recurringEndDate', e.target.value)}
                disabled={disabled}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-700 bg-slate-800 text-white focus:border-cyan-500 focus:outline-none"
              />
              <p className="text-xs text-slate-500 mt-2">
                Kosongkan untuk jadwal tanpa batas waktu
              </p>
            </div>

            {/* Preview */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
              <div className="text-sm font-medium text-cyan-300 mb-2">Preview Jadwal:</div>
              <div className="text-sm text-slate-300">
                {formatRecurringSchedule(
                  localSettings.recurringEnabled,
                  localSettings.recurringType,
                  localSettings.recurringTime,
                  localSettings.recurringDays
                )}
              </div>
              <div className="text-sm text-slate-400 mt-1">
                {formatDurationMode(
                  localSettings.recurringDurationMode,
                  localSettings.recurringDurationMinutes,
                  localSettings.recurringDurationMin,
                  localSettings.recurringDurationMax
                )}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {getNextExecutionPreview(
                  localSettings.recurringType,
                  localSettings.recurringTime,
                  localSettings.recurringDays
                )}
              </div>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="inline h-4 w-4 mr-2 text-red-400" />
                <span className="text-sm font-medium text-red-400">Validasi Error:</span>
                <ul className="mt-2 space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-300 ml-6">• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!localSettings.recurringEnabled && (
          <div className="text-center py-8 text-slate-500">
            <Repeat className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aktifkan recurring schedule untuk mengatur jadwal berulang</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
