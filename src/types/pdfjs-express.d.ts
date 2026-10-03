declare module '@pdftron/pdfjs-express' {
  type ViewerInstance = {
    UI: {
      dispose: () => void;
    };
  };

  type ViewerOptions = {
    path: string;
    initialDoc: string;
    licenseKey?: string;
  };

  export default function WebViewer(
    options: ViewerOptions,
    element: HTMLElement,
  ): Promise<ViewerInstance>;
}
