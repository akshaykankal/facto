# FactoHR Automation

An automated attendance management system for FactoHR that handles punch in/out based on user preferences.

## Features

- User registration and authentication
- Secure storage of FactoHR credentials
- Customizable punch in/out times with random minute variations
- Working days configuration
- Leave management
- Automatic attendance marking
- Attendance logs dashboard
- MongoDB integration for data persistence

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env.local`:
   ```
   MONGODB_URI=your_mongodb_connection_string
   DB_NAME=FACTOHR
   JWT_SECRET=your_jwt_secret
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment on Vercel

1. Push your code to a Git repository
2. Import the project to Vercel
3. Add the environment variables in Vercel dashboard
4. Deploy

## Usage

1. Sign up with your username and FactoHR credentials
2. Configure your preferences:
   - Punch in/out times
   - Random minute range (0-25 minutes)
   - Working days
   - Leave dates
3. The system will automatically mark attendance based on your preferences

## Security Notes

- All passwords are hashed using bcrypt
- JWT tokens are used for authentication
- FactoHR credentials are encrypted in the database
- Use strong passwords and keep your credentials secure