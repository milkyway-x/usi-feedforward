import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Client-side SHA-256 hashing ────────────────────────────────────────────
// Used to hash student IDs and names before they ever leave the browser.
// The raw values are never sent to the server or stored anywhere.
export async function sha256(text) {
  const normalized = text.toUpperCase().trim()
  const encoded = new TextEncoder().encode(normalized)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Hash a student row for roster import (called in AdminRoster page)
export async function hashStudentRow(studentId, fullName) {
  const [idHash, nameHash] = await Promise.all([
    sha256(studentId),
    sha256(fullName),
  ])
  return { idHash, nameHash }
}

// Rating scale interpretation
export const getRatingLabel = (rating) => {
  if (rating >= 1.0 && rating <= 2.0) return { label: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-100' }
  if (rating >= 2.1 && rating <= 2.9) return { label: 'Satisfactory', color: 'text-yellow-600', bg: 'bg-yellow-100' }
  if (rating >= 3.0 && rating <= 3.5) return { label: 'Very Satisfactory', color: 'text-blue-600', bg: 'bg-blue-100' }
  if (rating >= 3.6 && rating <= 4.0) return { label: 'Excellent', color: 'text-forest-700', bg: 'bg-forest-100' }
  return { label: 'N/A', color: 'text-gray-500', bg: 'bg-gray-100' }
}

export const FEEDBACK_QUESTIONS = [
  {
    id: 'q1_greet',
    label: 'Greet clients (students, parents, co-employees, administrators) in a respectful and welcoming manner.'
  },
  {
    id: 'q2_listen',
    label: 'Listen attentively to understand concerns before responding.'
  },
  {
    id: 'q3_communicate',
    label: 'Communicate clearly and professionally, even in stressful situations.'
  },
  {
    id: 'q4_follow_through',
    label: 'Follow through on requests or direct people to the right office when needed.'
  },
  {
    id: 'q5_dignity',
    label: 'Treats every person with dignity and respect, regardless of their situation or status.'
  },
  {
    id: 'q6_accuracy',
    label: 'Serves/work accurately and in a timely manner.'
  },
  {
    id: 'q7_overall',
    label: 'I am satisfied with the overall service provided.'
  }
]
