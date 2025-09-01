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

      // Extract cookies and request verification token from response
      const setCookieHeader = loginPageResponse.headers['set-cookie']
      if (setCookieHeader) {
        this.cookies = setCookieHeader.map((cookie: string) => cookie.split(';')[0]).join('; ')
      }

      // Extract __RequestVerificationToken from the HTML
      const tokenMatch = loginPageResponse.data.match(/__RequestVerificationToken['"]\s*value=['"]([^'"]+)['"]/);
      const verificationToken = tokenMatch ? tokenMatch[1] : '';

      console.log('Got verification token:', verificationToken ? 'Yes' : 'No');

      // Prepare login data
      const loginData = {
        Username: credentials.username,
        Password: credentials.password,
        LoginType: 'Normal',
        IsWebRequest: 'true',
        IsValidateMobile: '',
        __RequestVerificationToken: verificationToken
      };

      // Convert to form data
      const params = new URLSearchParams();
      Object.entries(loginData).forEach(([key, value]) => {
        params.append(key, value);
      });

      // Attempt to login using the actual API endpoint
      const loginResponse = await axios.post(
        'https://app.factohr.com/API/ACL/ValidateLoginCreadentials',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': this.cookies,
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': `${this.baseURL}/Security/Login`,
            'Origin': 'https://app.factohr.com',
          },
          withCredentials: true,
          validateStatus: (status) => status >= 200 && status < 500,
        }
      )

      // Check if login was successful
      if (loginResponse.status === 200 && loginResponse.data?.Status === 'Success') {
        // Update cookies
        const newCookies = loginResponse.headers['set-cookie']
        if (newCookies) {
          this.cookies = newCookies.map((cookie: string) => cookie.split(';')[0]).join('; ')
        }
        
        console.log('Login successful for user:', credentials.username);
        return true
      }

      console.log('Login failed:', loginResponse.data?.Message || 'Unknown error');
      return false
    } catch (error: any) {
      console.error('FactoHR login error:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      })
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
  factohrPassword: string,
  action: 'punchIn' | 'punchOut'
): Promise<AttendanceResult> {
  try {
    const service = new FactoHRService()
    
    console.log('Attempting to login to FactoHR for user:', factohrUsername)
    
    // Login to FactoHR
    const loginSuccess = await service.login({
      username: factohrUsername,
      password: factohrPassword, // Now expects the actual password, not hashed
    })

    if (!loginSuccess) {
      return {
        success: false,
        message: 'Failed to login to FactoHR. Please check your credentials.',
      }
    }

    console.log('Login successful, marking attendance:', action)

    // Mark attendance
    if (action === 'punchIn') {
      return service.markPunchIn()
    } else {
      return service.markPunchOut()
    }
  } catch (error: any) {
    console.error('Process attendance error:', error)
    return {
      success: false,
      message: `Error: ${error.message || 'Unknown error occurred'}`,
    }
  }
}