import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

// Validate required environment variables at startup
if (!process.env.NEXTAUTH_SECRET) {
  console.error('⚠️ ERROR: NEXTAUTH_SECRET is not set in .env file!')
}

if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
  console.error('⚠️ ERROR: ADMIN_USERNAME or ADMIN_PASSWORD is not set in .env file!')
}

// Validate admin credentials at startup
function validateAdminCredentials(): { username: string; password: string } {
  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD
  
  if (!username || !password) {
    // Fallback to environment variables with warning - NOT recommended for production
    console.warn('⚠️ WARNING: Using default admin credentials. Set ADMIN_USERNAME and ADMIN_PASSWORD in .env for security!')
    return {
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123'
    }
  }
  
  // Validate password strength
  if (password.length < 8) {
    console.warn('⚠️ WARNING: Admin password is too weak. Use at least 8 characters!')
  }
  
  return { username, password }
}

const adminCredentials = validateAdminCredentials()

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'admin' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // Validate input
        if (!credentials?.username || !credentials?.password) {
          console.log('Missing credentials')
          return null
        }

        // Sanitize inputs
        const sanitizedUsername = credentials.username.trim().toLowerCase()
        const sanitizedPassword = credentials.password
        
        // Validate credentials against environment variables
        if (sanitizedUsername === adminCredentials.username && sanitizedPassword === adminCredentials.password) {
          console.log('✅ Admin authenticated:', sanitizedUsername)
          return {
            id: '1',
            name: 'Admin',
            username: sanitizedUsername,
          }
        }

        console.log('Invalid credentials for user:', sanitizedUsername)
        return null
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/admin',
    error: '/admin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  // Add security enhancements
  trustHost: true,
}
