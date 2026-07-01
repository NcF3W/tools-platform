let rdkitPromise: Promise<any> | null = null;

export function loadRDKit(): Promise<any> {
  if (!rdkitPromise) {
    rdkitPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@rdkit/rdkit/dist/RDKit_minimal.js";
      script.onload = () => {
        const win = window as unknown as {
          initRDKitModule: (opts: { locateFile: () => string }) => Promise<any>;
        };
        win
          .initRDKitModule({ locateFile: () => "/RDKit_minimal.wasm" })
          .then(resolve)
          .catch(reject);
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }
  return rdkitPromise;
}
