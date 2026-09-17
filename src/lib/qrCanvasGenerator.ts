import QRCode from 'qrcode';

export interface QRCardRenderParams {
  tableNumber: string;
  tableName?: string;
  qrValue: string;
  restaurantName?: string;
  logoUrl?: string | null;
}

export interface RestaurantQRCardRenderParams {
  qrValue: string;
  restaurantName?: string;
  logoUrl?: string | null;
  tagline?: string;
}

/**
 * Returns the permanent direct digital menu URL for a restaurant.
 */
export function getRestaurantDirectMenuUrl(restaurant: { id: string; slug?: string }): string {
  const baseUrl = 'https://dishgaze.com';
  const identifier = restaurant.slug && restaurant.slug.trim() ? restaurant.slug.trim() : restaurant.id;
  return `${baseUrl}/menu/${identifier}`;
}

/**
 * Loads an image safely with a timeout and handles CORS gracefully.
 */
function loadSafeImage(src: string, timeoutMs = 2000): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src || !src.trim()) {
      return resolve(null);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      resolve(null);
    }, timeoutMs);

    img.onload = () => {
      if (!timedOut) {
        clearTimeout(timer);
        resolve(img);
      }
    };

    img.onerror = () => {
      if (!timedOut) {
        clearTimeout(timer);
        resolve(null);
      }
    };

    img.src = src;
  });
}

/**
 * Helper to draw a rounded rectangle on a 2D canvas context.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color = '#C59D5F'
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draws 4 luxury metallic gold corner guide brackets around any rectangular region.
 */
function drawGoldCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  armLen = 32,
  pad = 10,
  lineWidth = 4,
  color = '#C59D5F'
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(x - pad + armLen, y - pad);
  ctx.lineTo(x - pad, y - pad);
  ctx.lineTo(x - pad, y - pad + armLen);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(x + w + pad - armLen, y - pad);
  ctx.lineTo(x + w + pad, y - pad);
  ctx.lineTo(x + w + pad, y - pad + armLen);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(x - pad, y + h + pad - armLen);
  ctx.lineTo(x - pad, y + h + pad);
  ctx.lineTo(x - pad + armLen, y + h + pad);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(x + w + pad - armLen, y + h + pad);
  ctx.lineTo(x + w + pad, y + h + pad);
  ctx.lineTo(x + w + pad, y + h + pad - armLen);
  ctx.stroke();

  ctx.restore();
}

/**
 * Generates a standalone high-res QR code PNG data URL with emerald & gold branding
 * and optional centered restaurant logo badge.
 */
export async function generateRawQRDataUrl(
  qrValue: string,
  size = 800,
  logoUrl?: string | null
): Promise<string> {
  try {
    const rawQrUrl = await QRCode.toDataURL(qrValue, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0D3B36', // Deep emerald for maximum contrast and luxury aesthetic
        light: '#ffffff',
      },
    });

    const targetLogo = (logoUrl && logoUrl.trim()) ? logoUrl : '/logo.png';
    let logoImg: HTMLImageElement | null = null;
    try {
      logoImg = await loadSafeImage(targetLogo, 1500);
    } catch (_) {
      logoImg = null;
    }

    if (!logoImg) {
      return rawQrUrl;
    }

    // Overlay center logo badge with gold border ring
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return rawQrUrl;

    const qrImg = await loadSafeImage(rawQrUrl, 2000);
    if (qrImg) {
      ctx.drawImage(qrImg, 0, 0, size, size);
    }

    // Badge size is ~22% of QR size (safely within 'H' 30% error correction limit)
    const badgeSize = Math.round(size * 0.22);
    const badgeX = (size - badgeSize) / 2;
    const badgeY = (size - badgeSize) / 2;
    const badgeRadius = Math.round(badgeSize * 0.26);

    ctx.save();
    // 1. Crisp white background to clear out QR dots
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, badgeX, badgeY, badgeSize, badgeSize, badgeRadius);
    ctx.fill();

    // 2. Luxury metallic gold border ring
    ctx.lineWidth = Math.max(3, Math.round(size * 0.005));
    ctx.strokeStyle = '#C59D5F';
    ctx.stroke();

    // 3. Clip and draw logo
    ctx.beginPath();
    drawRoundedRect(
      ctx,
      badgeX + 3,
      badgeY + 3,
      badgeSize - 6,
      badgeSize - 6,
      badgeRadius - 2
    );
    ctx.clip();
    ctx.drawImage(logoImg, badgeX + 4, badgeY + 4, badgeSize - 8, badgeSize - 8);
    ctx.restore();

    return canvas.toDataURL('image/png', 0.98);
  } catch (err) {
    console.error('Error generating raw QR code:', err);
    throw err;
  }
}

