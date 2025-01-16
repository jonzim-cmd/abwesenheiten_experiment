// Konfiguration für die Basis-URL der Anwendung
// Liest die URL aus der Umgebungsvariable oder verwendet einen Fallback
export const config = {
  // Im Development ist die baseUrl '/', in Production /abwesenheiten/
  baseUrl: import.meta.env.VITE_BASE_URL || import.meta.env.BASE || import.meta.env.PUBLIC_URL || '/',
  
  // Helper Funktion um Pfade korrekt zu erstellen
  getAssetPath: (path: string) => {
    const base = config.baseUrl.endsWith('/') ? config.baseUrl : `${config.baseUrl}/`;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${base}${cleanPath}`;
  }
};
