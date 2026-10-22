export function money(s?: string | null): string {
  if (s === null || s === undefined) return "₹0.00";
  const str = String(s).trim();
  if (!str || str === "-") return "₹0.00";
  const [iRaw, dRaw = "00"] = str.split(".");
  const neg = iRaw.startsWith("-");
  const digitsOnly = iRaw.replace("-", "").replace(/\D/g, "");
  const x = digitsOnly || "0";
  const d = (dRaw.replace(/\D/g, "") + "00").slice(0, 2);
  const last = x.slice(-3);
  const rest = x.slice(0, -3);
  const g = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last : last;
  return `${neg ? "-" : ""}₹${g}.${d}`;
}

export function intOf(s?: string | number | null): number {
  if (s === null || s === undefined || s === "") return 0;
  const n = parseInt(String(s).replace(/\D/g, ""), 10);
  return isNaN(n) ? 0 : Math.max(0, n);
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? `${t} ${o}` : t;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const hStr = h > 0 ? `${ONES[h]} Hundred` : "";
  const rStr = r > 0 ? twoDigits(r) : "";
  return hStr && rStr ? `${hStr} and ${rStr}` : hStr || rStr;
}

/**
 * Converts a numeric or money string to words using the Indian numbering system
 * (Crore, Lakh, Thousand, Hundred).
 * e.g. 125000 -> "Rupees One Lakh Twenty Five Thousand Only"
 */
export function amountInWords(s?: string | null): string {
  if (!s) return "Rupees Zero Only";
  const str = String(s).split(".")[0].replace(/\D/g, "");
  const num = parseInt(str, 10);
  if (isNaN(num) || num === 0) return "Rupees Zero Only";

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  const parts: string[] = [];
  if (crore > 0) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh > 0) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${twoDigits(thousand)} Thousand`);
  if (remainder > 0) parts.push(threeDigits(remainder));

  return `Rupees ${parts.join(" ")} Only`;
}
