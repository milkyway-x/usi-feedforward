import { useState, useRef } from 'react'
import { supabase, sha256 } from '../lib/supabase'
import {
  Upload, FileSpreadsheet, CheckCircle, AlertCircle,
  Info, Loader, RefreshCw, Users, Hash
} from 'lucide-react'
import toast from 'react-hot-toast'
import Papa from 'papaparse'

// Expected CSV columns (case-insensitive, trimmed)
const REQUIRED_COLS  = ['student_id', 'full_name']
const OPTIONAL_COLS  = ['course_code', 'year_level']

const SAMPLE_CSV = `student_id,full_name,course_code,year_level
2024-00001,DELA CRUZ JUAN PEDRO,BSED,2
2024-00002,REYES MARIA SANTOS,BSBA,3
2024-00003,GARCIA JOSE RIZAL,BSN,1`

const currentSchoolYear = () => {
  const now  = new Date()
  const year = now.getFullYear()
  return now.getMonth() >= 5
    ? `${year}-${year + 1}`
    : `${year - 1}-${year}`
}

// ─── Processing state display ─────────────────────────────────────────────────
const ProgressBar = ({ value, label }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs text-gray-500">
      <span>{label}</span>
      <span>{value}%</span>
    </div>
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-gold-400 to-forest-600 rounded-full transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
)