/**
 * Generates an ultra-crisp 300 DPI full restaurant table standee card data URL.
 * 100% Canvas 2D based — never fails on CORS, SVG foreignObject, or CSS vars!
 */
export async function generateQRCardDataUrl(params: QRCardRenderParams): Promise<string> {
  const {
    tableNumber,
    tableName = '',
    qrValue,
    restaurantName = 'Smart Restaurant',
    logoUrl,
  } = params;

  // High-res canvas dimensions (approx 4" x 5.8" at 300 DPI)
  const width = 1200;
  const height = 1740;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // 1. Background Fill (Card Frame)
  ctx.fillStyle = '#F3F0E9';
  drawRoundedRect(ctx, 0, 0, width, height, 50);
  ctx.fill();

  // 2. Inner White Card
  const pad = 35;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  ctx.fillStyle = '#FFFCF7';
  drawRoundedRect(ctx, pad, pad, innerW, innerH, 42);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#E7E2D8';
  ctx.stroke();

  // Top Accent Bar
  ctx.fillStyle = '#0F766E';
  drawRoundedRect(ctx, width / 2 - 60, pad + 35, 120, 9, 5);
  ctx.fill();

  // 3. Logo / Emblem
  let currentY = pad + 75;
  const logoRadius = 55;
  const logoCenterX = width / 2;
  const logoCenterY = currentY + logoRadius;

  let logoImage: HTMLImageElement | null = null;
  if (logoUrl) {
    try {
      logoImage = await loadSafeImage(logoUrl, 1500);
    } catch (_) {}
  }

  // Outer logo circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(logoCenterX, logoCenterY, logoRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#D9C9A9';
  ctx.stroke();
  ctx.clip();

  if (logoImage) {
    ctx.drawImage(
      logoImage,
      logoCenterX - logoRadius + 8,
      logoCenterY - logoRadius + 8,
      (logoRadius - 8) * 2,
      (logoRadius - 8) * 2
    );
  } else {
    // Fallback Icon / Emblem
    ctx.fillStyle = '#0F766E';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(restaurantName.charAt(0).toUpperCase() || 'R', logoCenterX, logoCenterY);
  }
  ctx.restore();

  currentY = logoCenterY + logoRadius + 28;

  // 4. Restaurant Name
  ctx.fillStyle = '#171717';
  ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Truncate or wrap long name
  let displayRestName = restaurantName;
  if (displayRestName.length > 28) {
    displayRestName = displayRestName.substring(0, 26) + '…';
  }
  ctx.fillText(displayRestName, width / 2, currentY);

  currentY += 60;

  // 5. DIGITAL MENU Separator Badge
  const goldLineW = 100;
  ctx.strokeStyle = '#C59D5F';
  ctx.lineWidth = 2.5;

  // Left line
  ctx.beginPath();
  ctx.moveTo(width / 2 - 190, currentY + 12);
  ctx.lineTo(width / 2 - 190 + goldLineW, currentY + 12);
  ctx.stroke();

  // Text
  ctx.fillStyle = '#0F766E';
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '5px';
  ctx.fillText('DIGITAL MENU', width / 2, currentY);

  // Right line
  ctx.beginPath();
  ctx.moveTo(width / 2 + 190 - goldLineW, currentY + 12);
  ctx.lineTo(width / 2 + 190, currentY + 12);
  ctx.stroke();

  currentY += 45;

  // 6. YOUR TABLE Card Box
  const tableBoxX = pad + 45;
  const tableBoxW = innerW - 90;
  const tableBoxH = 135;

  ctx.fillStyle = '#F7F4EC';
  drawRoundedRect(ctx, tableBoxX, currentY, tableBoxW, tableBoxH, 26);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#E8E2D5';
  ctx.stroke();

  // Table Box Text
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8C827A';
  ctx.font = '900 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('YOUR TABLE', tableBoxX + 35, currentY + 24);

  ctx.fillStyle = '#171717';
  ctx.font = '900 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`TABLE ${tableNumber}`, tableBoxX + 35, currentY + 54);

  if (tableName && tableName.trim()) {
    ctx.fillStyle = '#0F766E';
    ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(tableName, tableBoxX + 35, currentY + 98);
  }

  // Table Number Pill on Right - Deep emerald with gold ring
  const pillSize = 88;
  const pillX = tableBoxX + tableBoxW - pillSize - 28;
  const pillY = currentY + (tableBoxH - pillSize) / 2;

  ctx.fillStyle = '#0D3B36';
  drawRoundedRect(ctx, pillX, pillY, pillSize, pillSize, 22);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#C59D5F';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(tableNumber, pillX + pillSize / 2, pillY + 28);

  currentY += tableBoxH + 35;

  // 7. QR Panel Container
  const qrBoxX = tableBoxX;
  const qrBoxW = tableBoxW;
  const qrBoxH = 680;

  ctx.fillStyle = '#F5F3EE';
  drawRoundedRect(ctx, qrBoxX, currentY, qrBoxW, qrBoxH, 32);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#E7E2D8';
  ctx.stroke();

  // SCAN TO VIEW MENU
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 25px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('SCAN TO VIEW MENU', width / 2, currentY + 30);

  ctx.fillStyle = '#78716C';
  ctx.font = '700 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('SCAN WITH GOOGLE / CAMERA', width / 2, currentY + 65);

  // High-Resolution QR Canvas Box in center
  const qrSize = 440;
  const qrWhiteBoxSize = qrSize + 40;
  const qrWhiteBoxX = width / 2 - qrWhiteBoxSize / 2;
  const qrWhiteBoxY = currentY + 105;

  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, qrWhiteBoxX, qrWhiteBoxY, qrWhiteBoxSize, qrWhiteBoxSize, 26);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#E0D9CB';
  ctx.stroke();

  // 4 Luxury Gold Corner Guide Brackets around QR box
  drawGoldCornerBrackets(ctx, qrWhiteBoxX, qrWhiteBoxY, qrWhiteBoxSize, qrWhiteBoxSize, 32, 10, 4, '#C59D5F');

  // Draw High-Res QR matrix directly with deep emerald & center logo badge
  const qrDataUrl = await generateRawQRDataUrl(qrValue, qrSize, logoUrl);
  const qrImg = await loadSafeImage(qrDataUrl);
  if (qrImg) {
    ctx.drawImage(qrImg, qrWhiteBoxX + 20, qrWhiteBoxY + 20, qrSize, qrSize);
  }

  // SCAN • BROWSE • ORDER
  const scanSubY = qrWhiteBoxY + qrWhiteBoxSize + 32;
  drawDiamond(ctx, width / 2 - 180, scanSubY + 11, 5, '#C59D5F');

  ctx.fillStyle = '#0F766E';
  ctx.font = '900 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('SCAN  •  BROWSE  •  ORDER', width / 2, scanSubY);

  drawDiamond(ctx, width / 2 + 180, scanSubY + 11, 5, '#C59D5F');

  return canvas.toDataURL('image/png', 0.98);
}

