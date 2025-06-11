import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    id: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string
  }
}
