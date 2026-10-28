import { toBengaliDigits } from './bengaliUtils';
import { DEVELOPER_LOGO_BASE64 } from './developerLogo';

export interface SoftwarePromoInfo {
  softwareCompany?: string;
  softwarePhone?: string;
  softwareWebsite?: string;
  softwareLogo?: string;
  watermarkText?: string;
  showWatermark?: boolean;
  showFooter?: boolean;
}

export const getSoftwarePromoInfo = (): Required<SoftwarePromoInfo> => {
  const defaults: Required<SoftwarePromoInfo> = {
    softwareCompany: 'Hasanah Tech Solution',
    softwarePhone: '01349345353',
    softwareWebsite: 'www.hasanahtech.vercel.app',
    softwareLogo: DEVELOPER_LOGO_BASE64,
    watermarkText: '',
    showWatermark: false,
    showFooter: true,
  };

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('softwarePromoInfo');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          softwareCompany: parsed.softwareCompany || defaults.softwareCompany,
          softwarePhone: parsed.softwarePhone || defaults.softwarePhone,
          softwareWebsite: parsed.softwareWebsite || defaults.softwareWebsite,
          softwareLogo: parsed.softwareLogo || defaults.softwareLogo,
          watermarkText: '',
          showWatermark: false,
          showFooter: parsed.showFooter !== false,
        };
      }
    } catch {}
  }
  return defaults;
};

/**
 * Utility function to print a specific DOM element in an isolated hidden iframe.
 * Avoids browser scroll offset, modal translation, and page background interference.
 * Injects marketing footer on all printed documents (watermark removed).
 */
export const printElement = (elementId: string) => {
  if (typeof window === 'undefined') return;

  const elem = document.getElementById(elementId);
  if (!elem) {
    window.print();
    return;
  }

  // iOS Safari blocks printing from hidden or 0x0 iframes.
  // On iOS, the main document print media classes (print:hidden and print:block) are already configured,
  // so invoking window.print() directly displays the native iOS AirPrint & PDF dialog perfectly.
  const isIOS = typeof navigator !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

  if (isIOS) {
    window.print();
    return;
  }

  const promo = getSoftwarePromoInfo();
  const hasLocalFooter = elem.querySelector('[data-has-dev-footer="true"]') !== null || elem.getAttribute('data-has-dev-footer') === 'true';

  // Create isolated hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.name = 'print_iframe_' + Date.now();

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    window.print();
    return;
  }

  // Collect existing stylesheets and style tags
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(s => s.outerHTML)
    .join('\n');

  const footerHtml = (!hasLocalFooter && promo.showFooter) ? `
    <div class="print-global-dev-footer" data-has-dev-footer="true">
      <div class="dev-footer-left">
        <img src="${promo.softwareLogo || DEVELOPER_LOGO_BASE64}" class="dev-footer-logo" alt="" />
        <span class="dev-badge">SYS</span>
        <span class="dev-text">সফটওয়্যার পরিচালনায়: <strong>${promo.softwareCompany}</strong></span>
      </div>
      <div class="dev-footer-right">
        ${promo.softwareWebsite ? `<span class="dev-web">${promo.softwareWebsite}</span><span class="dev-dot">•</span>` : ''}
        <span class="dev-phone">হটলাইন: <strong>${toBengaliDigits(promo.softwarePhone)}</strong></span>
      </div>
    </div>
  ` : '';

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cash Memo Print</title>
        ${styles}
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            position: relative !important;
          }
          body {
            padding-bottom: 6mm !important;
          }
          #printable-memo-wrapper,
          #gate-pass-printable-wrapper,
          #purchase-memo-wrapper,
          #customer-dues-printable-sheet,
          #stock-sheet-printable-wrapper,
          #balance-sheet-printable-wrapper,
          #income-statement-printable-wrapper {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-row-group !important;
          }
          tr, td, th, .keep-together, .memo-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Global Print Footer - Clean, Subtle & Always at Bottom of Page */
          .print-global-dev-footer {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            padding: 3px 10px !important;
            border-top: 1px solid #e2e8f0 !important;
            background: #ffffff !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            font-size: 8.5px !important;
            color: #64748b !important;
            z-index: 999998 !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            letter-spacing: 0.2px !important;
          }
          .dev-footer-left {
            display: flex !important;
            align-items: center !important;
            gap: 5px !important;
          }
          .dev-footer-right {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
            font-size: 8px !important;
          }
          .dev-footer-logo {
            width: 13px !important;
            height: 13px !important;
            object-fit: contain !important;
            opacity: 0.65 !important;
            filter: grayscale(100%) !important;
            border-radius: 2px !important;
            display: inline-block !important;
            vertical-align: middle !important;
          }
          .print-global-dev-footer .dev-badge {
            background: #f8fafc !important;
            color: #64748b !important;
            border: 1px solid #cbd5e1 !important;
            font-size: 7px !important;
            font-weight: 700 !important;
            padding: 0.5px 3px !important;
            border-radius: 2px !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
            display: inline-block !important;
          }
          .dev-text {
            color: #64748b !important;
          }
          .dev-dot {
            color: #cbd5e1 !important;
          }
          .print-global-dev-footer strong {
            color: #475569 !important;
            font-weight: 600 !important;
          }
        </style>
      </head>
      <body>
        ${elem.outerHTML}
        ${footerHtml}
      </body>
    </html>
  `);
  doc.close();

  // Give styles and fonts a moment to initialize in the iframe
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print iframe error:', e);
      window.print();
    } setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {}
    }, 1000);
  }, 300);
};
