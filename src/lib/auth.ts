import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

// Validate required environment variables at startup
if (!process.env.NEXTAUTH_SECRET) {
  console.error('⚠️ ERROR: NEXTAUTH_SECRET is not set in .env file!')
}

if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
  console.error('⚠️ ERROR: ADMIN_USERNAME or ADMIN_PASSWORD is not set in .env file!')
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'admin' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          console.log('Missing credentials')
          return null
        }

        // Get admin credentials from environment variables
        const adminUsername = process.env.ADMIN_USERNAME || 'admin'
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

        // Validate credentials
        if (credentials.username === adminUsername && credentials.password === adminPassword) {
          console.log('✅ Admin authenticated:', credentials.username)
          return {
            id: '1',
            name: 'Admin',
            username: credentials.username,
          }
        }

        console.log('Invalid credentials for user:', credentials.username)
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
}