/**
 * Returns clean, self-contained HTML for printing a single table QR code.
 */
export function getSingleQRPrintHtml(
  cardDataUrl: string,
  rawQrDataUrl: string,
  tableNumber: string,
  tableName?: string,
  restaurantName = 'Smart Restaurant',
  mode: 'standee' | 'pos80mm' | 'a4' = 'standee'
): string {
  if (mode === 'pos80mm') {
    return `
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 80mm !important;
          max-width: 80mm !important;
          background: #ffffff !important;
          color: #000000 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .pos-card {
          width: 74mm;
          margin: 0 auto;
          padding: 4mm 1mm;
          text-align: center;
          border-bottom: 1px dashed #000;
        }
        .rest-title {
          font-size: 16px;
          font-weight: 900;
          margin: 0;
          text-transform: uppercase;
        }
        .menu-sub {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          margin: 2px 0 6px;
        }
        .table-box {
          border: 2px solid #000;
          border-radius: 8px;
          padding: 4px 6px;
          margin: 6px 0;
          background: #f8f8f8;
        }
        .table-label {
          font-size: 10px;
          font-weight: 800;
        }
        .table-num {
          font-size: 20px;
          font-weight: 900;
        }
        .qr-img {
          width: 54mm;
          height: 54mm;
          margin: 6px auto;
          display: block;
        }
        .footer-note {
          font-size: 9px;
          font-weight: 700;
          margin-top: 4px;
        }
      </style>
      <div class="pos-card">
        <h1 class="rest-title">${restaurantName}</h1>
        <div class="menu-sub">• DIGITAL MENU •</div>
        <div class="table-box">
          <div class="table-label">YOUR TABLE</div>
          <div class="table-num">TABLE ${tableNumber}</div>
          ${tableName ? `<div style="font-size:11px;font-weight:600;">${tableName}</div>` : ''}
        </div>
        <img class="qr-img" src="${rawQrDataUrl}" alt="Table ${tableNumber} QR" />
        <div style="font-size:11px;font-weight:800;">SCAN TO VIEW MENU & ORDER</div>
        <div class="footer-note">Scan with Google or Camera</div>
      </div>
    `;
  }

  // Default: Standee or A4 format
  const isA4 = mode === 'a4';
  return `
    <style>
      @page {
        size: ${isA4 ? 'A4 portrait' : '4in 6in'};
        margin: 0;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: #ffffff !important;
        display: flex;
        align-items: center;
        justify-content: center;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .standee-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: ${isA4 ? '15mm' : '4mm'};
        box-sizing: border-box;
      }
      .standee-img {
        max-width: ${isA4 ? '135mm' : '92mm'};
        height: auto;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.08);
      }
      .cut-line {
        ${isA4 ? 'border: 1px dashed #cbd5e1; padding: 6mm; border-radius: 16px;' : ''}
      }
    </style>
    <div class="standee-container">
      <div class="cut-line">
        <img class="standee-img" src="${cardDataUrl}" alt="Table ${tableNumber} QR Standee" />
      </div>
    </div>
  `;
}

