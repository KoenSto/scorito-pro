export type RiderRole = 'GC' | 'Sprint' | 'Klimmer' | 'Klassiek' | 'Tijdrit' | 'Knecht'

export interface Rider {
  id: number
  name: string
  team: string
  role: RiderRole
  country: string
  age: number
  price: number
}

export interface Team {
  id: string
  name: string
  riderCount: number
}

export type StageType = 'Vlak' | 'Heuvel' | 'Berg' | 'Tijdrit' | 'Ploegentijdrit'

export interface Stage {
  id: number
  day: string
  from: string
  to: string
  distanceKm: number
  type: StageType
}

export interface Rules {
  budget: number
  teamSize: number
  maxPerTeam: number
}

export interface RiderRating {
  riderId: number
  gc: number
  sprint: number
  mountain: number
  timeTrial: number
  overall: number
  expectedPoints: number
  value: number
  captain: number
  risk: number
}
