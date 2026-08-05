/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export type PaperSize = 'A4' | '58mm' | '80mm';

export interface PDFGenerateOptions {
  elementId: string; // The HTML element containing receipt preview
  fileName?: string;
  paperSize?: PaperSize;
}

/**
 * Generate and download PDF from an HTML element
 */
export const downloadReceiptPDFFromElement = async (
  options: PDFGenerateOptions
): Promise<void> => {
  const { elementId, fileName = 'Receipt.pdf', paperSize = '80mm' } = options;

  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found for PDF generation.`);
    return;
  }

  try {
    // Render HTML element to Canvas
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');

    let pdf: jsPDF;

    if (paperSize === 'A4') {
      pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });
      const imgWidth = 190; // A4 width is 210mm
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    } else if (paperSize === '58mm') {
      const widthMm = 58;
      const heightMm = Math.max(120, (canvas.height * widthMm) / canvas.width);
      pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [widthMm, heightMm],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
    } else {
      // 80mm
      const widthMm = 80;
      const heightMm = Math.max(140, (canvas.height * widthMm) / canvas.width);
      pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [widthMm, heightMm],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
    }

    pdf.save(fileName);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw error;
  }
};