/**
 * Returns clean HTML for printing multiple tables in one batch on A4 or 80mm roll.
 */
export function getBulkQRPrintHtml(
  tables: Array<{
    cardDataUrl: string;
    tableNumber: string;
    tableName?: string;
  }>,
  layout: '4perA4' | '6perA4' | '1perPage' = '4perA4'
): string {
  if (layout === '1perPage') {
    return `
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        html, body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; }
        .page { page-break-after: always; display: flex; align-items: center; justify-content: center; height: 95vh; }
        .standee-card { max-width: 130mm; height: auto; border-radius: 14px; border: 1px dashed #ccc; padding: 4mm; }
      </style>
      ${tables
        .map(
          (t) => `
        <div class="page">
          <img class="standee-card" src="${t.cardDataUrl}" alt="Table ${t.tableNumber}" />
        </div>
      `
        )
        .join('')}
    `;
  }

  const is6 = layout === '6perA4';
  return `
    <style>
      @page {
        size: A4 portrait;
        margin: 8mm;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .grid-page {
        display: grid;
        grid-template-columns: ${is6 ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)'};
        grid-template-rows: ${is6 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)'};
        gap: 6mm;
        width: 100%;
        height: 98vh;
        box-sizing: border-box;
        page-break-after: always;
      }
      .grid-item {
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px dashed #94a3b8;
        border-radius: 12px;
        padding: 2mm;
        box-sizing: border-box;
        overflow: hidden;
      }
      .card-img {
        max-width: 100%;
        max-height: ${is6 ? '82mm' : '125mm'};
        object-fit: contain;
        border-radius: 8px;
      }
    </style>
    ${chunkArray(tables, is6 ? 6 : 4)
      .map(
        (pageTables) => `
      <div class="grid-page">
        ${pageTables
          .map(
            (t) => `
          <div class="grid-item">
            <img class="card-img" src="${t.cardDataUrl}" alt="Table ${t.tableNumber}" />
          </div>
        `
          )
          .join('')}
      </div>
    `
      )
      .join('')}
  `;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Generates an ultra-crisp 300 DPI full restaurant storefront / main menu standee card data URL.
 * 100% Canvas 2D based — fixed single QR code for direct menu access.
 */
export async function generateRestaurantQRCardDataUrl(params: RestaurantQRCardRenderParams): Promise<string> {
  const {
    qrValue,
    restaurantName = 'Smart Restaurant',
    logoUrl,
    tagline = 'Scan with your camera to explore our menu & order directly',
  } = params;

  // High-res canvas dimensions (approx 4" x 5.8" at 300 DPI)
  const width = 1200;
  const height = 1740;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // 1. Background Fill (Card Frame)
  ctx.fillStyle = '#F3F0E9';
  drawRoundedRect(ctx, 0, 0, width, height, 50);
  ctx.fill();

  // 2. Inner White Card
  const pad = 35;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  ctx.fillStyle = '#FFFCF7';
  drawRoundedRect(ctx, pad, pad, innerW, innerH, 42);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#E7E2D8';
  ctx.stroke();

  // Top Accent Bar
  ctx.fillStyle = '#0F766E';
  drawRoundedRect(ctx, width / 2 - 70, pad + 35, 140, 10, 5);
  ctx.fill();

  // 3. Logo / Emblem
  let currentY = pad + 70;
  const logoRadius = 65;
  const logoCenterX = width / 2;
  const logoCenterY = currentY + logoRadius;

  let logoImage: HTMLImageElement | null = null;
  if (logoUrl) {
    try {
      logoImage = await loadSafeImage(logoUrl, 1500);
    } catch (_) {}
  }

  // Outer logo circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(logoCenterX, logoCenterY, logoRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#D9C9A9';
  ctx.stroke();
  ctx.clip();

  if (logoImage) {
    ctx.drawImage(
      logoImage,
      logoCenterX - logoRadius + 10,
      logoCenterY - logoRadius + 10,
      (logoRadius - 10) * 2,
      (logoRadius - 10) * 2
    );
  } else {
    // Fallback Icon / Emblem
    ctx.fillStyle = '#0F766E';
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(restaurantName.charAt(0).toUpperCase() || 'R', logoCenterX, logoCenterY);
  }
  ctx.restore();

  currentY = logoCenterY + logoRadius + 30;

  // 4. Restaurant Name
  ctx.fillStyle = '#171717';
  ctx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  let displayRestName = restaurantName;
  if (displayRestName.length > 26) {
    displayRestName = displayRestName.substring(0, 24) + '…';
  }
  ctx.fillText(displayRestName, width / 2, currentY);

  currentY += 66;

  // 5. OFFICIAL DIGITAL MENU Gold Badge
  const goldLineW = 120;
  ctx.strokeStyle = '#C59D5F';
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.moveTo(width / 2 - 220, currentY + 14);
  ctx.lineTo(width / 2 - 220 + goldLineW, currentY + 14);
  ctx.stroke();

  ctx.fillStyle = '#0F766E';
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '6px';
  ctx.fillText('OFFICIAL DIGITAL MENU', width / 2, currentY);

  ctx.beginPath();
  ctx.moveTo(width / 2 + 220 - goldLineW, currentY + 14);
  ctx.lineTo(width / 2 + 220, currentY + 14);
  ctx.stroke();

  currentY += 50;

  // 6. Header Banner Card (Welcome / Dine-in / Takeaway)
  const bannerX = pad + 45;
  const bannerW = innerW - 90;
  const bannerH = 110;

  ctx.fillStyle = '#F7F4EC';
  drawRoundedRect(ctx, bannerX, currentY, bannerW, bannerH, 24);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#E8E2D5';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0F766E';
  ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('BROWSE ALL DISHES & SPECIALS', width / 2, currentY + 24);

  ctx.fillStyle = '#78716C';
  ctx.font = '600 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.letterSpacing = '0px';
  ctx.fillText(tagline, width / 2, currentY + 64);

  currentY += bannerH + 35;

  // 7. QR Container Box
  const qrBoxX = bannerX;
  const qrBoxW = bannerW;
  const qrBoxH = 740;

  ctx.fillStyle = '#F5F3EE';
  drawRoundedRect(ctx, qrBoxX, currentY, qrBoxW, qrBoxH, 32);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#E7E2D8';
  ctx.stroke();

  // SCAN TO VIEW MENU
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('SCAN TO VIEW LIVE MENU', width / 2, currentY + 32);

  ctx.fillStyle = '#78716C';
  ctx.font = '700 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('SCAN WITH GOOGLE / CAMERA • NO APP NEEDED', width / 2, currentY + 68);

  // High-Resolution QR Canvas Box in center
  const qrSize = 480;
  const qrWhiteBoxSize = qrSize + 40;
  const qrWhiteBoxX = width / 2 - qrWhiteBoxSize / 2;
  const qrWhiteBoxY = currentY + 110;

  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, qrWhiteBoxX, qrWhiteBoxY, qrWhiteBoxSize, qrWhiteBoxSize, 28);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#E0D9CB';
  ctx.stroke();

  // 4 Luxury Gold Corner Guide Brackets around QR box
  drawGoldCornerBrackets(ctx, qrWhiteBoxX, qrWhiteBoxY, qrWhiteBoxSize, qrWhiteBoxSize, 34, 10, 4, '#C59D5F');

  // Draw High-Res QR matrix directly with deep emerald & center logo badge
  const qrDataUrl = await generateRawQRDataUrl(qrValue, qrSize, logoUrl);
  const qrImg = await loadSafeImage(qrDataUrl);
  if (qrImg) {
    ctx.drawImage(qrImg, qrWhiteBoxX + 20, qrWhiteBoxY + 20, qrSize, qrSize);
  }

  // SCAN • BROWSE • ORDER
  const scanSubY = qrWhiteBoxY + qrWhiteBoxSize + 36;
  drawDiamond(ctx, width / 2 - 200, scanSubY + 11, 5.5, '#C59D5F');

  ctx.fillStyle = '#0F766E';
  ctx.font = '900 23px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('SCAN  •  BROWSE  •  ORDER', width / 2, scanSubY);

  drawDiamond(ctx, width / 2 + 200, scanSubY + 11, 5.5, '#C59D5F');

  return canvas.toDataURL('image/png', 0.98);
}