export default function AdminRoster() {
  const fileRef = useRef(null)

  const [schoolYear,  setSchoolYear]  = useState(currentSchoolYear())
  const [parsed,      setParsed]      = useState(null)   // raw CSV rows
  const [errors,      setErrors]      = useState([])
  const [processing,  setProcessing]  = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [result,      setResult]      = useState(null)   // import result from RPC
  const [dragging,    setDragging]    = useState(false)

  // ── CSV parsing ─────────────────────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a .csv file.')
      return
    }

    setParsed(null)
    setErrors([])
    setResult(null)

    Papa.parse(file, {
      header:           true,
      skipEmptyLines:   true,
      transformHeader:  h => h.toLowerCase().trim().replace(/\s+/g, '_'),
      complete: ({ data, errors: parseErrors }) => {
        if (parseErrors.length) {
          setErrors(parseErrors.map(e => `Row ${e.row}: ${e.message}`))
          return
        }

        const rowErrors = []
        const valid = data.filter((row, i) => {
          const missing = REQUIRED_COLS.filter(c => !row[c]?.trim())
          if (missing.length) {
            rowErrors.push(`Row ${i + 2}: missing ${missing.join(', ')}`)
            return false
          }
          return true
        })

        setErrors(rowErrors)
        setParsed(valid)

        if (valid.length === 0) {
          toast.error('No valid rows found in CSV.')
        } else {
          toast.success(`${valid.length} valid student rows parsed${rowErrors.length ? `, ${rowErrors.length} skipped` : ''}.`)
        }
      }
    })
  }

  // ── Import (hash then upload) ───────────────────────────────────────────────
  const handleImport = async () => {
    if (!parsed?.length) return
    setProcessing(true)
    setProgress(0)
    setResult(null)

    try {
      const BATCH = 200  // hash 200 rows at a time to keep UI responsive
      const hashed = []
      const idHashes = []

      for (let i = 0; i < parsed.length; i += BATCH) {
        const chunk = parsed.slice(i, i + BATCH)

        const chunkHashed = await Promise.all(
          chunk.map(async row => {
            const [idHash, nameHash] = await Promise.all([
              sha256(row.student_id),
              sha256(row.full_name),
            ])
            idHashes.push(idHash)
            return {
              id_hash:     idHash,
              name_hash:   nameHash,
              full_name:   row.full_name.toUpperCase().trim(),
              course_code: row.course_code?.toUpperCase().trim() || null,
              year_level:  row.year_level ? parseInt(row.year_level, 10) : null,
            }
          })
        )

        hashed.push(...chunkHashed)
        setProgress(Math.round(((i + BATCH) / parsed.length) * 80))
        // yield to UI between batches
        await new Promise(r => setTimeout(r, 0))
      }

      setProgress(85)

      // Single RPC call — all rows in one transaction
      const { data, error } = await supabase.rpc('import_student_roster', {
        p_school_year: schoolYear,
        p_students:    JSON.stringify({ id_hashes: idHashes, rows: hashed }),
      })

      setProgress(100)

      if (error) throw error

      setResult(data)
      toast.success(`Import complete — ${data.upserted} students synced.`)
    } catch (err) {
      toast.error('Import failed: ' + err.message)
      console.error(err)
    }

    setProcessing(false)
  }

  // ── Drag-and-drop ───────────────────────────────────────────────────────────
  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = 'usi-student-roster-sample.csv'
    a.click()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold text-forest-900">Student Roster</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Import the Registrar's enrollment CSV each semester. Raw IDs are hashed in your browser — never stored on the server.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex gap-3">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 space-y-2">
          <p className="font-semibold">How the masterlist protects privacy</p>
          <p>When a student submits feedback, they enter their Student ID and full name. Both are hashed <strong>in their browser</strong> using SHA-256. Only the hashes are sent to the server and matched against this roster — the raw values are never transmitted or stored.</p>
          <p>A dishonest employee trying to impersonate a student would need to know both a valid student ID <em>and</em> the exact matching full name — practically impossible without access to the Registrar's records.</p>
        </div>
      </div>

      {/* School year + upload */}
      <div className="card space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">School Year</label>
          <input
            type="text"
            value={schoolYear}
            onChange={e => setSchoolYear(e.target.value)}
            className="input-field max-w-xs font-mono"
            placeholder="2024-2025"
            pattern="\d{4}-\d{4}"
          />
          <p className="text-xs text-gray-400 mt-1">
            Students absent from this import will be marked as unenrolled and cannot submit feedback.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`
            border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
            ${dragging
              ? 'border-gold-400 bg-gold-50'
              : 'border-gray-200 hover:border-gold-300 hover:bg-gold-50/30'
            }
          `}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => handleFile(e.target.files[0])}
          />
          <FileSpreadsheet size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-600">Drop CSV here or click to browse</p>
          <p className="text-gray-400 text-sm mt-1">
            Required columns: <code className="bg-gray-100 px-1 rounded">student_id</code>, <code className="bg-gray-100 px-1 rounded">full_name</code>
          </p>
          <p className="text-gray-400 text-xs mt-0.5">
            Optional: <code className="bg-gray-100 px-1 rounded">course_code</code>, <code className="bg-gray-100 px-1 rounded">year_level</code>
          </p>
        </div>

        <div className="flex justify-between items-center">
          <button onClick={downloadSample} className="text-sm text-forest-600 hover:text-forest-700 font-medium flex items-center gap-1.5">
            <FileSpreadsheet size={15} /> Download sample CSV
          </button>
        </div>
      </div>

      {/* Parse results */}
      {parsed && (
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-forest-100 rounded-xl flex items-center justify-center">
              <Users size={18} className="text-forest-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">{parsed.length.toLocaleString()} valid rows ready to import</p>
              <p className="text-gray-400 text-xs">School year: {schoolYear}</p>
            </div>
          </div>

          {/* Error rows */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1 max-h-40 overflow-y-auto">
              <p className="text-red-700 text-sm font-semibold">{errors.length} rows will be skipped:</p>
              {errors.map((e, i) => (
                <p key={i} className="text-red-600 text-xs font-mono">{e}</p>
              ))}
            </div>
          )}

          {/* Preview table */}
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left text-gray-500 font-semibold">Full Name</th>
                  <th className="p-2 text-left text-gray-500 font-semibold">Course</th>
                  <th className="p-2 text-left text-gray-500 font-semibold">Year</th>
                  <th className="p-2 text-left text-gray-500 font-semibold">ID Hash Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {parsed.slice(0, 8).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="p-2 font-medium text-gray-700">{row.full_name}</td>
                    <td className="p-2 text-gray-500">{row.course_code || '—'}</td>
                    <td className="p-2 text-gray-500">{row.year_level || '—'}</td>
                    <td className="p-2 text-gray-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Hash size={10} />
                        <span className="opacity-50">[hashed on upload]</span>
                      </span>
                    </td>
                  </tr>
                ))}
                {parsed.length > 8 && (
                  <tr>
                    <td colSpan={4} className="p-2 text-center text-gray-400 text-xs">
                      … and {parsed.length - 8} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Import button */}
          {!result && (
            <button
              onClick={handleImport}
              disabled={processing}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              {processing ? (
                <><Loader size={16} className="animate-spin" /> Hashing &amp; Importing...</>
              ) : (
                <><Upload size={16} /> Import {parsed.length.toLocaleString()} Students</>
              )}
            </button>
          )}

          {/* Progress */}
          {processing && (
            <ProgressBar value={progress} label="Hashing IDs client-side and uploading…" />
          )}
        </div>
      )}

      {/* Import result */}
      {result && (
        <div className="bg-forest-50 border border-forest-200 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} className="text-forest-600" />
            <p className="font-display font-bold text-xl text-forest-900">Import Successful</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div className="bg-white rounded-xl p-4 text-center border border-forest-100">
              <p className="font-display font-bold text-3xl text-forest-700">{result.upserted}</p>
              <p className="text-forest-500 text-xs mt-1">Students synced</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border border-forest-100">
              <p className="font-display font-bold text-3xl text-amber-600">{result.deactivated}</p>
              <p className="text-amber-500 text-xs mt-1">Marked unenrolled</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border border-forest-100">
              <p className="font-display font-bold text-xl text-gray-700 mt-1">{result.school_year}</p>
              <p className="text-gray-400 text-xs mt-1">School year</p>
            </div>
          </div>
          <p className="text-forest-600 text-sm">
            Students not in this batch have been marked unenrolled and will see an error if they try to submit feedback. Run another import at the start of each semester.
          </p>
          <button
            onClick={() => { setParsed(null); setResult(null); setErrors([]) }}
            className="flex items-center gap-2 text-sm text-forest-600 hover:text-forest-700 font-semibold"
          >
            <RefreshCw size={14} /> Import another file
          </button>
        </div>
      )}
    </div>
  )
}
