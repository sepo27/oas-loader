export interface LooseObject {
  [key: string]: any
}

export interface OasLoaderOptions {
  paths?: boolean,
  pathsGlob?: string,

  schemas?: boolean,
  schemasGlob?: string,

  requests?: boolean,
  requestsGlob?: string,

  responses?: boolean,
  responsesGlob?: string,

  infoVersionFromPackageJson?: string,
}
