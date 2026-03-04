declare module "html-to-docx" {
  interface Options {
    title?: string;
    margin?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
  }
  export default function HTMLtoDOCX(
    htmlString: string,
    headerHTMLString: string | null,
    options?: Options,
  ): Promise<Buffer>;
}
