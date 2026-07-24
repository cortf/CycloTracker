// us-atlas ships TopoJSON files without types. Treat them as opaque topologies
// (also avoids tsc inferring a giant literal type from the 114KB JSON).
declare module "us-atlas/*.json" {
  const topology: unknown;
  export default topology;
}
