import { Injectable, signal, computed } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface PdfFileState {
  file: File;
  name: string;
  size: number;
}

@Injectable({
  providedIn: 'root'
})
export class PdfSecurityService {

  // --- Core Signals (Zoneless) ---
  readonly currentFile = signal<PdfFileState | null>(null);
  readonly isLocked = signal(false);
  readonly isDecrypted = signal(false);
  readonly isProcessing = signal(false);
  readonly errorMessage = signal('');
  readonly pdfPreviewUrl = signal<string | null>(null);
  readonly currentPassword = signal<string>('');

  // The raw File object ready for upload (either the original unlocked, or the original after password verification)
  readonly uploadReadyFile = signal<File | null>(null);

  // --- Computed Convenience Signals ---
  readonly canAnalyze = computed(() => {
    const file = this.currentFile();
    const locked = this.isLocked();
    const decrypted = this.isDecrypted();
    // Allow analysis if: file exists AND (not locked, OR was locked but now decrypted)
    return !!file && (!locked || decrypted);
  });

  readonly fileStatus = computed<'idle' | 'checking' | 'unlocked' | 'locked' | 'decrypted' | 'error'>(() => {
    if (this.isProcessing()) return 'checking';
    if (this.errorMessage()) return 'error';
    if (!this.currentFile()) return 'idle';
    if (this.isLocked() && !this.isDecrypted()) return 'locked';
    if (this.isDecrypted()) return 'decrypted';
    return 'unlocked';
  });

  /**
   * Process an uploaded file. If it's a PDF, check for password protection.
   * If it's an image, just mark it as ready.
   */
  async processFile(file: File): Promise<void> {
    this.resetState();
    this.isProcessing.set(true);

    this.currentFile.set({
      file,
      name: file.name,
      size: file.size
    });

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      // Image file — no lock check needed
      this.uploadReadyFile.set(file);
      await this.generateImagePreview(file);
      this.isProcessing.set(false);
      return;
    }

    // PDF: check for password protection
    try {
      const arrayBuffer = await file.arrayBuffer();
      await this.checkPdfProtection(arrayBuffer);
    } catch (err) {
      console.error('[PdfSecurity] Unexpected error during PDF check:', err);
      this.errorMessage.set('Failed to read the PDF file.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Attempt to unlock a locked PDF with the given password.
   */
  async unlockWithPassword(password: string): Promise<boolean> {
    const fileState = this.currentFile();
    if (!fileState) return false;

    this.isProcessing.set(true);
    this.errorMessage.set('');

    try {
      const arrayBuffer = await fileState.file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        password
      });

      const pdfDoc = await loadingTask.promise;

      // Success — password is correct
      this.isDecrypted.set(true);
      this.uploadReadyFile.set(fileState.file);
      this.currentPassword.set(password);
      await this.generatePdfPreview(pdfDoc);
      return true;
    } catch (err: any) {
      if (err?.name === 'PasswordException') {
        this.errorMessage.set('Incorrect password. Please try again.');
      } else {
        this.errorMessage.set('Failed to decrypt the PDF.');
      }
      return false;
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Clear all state — used when removing a file.
   */
  resetState(): void {
    // Revoke any existing preview URL
    const existingUrl = this.pdfPreviewUrl();
    if (existingUrl) {
      URL.revokeObjectURL(existingUrl);
    }

    this.currentFile.set(null);
    this.isLocked.set(false);
    this.isDecrypted.set(false);
    this.isProcessing.set(false);
    this.errorMessage.set('');
    this.pdfPreviewUrl.set(null);
    this.currentPassword.set('');
    this.uploadReadyFile.set(null);
  }

  // --- Private Helpers ---

  private async checkPdfProtection(arrayBuffer: ArrayBuffer): Promise<void> {
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer)
      });

      const pdfDoc = await loadingTask.promise;

      // PDF loaded without password — it's unlocked
      this.isLocked.set(false);
      this.uploadReadyFile.set(this.currentFile()!.file);
      await this.generatePdfPreview(pdfDoc);
    } catch (err: any) {
      if (err?.name === 'PasswordException') {
        // PDF is password-protected
        this.isLocked.set(true);
      } else {
        this.errorMessage.set('The file could not be read as a valid PDF.');
        console.error('[PdfSecurity] PDF load error:', err);
      }
    }
  }

  private async generatePdfPreview(pdfDoc: pdfjsLib.PDFDocumentProxy): Promise<void> {
    try {
      const page = await pdfDoc.getPage(1);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });
      const url = URL.createObjectURL(blob);
      this.pdfPreviewUrl.set(url);
    } catch (err) {
      console.warn('[PdfSecurity] Could not generate PDF preview:', err);
    }
  }

  private async generateImagePreview(file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    this.pdfPreviewUrl.set(url);
  }
}
