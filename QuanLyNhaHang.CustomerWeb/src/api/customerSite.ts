import { apiRequest } from './client'

export type PublicRestaurant = {
  restaurantName: string
  address: string
  phoneNumber: string
  email?: string | null
  logoUrl?: string | null
  currency: string
  openingTime: string
  closingTime: string
  welcomeMessage?: string | null
}

export type PublicMenuCategory = {
  id: string
  name: string
  description?: string | null
  displayOrder: number
}

export type PublicMenuItem = {
  id: string
  menuCategoryId: string
  menuCategoryName: string
  name: string
  description?: string | null
  price: number
  imageUrl?: string | null
  isAvailable: boolean
}

export type PublicReservationTable = {
  id: string
  areaName: string
  name: string
  capacity: number
}

export type CustomerSiteBootstrap = {
  restaurant: PublicRestaurant | null
  menuCategories: PublicMenuCategory[]
  menuItems: PublicMenuItem[]
  reservationTables: PublicReservationTable[]
}

export type CustomerReservationInput = {
  restaurantTableId: string
  customerName: string
  phoneNumber: string
  email?: string | null
  numberOfGuests: number
  reservationTime: string
  note?: string | null
}

export type CustomerReservationResult = {
  id: string
  reservationCode: string
  restaurantTableName: string
  reservationTime: string
  status: string
}

export function getCustomerSiteBootstrap() {
  return apiRequest<CustomerSiteBootstrap>('/api/customer-site/bootstrap')
}

export async function createCustomerReservation(input: CustomerReservationInput) {
  const response = await apiRequest<{
    success: boolean
    message: string
    data: CustomerReservationResult
  }>('/api/customer-site/reservations', {
    method: 'POST',
    body: JSON.stringify(input),
  })

  return response
}
