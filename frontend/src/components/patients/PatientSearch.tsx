'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { searchPatients, type ApiPatientSearchResult } from '@/services/patients.service';
import { cn } from '@/lib/utils';

interface PatientSearchProps {
  value: ApiPatientSearchResult | null;
  onChange: (patient: ApiPatientSearchResult | null) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

export function PatientSearch({
  value,
  onChange,
  placeholder = 'Search patient by name or MRN',
  disabled,
  label,
}: PatientSearchProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState(value?.name ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(value?.name ?? '');

  useEffect(() => {
    setSearchText(value?.name ?? '');
  }, [value?.id, value?.name]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchText.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['patient-search', debouncedSearch],
    queryFn: () => searchPatients({ q: debouncedSearch || undefined, limit: 20 }),
    enabled: !disabled && (open || debouncedSearch.length > 0),
  });

  const visibleResults = useMemo(() => {
    if (!debouncedSearch) {
      return results.slice(0, 10);
    }
    return results;
  }, [debouncedSearch, results]);

  function selectPatient(patient: ApiPatientSearchResult) {
    onChange(patient);
    setSearchText(patient.name);
    setOpen(false);
  }

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      )}
      <div className="relative group/search">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" />
        <input
          value={searchText}
          onChange={(e) => {
            const nextValue = e.target.value;
            setSearchText(nextValue);
            setOpen(true);
            if (value && nextValue.trim() !== (value.name ?? '').trim()) {
              onChange(null);
            }
            if (!nextValue.trim() && value) {
              onChange(null);
            }
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full rounded-2xl border bg-white/50 dark:bg-slate-900/40 pl-11 pr-11 py-2 h-11 text-sm text-slate-900 dark:text-white placeholder:text-slate-400/60 transition-all",
            "border-slate-200 dark:border-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50",
            "disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-white/5 disabled:cursor-not-allowed"
          )}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setSearchText('');
              setOpen(true);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {open && !disabled && (
          <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="px-4 py-6 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  Searching patients…
                </div>
              ) : visibleResults.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-slate-500 font-medium">No patients found.</div>
              ) : (
                <div className="p-2 space-y-1">
                  {visibleResults.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => selectPatient(patient)}
                      className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group/item"
                    >
                      <p className="text-sm font-bold text-slate-900 dark:text-white group-hover/item:text-blue-500 transition-colors">{patient.name}</p>
                      <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-slate-500/70">
                        {patient.mrn ? `MRN: ${patient.mrn}` : `ID: ${patient.id.slice(0, 8)}`}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
