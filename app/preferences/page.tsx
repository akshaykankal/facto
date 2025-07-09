'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PreferencesForm {
  punchInTime: string
  punchOutTime: string
  randomMinutes: number
  workingDays: number[]
  leaveDates: string[]
}

export default function Preferences() {
  const router = useRouter()
  const [formData, setFormData] = useState<PreferencesForm>({
    punchInTime: '09:00',
    punchOutTime: '18:00',
    randomMinutes: 15,
    workingDays: [1, 2, 3, 4, 5],
    leaveDates: [],
  })
  const [newLeaveDate, setNewLeaveDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/user/preferences', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token')
          router.push('/login')
        }
        return
      }

      const data = await response.json()
      setFormData({
        ...data.preferences,
        leaveDates: data.preferences.leaveDates.map((date: string) => 
          new Date(date).toISOString().split('T')[0]
        ),
      })
    } catch (error) {
      console.error('Failed to fetch preferences:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to update preferences')
      }

      setSuccess('Preferences updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleWorkingDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day].sort(),
    }))
  }

  const addLeaveDate = () => {
    if (newLeaveDate && !formData.leaveDates.includes(newLeaveDate)) {
      setFormData(prev => ({
        ...prev,
        leaveDates: [...prev.leaveDates, newLeaveDate].sort(),
      }))
      setNewLeaveDate('')
    }
  }

  const removeLeaveDate = (date: string) => {
    setFormData(prev => ({
      ...prev,
      leaveDates: prev.leaveDates.filter(d => d !== date),
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Preferences</h1>
            </div>
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
            <div>
              <label htmlFor="punchInTime" className="block text-sm font-medium text-gray-700">
                Punch In Time
              </label>
              <input
                type="time"
                id="punchInTime"
                value={formData.punchInTime}
                onChange={(e) => setFormData({ ...formData, punchInTime: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="punchOutTime" className="block text-sm font-medium text-gray-700">
                Punch Out Time
              </label>
              <input
                type="time"
                id="punchOutTime"
                value={formData.punchOutTime}
                onChange={(e) => setFormData({ ...formData, punchOutTime: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="randomMinutes" className="block text-sm font-medium text-gray-700">
                Random Minutes Range (0-25)
              </label>
              <input
                type="number"
                id="randomMinutes"
                min="0"
                max="25"
                value={formData.randomMinutes}
                onChange={(e) => setFormData({ ...formData, randomMinutes: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Attendance will be marked randomly within ±{formData.randomMinutes} minutes of set time
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Working Days</label>
              <div className="mt-2 space-y-2">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                  <label key={index} className="inline-flex items-center mr-4">
                    <input
                      type="checkbox"
                      checked={formData.workingDays.includes(index)}
                      onChange={() => toggleWorkingDay(index)}
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Leave Dates</label>
              <div className="mt-2 flex space-x-2">
                <input
                  type="date"
                  value={newLeaveDate}
                  onChange={(e) => setNewLeaveDate(e.target.value)}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={addLeaveDate}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {formData.leaveDates.map((date) => (
                  <div key={date} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                    <span className="text-sm">{new Date(date).toLocaleDateString()}</span>
                    <button
                      type="button"
                      onClick={() => removeLeaveDate(date)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-800">{success}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}