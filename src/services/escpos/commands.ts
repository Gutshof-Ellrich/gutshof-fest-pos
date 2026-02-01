// ESC/POS Command Constants for Thermal Printers
// Supports UTF-8 encoding with German umlauts

export const ESC = '\x1B';
export const GS = '\x1D';
export const LF = '\x0A';

export const ESCPOS = {
  // Initialization
  INIT: ESC + '@',
  
  // Text Formatting
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  UNDERLINE_ON: ESC + '-' + '\x01',
  UNDERLINE_OFF: ESC + '-' + '\x00',
  DOUBLE_HEIGHT_ON: ESC + '!' + '\x10',
  DOUBLE_WIDTH_ON: ESC + '!' + '\x20',
  DOUBLE_SIZE_ON: ESC + '!' + '\x30',
  NORMAL_SIZE: ESC + '!' + '\x00',
  
  // Alignment
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  
  // Character Set
  SELECT_UTF8: ESC + 't' + '\x47', // Code page UTF-8
  SELECT_GERMAN: ESC + 'R' + '\x02', // Germany character set
  
  // Feed and Cut
  FEED_LINE: LF,
  FEED_PARTIAL: ESC + 'd' + '\x02',
  CUT_PAPER: GS + 'V' + '\x00',
  CUT_PARTIAL: GS + 'V' + '\x01',
  
  // Cash Drawer
  OPEN_DRAWER: ESC + 'p' + '\x00' + '\x19' + '\xFA',
  
  // Line Spacing
  LINE_SPACING_DEFAULT: ESC + '2',
  LINE_SPACING_SET: (n: number) => ESC + '3' + String.fromCharCode(n),
};

// Standard receipt width in characters (80mm paper = ~48 chars, 58mm = ~32 chars)
export const RECEIPT_WIDTH = 48;

// Helper to create a line separator
export const createSeparator = (char: string = '-'): string => {
  return char.repeat(RECEIPT_WIDTH);
};

// Helper to format a line with left and right text
export const formatLine = (left: string, right: string, width: number = RECEIPT_WIDTH): string => {
  const spaces = width - left.length - right.length;
  if (spaces <= 0) {
    return left.substring(0, width - right.length - 1) + ' ' + right;
  }
  return left + ' '.repeat(spaces) + right;
};

// Helper to center text
export const centerText = (text: string, width: number = RECEIPT_WIDTH): string => {
  const padding = Math.floor((width - text.length) / 2);
  if (padding <= 0) return text;
  return ' '.repeat(padding) + text;
};

// Helper to format currency
export const formatCurrency = (amount: number): string => {
  return amount.toFixed(2).replace('.', ',') + ' €';
};

// Helper to format quantity and price
export const formatItemLine = (
  quantity: number,
  name: string,
  price: number,
  width: number = RECEIPT_WIDTH
): string => {
  const qtyStr = `${quantity}x `;
  const priceStr = formatCurrency(price * quantity);
  const availableWidth = width - qtyStr.length - priceStr.length - 1;
  const truncatedName = name.length > availableWidth 
    ? name.substring(0, availableWidth - 2) + '..'
    : name;
  return formatLine(qtyStr + truncatedName, priceStr, width);
};
