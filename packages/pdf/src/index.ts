import pdfParse from 'pdf-parse';

export interface ExtractedPage {
  pageNumber: number;
  content: string;
}

export interface ExtractedPDF {
  pageCount: number;
  pages: ExtractedPage[];
}

export interface ChunkOptions {
  targetTokens?: number;
  overlapTokens?: number;
}

export interface PDFChunkResult {
  pageNumber: number;
  sectionTitle?: string | null;
  content: string;
  tokenCount: number;
}

export async function extractPagesFromPDFBuffer(buffer: Buffer): Promise<ExtractedPDF> {
  const pages: ExtractedPage[] = [];

  const options = {
    pagerender: (pageData: any) => {
      return pageData.getTextContent().then((textContent: any) => {
        let lastY: number | null = null;
        let text = '';
        for (const item of textContent.items) {
          if (lastY === null || Math.abs(lastY - item.transform[5]) > 5) {
            text += '\n' + item.str;
          } else {
            text += ' ' + item.str;
          }
          lastY = item.transform[5];
        }

        const pageNum = pageData.pageIndex + 1;
        pages.push({
          pageNumber: pageNum,
          content: text.trim(),
        });

        return text;
      });
    },
  };

  const parsed = await pdfParse(buffer, options);

  // Sort pages by page number to guarantee order
  pages.sort((a, b) => a.pageNumber - b.pageNumber);

  return {
    pageCount: parsed.numpages || pages.length,
    pages,
  };
}

export function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkPageContent(
  pageNumber: number,
  content: string,
  options: ChunkOptions = {}
): PDFChunkResult[] {
  const targetTokens = options.targetTokens ?? 600;
  const overlapTokens = options.overlapTokens ?? 100;
  const cleaned = cleanExtractedText(content);

  if (!cleaned) return [];

  const paragraphs = cleaned.split(/\n\n+/);
  const chunks: PDFChunkResult[] = [];

  let currentChunkText = '';
  let currentSection: string | null = null;

  for (const para of paragraphs) {
    if (para.length < 80 && !para.endsWith('.')) {
      currentSection = para.trim();
    }

    const projected = currentChunkText ? `${currentChunkText}\n\n${para}` : para;
    const tokens = estimateTokenCount(projected);

    if (tokens > targetTokens && currentChunkText.length > 0) {
      chunks.push({
        pageNumber,
        sectionTitle: currentSection,
        content: currentChunkText,
        tokenCount: estimateTokenCount(currentChunkText),
      });

      const words = currentChunkText.split(' ');
      const overlapWords = words.slice(-Math.floor(overlapTokens * 0.75)).join(' ');
      currentChunkText = `${overlapWords}\n\n${para}`;
    } else {
      currentChunkText = projected;
    }
  }

  if (currentChunkText.trim().length > 0) {
    chunks.push({
      pageNumber,
      sectionTitle: currentSection,
      content: currentChunkText,
      tokenCount: estimateTokenCount(currentChunkText),
    });
  }

  return chunks;
}
