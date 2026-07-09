import { createHashRouter } from 'react-router-dom'
import { createElement as h } from 'react'
import MainLayout from './layout/MainLayout'
import Dashboard from './pages/Dashboard'
import Team from './pages/Team'
import Riders from './pages/Riders'
import Stages from './pages/Stages'
import Results from './pages/Results'
import Optimizer from './pages/Optimizer'
import Coach from './pages/Coach'
import Favourites from './pages/Favourites'
import WinProbability from './pages/WinProbability'
import Settings from './pages/Settings'

export const router = createHashRouter([
  {
        element: h(MainLayout),
        children: [
          { path: '/', element: h(Dashboard) },
          { path: '/team', element: h(Team) },
          { path: '/riders', element: h(Riders) },
          { path: '/stages', element: h(Stages) },
          { path: '/results', element: h(Results) },
          { path: '/optimizer', element: h(Optimizer) },
          { path: '/coach', element: h(Coach) },
          { path: '/favourites', element: h(Favourites) },
          { path: '/winprobability', element: h(WinProbability) },
          { path: '/settings', element: h(Settings) },
              ],
  },
  ])
