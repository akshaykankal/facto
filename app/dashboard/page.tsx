'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserPreferences {
  punchInTime: string
  punchOutTime: string
  randomMinutes: number
  workingDays: number[]
  leaveDates: string[]
}

interface AttendanceLog {
  date: string
  punchIn: string | null
  punchOut: string | null
  status: 'success' | 'failed' | 'leave'
  message?: string
}

export default function Dashboard() {
  const router = useRouter()
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPreferences()
    fetchLogs()
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
      setPreferences(data.preferences)
    } catch (error) {
      console.error('Failed to fetch preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/user/logs', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    }
  }

  const handleManualAttendance = async (action: 'punchIn' | 'punchOut') => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert(`${action === 'punchIn' ? 'Punch In' : 'Punch Out'} successful!`)
        // Refresh logs
        fetchLogs()
      } else {
        alert(`Failed: ${data.message || data.error}`)
      }
    } catch (error) {
      console.error('Manual attendance error:', error)
      alert('An error occurred. Please try again.')
    }
  }

  const handleCheckScheduler = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/attendance/check', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      alert(`Scheduler Check: ${data.message}\nCurrent time: ${new Date(data.currentTime).toLocaleString()}`)
    } catch (error) {
      console.error('Scheduler check error:', error)
      alert('Failed to check scheduler')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    // Clear cookie
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    router.push('/login')
  }

  const getDayName = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[day]
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">FactoHR Automation Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/preferences"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Preferences
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Current Settings</h2>
              
              {preferences && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Punch In Time</p>
                    <p className="mt-1 text-sm text-gray-900">{preferences.punchInTime}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Punch Out Time</p>
                    <p className="mt-1 text-sm text-gray-900">{preferences.punchOutTime}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Random Minutes Range</p>
                    <p className="mt-1 text-sm text-gray-900">±{preferences.randomMinutes} minutes</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Working Days</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {preferences.workingDays.map(day => getDayName(day)).join(', ')}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Leave Dates</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {preferences.leaveDates.length > 0
                        ? preferences.leaveDates.map(date => new Date(date).toLocaleDateString()).join(', ')
                        : 'No leaves scheduled'}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="mt-6">
                <Link
                  href="/preferences"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Update Preferences
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Manual Attendance (For Testing)</h2>
              <p className="text-sm text-gray-600 mb-4">
                Test your FactoHR integration by manually punching in or out.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => handleManualAttendance('punchIn')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Test Punch In
                </button>
                <button
                  onClick={() => handleManualAttendance('punchOut')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Test Punch Out
                </button>
                <button
                  onClick={handleCheckScheduler}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Check Scheduler
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Attendance Logs</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Punch In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Punch Out
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.length > 0 ? (
                      logs.map((log, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(log.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.punchIn ? new Date(log.punchIn).toLocaleTimeString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.punchOut ? new Date(log.punchOut).toLocaleTimeString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              log.status === 'success' ? 'bg-green-100 text-green-800' :
                              log.status === 'leave' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                          No attendance logs yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}