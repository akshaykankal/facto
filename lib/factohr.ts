import axios from 'axios'
import bcrypt from 'bcryptjs'

interface FactoHRCredentials {
  username: string
  password: string
}

interface AttendanceResult {
  success: boolean
  message: string
  timestamp?: Date
}

export class FactoHRService {
  private baseURL = 'https://app.factohr.com/broseindia'
  private cookies: string = ''

  async login(credentials: FactoHRCredentials): Promise<boolean> {
    try {
      // First, get the login page to obtain any necessary cookies/tokens
      const loginPageResponse = await axios.get(`${this.baseURL}/Security/Login`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        withCredentials: true,
      })

      // Extract cookies from response
      const setCookieHeader = loginPageResponse.headers['set-cookie']
      if (setCookieHeader) {
        this.cookies = setCookieHeader.map(cookie => cookie.split(';')[0]).join('; ')
      }

      // Attempt to login
      const loginResponse = await axios.post(
        `${this.baseURL}/Security/Login`,
        {
          Username: credentials.username,
          Password: credentials.password,
          RememberMe: false,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': this.cookies,
          },
          withCredentials: true,
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400,
        }
      )

      // Check if login was successful
      if (loginResponse.status === 302 || loginResponse.status === 200) {
        // Update cookies
        const newCookies = loginResponse.headers['set-cookie']
        if (newCookies) {
          this.cookies = newCookies.map(cookie => cookie.split(';')[0]).join('; ')
        }
        return true
      }

      return false
    } catch (error) {
      console.error('FactoHR login error:', error)
      return false
    }
  }

  async markAttendance(checkIn: boolean): Promise<AttendanceResult> {
    try {
      if (!this.cookies) {
        return {
          success: false,
          message: 'Not logged in to FactoHR',
        }
      }

      const timestamp = Date.now()
      const timezone = 'Asia/Calcutta'
      
      const response = await axios.get(
        `${this.baseURL}/API/Dashboard/SubmitAttendance1`,
        {
          params: {
            checkIn: checkIn.toString(),
            remarks: '',
            zone: timezone,
            singleInOutPunch: 'false',
            ishomepage: 'true',
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': this.cookies,
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest',
          },
          withCredentials: true,
        }
      )

      if (response.status === 200) {
        return {
          success: true,
          message: `Successfully marked ${checkIn ? 'punch in' : 'punch out'}`,
          timestamp: new Date(),
        }
      }

      return {
        success: false,
        message: 'Failed to mark attendance',
      }
    } catch (error: any) {
      console.error('FactoHR attendance error:', error)
      return {
        success: false,
        message: error.message || 'Failed to mark attendance',
      }
    }
  }

  async markPunchIn(): Promise<AttendanceResult> {
    return this.markAttendance(true)
  }

  async markPunchOut(): Promise<AttendanceResult> {
    return this.markAttendance(false)
  }
}

export async function processAttendance(
  factohrUsername: string,
  factohrPasswordHash: string,
  action: 'punchIn' | 'punchOut'
): Promise<AttendanceResult> {
  const service = new FactoHRService()
  
  // Login to FactoHR
  const loginSuccess = await service.login({
    username: factohrUsername,
    password: factohrPasswordHash, // Note: In production, this should be decrypted
  })

  if (!loginSuccess) {
    return {
      success: false,
      message: 'Failed to login to FactoHR',
    }
  }

  // Mark attendance
  if (action === 'punchIn') {
    return service.markPunchIn()
  } else {
    return service.markPunchOut()
  }
}