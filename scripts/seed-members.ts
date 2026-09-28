import { createClient } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'
import * as dotenv from 'dotenv'
import path from 'path'

// Load .env.local if present, else .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (process.env.NODE_ENV === 'production') {
  console.error('Cannot run seed script in production')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
})

async function seed() {
  console.log('Seeding 4,000 members...')
  
  // Get branches to assign them randomly
  const { data: branches, error: branchError } = await supabase.from('family_branches').select('id')
  if (branchError || !branches?.length) {
    console.error('Failed to fetch branches. Did you run the main seed.sql?', branchError)
    process.exit(1)
  }

  // We want to be idempotent. Check if we already have 4000 profiles.
  const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
  if (count && count >= 4000) {
    console.log(`Already have ${count} profiles, skipping seed.`)
    return
  }

  const batchSize = 50
  const totalToCreate = 4000 - (count || 0)
  const numBatches = Math.ceil(totalToCreate / batchSize)

  let createdCount = 0

  for (let i = 0; i < numBatches; i++) {
    const promises = []
    const batchCurrentSize = Math.min(batchSize, totalToCreate - createdCount)
    
    for (let j = 0; j < batchCurrentSize; j++) {
      const email = faker.internet.email().toLowerCase()
      const fullName = faker.person.fullName()
      const city = faker.location.city()
      
      promises.push(
        supabase.auth.admin.createUser({
          email,
          password: 'password123',
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            avatar_url: faker.image.avatar(),
          }
        }).then(async ({ data, error }) => {
          if (error) {
            console.error('Error creating user:', error.message)
            return
          }
          
          if (data.user) {
            // The handle_new_user trigger creates the profile, but we want to fill the faker data (city, generation, branch, status)
            const branch = branches?.[Math.floor(Math.random() * (branches?.length || 1))]
            const branchId = branch?.id
            const generation = faker.number.int({ min: 1, max: 4 })
            
            await supabase.from('profiles').update({
              city,
              generation,
              branch_id: branchId,
              status: 'active', // Set them active for directory search
              show_email: faker.datatype.boolean(),
              show_phone: faker.datatype.boolean(),
              phone: faker.phone.number(),
              birthday: faker.date.birthdate().toISOString().split('T')[0],
              country: faker.location.country(),
            }).eq('id', data.user.id)
          }
        })
      )
    }

    await Promise.all(promises)
    createdCount += batchCurrentSize
    console.log(`Created ${createdCount}/${totalToCreate} users...`)
  }
  
  console.log('Finished seeding members.')
}

seed().catch(console.error)
