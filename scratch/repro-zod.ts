import { listAppointmentsQuerySchema } from '../lib/zod-schemas/appointment'

const params = {
  page: '',
  limit: '',
}

const result = listAppointmentsQuerySchema.safeParse(params)
console.log('Result success:', result.success)
if (!result.success) {
  console.log('Errors:', JSON.stringify(result.error.issues, null, 2))
} else {
  console.log('Data:', JSON.stringify(result.data, null, 2))
}
