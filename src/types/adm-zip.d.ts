declare module "adm-zip" {
  interface ZipEntryHeader {
    size: number;
  }

  interface IZipEntry {
    entryName: string;
    isDirectory: boolean;
    header: ZipEntryHeader;
    getData(): Buffer;
  }

  class AdmZip {
    constructor(data?: string | Buffer, options?: { readEntries?: boolean });
    getEntries(): IZipEntry[];
    addFile(entryPath: string, data: Buffer, comment?: string, attr?: number): void;
    toBuffer(): Buffer;
  }

  export default AdmZip;
}
