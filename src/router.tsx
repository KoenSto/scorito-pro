import { createHashRouter } from 'react-router-dom'
import MainLayout from './layout/MainLayout'
import Dashboard from './pages/Dashboard'
import Team from './pages/Team'
import Riders from './pages/Riders'
import Stages from './pages/Stages'
import Optimizer from './pages/Optimizer'
import Coach from './pages/Coach'
import Settings from './pages/Settings'

export const router = createHashRouter([
  {
    element: <MainLayout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/team', element: <Team /> },
      { path: '/riders', element: <Riders /> },
      { path: '/stages', element: <Stages /> },
      { path: '/optimizer', element: <Optimizer /> },
      { path: '/coach', element: <Coach /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
])
