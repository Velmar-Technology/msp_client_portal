import type { ReactNode } from "react";

export interface BankAccountInfo {
  id: string;
  name: string;
  accountNumber: string;
  type: string;
  typeKey: string;
  logoBg: string;
  borderColor: string;
  badgeBg: string;
  logoSvg: ReactNode;
}

export const BANK_ACCOUNTS: BankAccountInfo[] = [
  {
    id: "popular",
    name: "Banco Popular",
    accountNumber: "821193257",
    type: "Corriente",
    typeKey: "plans.typeCorriente",
    logoBg: "bg-[#003876]",
    borderColor: "border-[#002b66]",
    badgeBg: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50",
    logoSvg: (
      <img src="/popular.png" alt="Banco Popular Logo" className="w-full h-full object-cover rounded" />
    ),
  },
  {
    id: "banreservas",
    name: "Banreservas",
    accountNumber: "9603579099",
    type: "Corriente",
    typeKey: "plans.typeCorriente",
    logoBg: "bg-[#0091DA]",
    borderColor: "border-[#0070a8]",
    badgeBg: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/50",
    logoSvg: (
      <img src="/banreservas.jpg" alt="Banreservas Logo" className="w-full h-full object-cover rounded" />
    ),
  },
  {
    id: "bhd",
    name: "Banco BHD",
    accountNumber: "29949640016",
    type: "Ahorro",
    typeKey: "plans.typeAhorro",
    logoBg: "bg-[#00875A]",
    borderColor: "border-[#006b47]",
    badgeBg:
      "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50",
    logoSvg: (
      <img src="/bhd.png" alt="Banco BHD Logo" className="w-full h-full object-cover rounded" />
    ),
  },
];
