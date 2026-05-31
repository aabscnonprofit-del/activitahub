import { z } from 'zod'

export const activitySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
})

export const venueSchema = z.object({
  name: z.string().min(1, 'Venue name is required').max(200),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  capacity: z.coerce.number().int().positive().optional().or(z.literal('')),
  indoor_outdoor: z.enum(['indoor', 'outdoor', 'both']).optional(),
  notes: z.string().max(1000).optional(),
})

export const clientSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
})

export const calendarEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  notes: z.string().max(1000).optional(),
})

export const organizerProfileSchema = z.object({
  display_name: z.string().max(100).optional(),
  bio: z.string().max(2000).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  languages: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
})

export type ActivityFormData = z.infer<typeof activitySchema>
export type VenueFormData = z.infer<typeof venueSchema>
export type ClientFormData = z.infer<typeof clientSchema>
export type CalendarEventFormData = z.infer<typeof calendarEventSchema>
export type OrganizerProfileFormData = z.infer<typeof organizerProfileSchema>
