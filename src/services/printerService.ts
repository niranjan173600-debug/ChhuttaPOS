/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PaperSize } from './pdfService';

export interface PrintJob {
  paperSize: PaperSize;
  autoPrint?: boolean;
}

/**
 * Service providing browser print triggers and future-ready hooks for USB / Bluetooth / Network thermal printers.
 */
export const triggerBrowserPrint = (): void => {
  if (typeof window !== 'undefined') {
    window.print();
  }
};

/**
 * Future extension point: Direct ESC/POS Thermal Printer Commands over Bluetooth / USB / Network Web APIs
 */
export const sendDirectThermalPrintJob = async (
  _receiptData: any,
  _config: { connectionType: 'BT' | 'USB' | 'NETWORK'; address?: string }
): Promise<{ success: boolean; message: string }> => {
  // Abstract placeholder architecture for future native hardware SDK drivers
  console.log('Direct ESC/POS thermal printing requested. Falling back to browser driver.');
  triggerBrowserPrint();
  return {
    success: true,
    message: 'Print command dispatched to browser spooler',
  };
};
