/* eslint-disable */

// @ts-nocheck

// Generated route tree checked in so TypeScript can typecheck Server Routes before dev/build
// regenerates it. TanStack Start also regenerates this file from src/routes.

import { Route as rootRouteImport } from './routes/__root'
import { Route as IndexRouteImport } from './routes/index'
import { Route as ApiHiveBackgroundRouteImport } from './routes/api/hive/background'
import { Route as ApiHiveSearchRouteImport } from './routes/api/hive/search'

const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)

const ApiHiveBackgroundRoute = ApiHiveBackgroundRouteImport.update({
  id: '/api/hive/background',
  path: '/api/hive/background',
  getParentRoute: () => rootRouteImport,
} as any)

const ApiHiveSearchRoute = ApiHiveSearchRouteImport.update({
  id: '/api/hive/search',
  path: '/api/hive/search',
  getParentRoute: () => rootRouteImport,
} as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/api/hive/background': typeof ApiHiveBackgroundRoute
  '/api/hive/search': typeof ApiHiveSearchRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/api/hive/background': typeof ApiHiveBackgroundRoute
  '/api/hive/search': typeof ApiHiveSearchRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/api/hive/background': typeof ApiHiveBackgroundRoute
  '/api/hive/search': typeof ApiHiveSearchRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/api/hive/background' | '/api/hive/search'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/api/hive/background' | '/api/hive/search'
  id: '__root__' | '/' | '/api/hive/background' | '/api/hive/search'
  fileRoutesById: FileRoutesById
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/api/hive/background': {
      id: '/api/hive/background'
      path: '/api/hive/background'
      fullPath: '/api/hive/background'
      preLoaderRoute: typeof ApiHiveBackgroundRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/api/hive/search': {
      id: '/api/hive/search'
      path: '/api/hive/search'
      fullPath: '/api/hive/search'
      preLoaderRoute: typeof ApiHiveSearchRouteImport
      parentRoute: typeof rootRouteImport
    }
  }
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  ApiHiveBackgroundRoute: typeof ApiHiveBackgroundRoute
  ApiHiveSearchRoute: typeof ApiHiveSearchRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  ApiHiveBackgroundRoute: ApiHiveBackgroundRoute,
  ApiHiveSearchRoute: ApiHiveSearchRoute,
}

export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

import type { getRouter } from './router.tsx'
import type { createStart } from '@tanstack/react-start'
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true
    router: Awaited<ReturnType<typeof getRouter>>
  }
}
