'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { searchPatients, type ApiPatientSearchResult } from '@/services/patients.service';

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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
          className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 py-2 h-9 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setSearchText('');
              setOpen(true);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {open && !disabled && (
          <div className="absolute z-40 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              {isLoading ? (
                <div className="px-3 py-3 text-sm text-slate-500">Searching patients…</div>
              ) : visibleResults.length === 0 ? (
                <div className="px-3 py-3 text-sm text-slate-500">No patients found.</div>
              ) : (
                visibleResults.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => selectPatient(patient)}
                    className="w-full px-3 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                  >
                    <p className="text-sm font-medium text-slate-900">{patient.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {patient.mrn ? `MRN: ${patient.mrn}` : patient.id}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