/**
 * Returns clean, self-contained HTML for printing the fixed single restaurant QR code.
 */
export function getSingleRestaurantQRPrintHtml(
  cardDataUrl: string,
  rawQrDataUrl: string,
  restaurantName = 'Smart Restaurant',
  menuUrl = 'https://dishgaze.com',
  mode: 'standee' | 'pos80mm' | 'a4' = 'standee'
): string {
  if (mode === 'pos80mm') {
    return `
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 80mm !important;
          max-width: 80mm !important;
          background: #ffffff !important;
          color: #000000 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .pos-card {
          width: 74mm;
          margin: 0 auto;
          padding: 4mm 1mm;
          text-align: center;
          border-bottom: 1px dashed #000;
        }
        .rest-title {
          font-size: 17px;
          font-weight: 900;
          margin: 0;
          text-transform: uppercase;
        }
        .menu-sub {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
          margin: 3px 0 6px;
        }
        .banner-box {
          border: 2px solid #000;
          border-radius: 8px;
          padding: 6px;
          margin: 6px 0;
          background: #f8f8f8;
        }
        .qr-img {
          width: 56mm;
          height: 56mm;
          margin: 6px auto;
          display: block;
        }
        .footer-note {
          font-size: 9.5px;
          font-weight: 700;
          margin-top: 4px;
        }
        .url-text {
          font-size: 8.5px;
          font-weight: 600;
          color: #333;
          margin-top: 3px;
          word-break: break-all;
        }
      </style>
      <div class="pos-card">
        <h1 class="rest-title">${restaurantName}</h1>
        <div class="menu-sub">• DIGITAL MENU •</div>
        <div class="banner-box">
          <div style="font-size: 12px; font-weight: 900;">SCAN TO VIEW FULL MENU</div>
          <div style="font-size: 10px; font-weight: 600; margin-top: 2px;">Dine-In • Takeaway • Delivery</div>
        </div>
        <img class="qr-img" src="${rawQrDataUrl}" alt="${restaurantName} Digital Menu QR" />
        <div style="font-size: 11px; font-weight: 900;">SCAN WITH CAMERA / GOOGLE LENS</div>
        <div class="url-text">${menuUrl}</div>
        <div class="footer-note">No App Download Needed • Powered by Dishgaze</div>
      </div>
    `;
  }

  // Default: Standee or A4 format
  const isA4 = mode === 'a4';
  return `
    <style>
      @page {
        size: ${isA4 ? 'A4 portrait' : '4in 6in'};
        margin: 0;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: #ffffff !important;
        display: flex;
        align-items: center;
        justify-content: center;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .standee-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: ${isA4 ? '14mm' : '4mm'};
        box-sizing: border-box;
      }
      .standee-img {
        max-width: ${isA4 ? '140mm' : '94mm'};
        height: auto;
        border-radius: 14px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      }
      .cut-line {
        ${isA4 ? 'border: 1.5px dashed #cbd5e1; padding: 6mm; border-radius: 18px;' : ''}
      }
    </style>
    <div class="standee-container">
      <div class="cut-line">
        <img class="standee-img" src="${cardDataUrl}" alt="${restaurantName} Digital Menu QR" />
      </div>
    </div>
  `;
}
