
export type AuthMethods = "oauth" | "pat";


declare global {
  interface Window {
    electronAPI: any
  }
}
