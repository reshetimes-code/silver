import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'

export default defineConfig({
  earlyAccess: true,
  datasource: {
    adapter: () =>
      new PrismaPg({
        connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
      }),
  },
})
