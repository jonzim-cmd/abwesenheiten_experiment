// Konfiguration für die Basis-URL der Anwendung
// Liest die URL aus der Umgebungsvariable oder verwendet einen Fallback
export const config = {
  // Im Development ist die baseUrl '/', in Production /abwesenheiten/
  baseUrl: import.meta.env.VITE_BASE_URL || import.meta.env.BASE || import.meta.env.PUBLIC_URL || '/',

  // Helper Funktion um Pfade korrekt zu erstellen
  getAssetPath: (path: string) => {
    // Ensure base URL ends with trailing slash
    const base = config.baseUrl.endsWith('/') ? config.baseUrl : `${config.baseUrl}/`;
    // Remove leading slash from path if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    // Combine base and path
    return `${base}${cleanPath}`;
  }
};

// Export zusätzliche Asset-Pfad Funktionen
export const getImagePath = (imageName: string) => config.getAssetPath(`assets/images/${imageName}`);
export const getStylePath = (styleName: string) => config.getAssetPath(`assets/styles/${styleName}`);
export const getScriptPath = (scriptName: string) => config.getAssetPath(`assets/scripts/${scriptName}`);