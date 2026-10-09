const MAX_PDF_PAGES = 30;
const MAX_EXTRACTED_TEXT_BYTES = 200_000;

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const loadingTask = pdfjs.getDocument({
    data: await file.arrayBuffer(),
  });

  try {
    const pdf = await loadingTask.promise;
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(`Please upload a PDF with ${MAX_PDF_PAGES} pages or fewer.`);
    }

    const pageText: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pageText.push(
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .filter(Boolean)
          .join(" ")
      );
    }

    const text = pageText.join("\n").replace(/\s+/g, " ").trim();
    if (new TextEncoder().encode(text).byteLength > MAX_EXTRACTED_TEXT_BYTES) {
      throw new Error("This PDF contains too much text. Please upload a shorter resume.");
    }
    if (text.length < 40) {
      throw new Error(
        "We couldn’t find selectable text in this PDF. Scanned/image-only resumes need OCR, which is not enabled."
      );
    }

    return text;
  } finally {
    await loadingTask.destroy();
  }
}
