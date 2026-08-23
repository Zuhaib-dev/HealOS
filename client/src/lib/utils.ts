import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFileUrl(url: string | undefined | null) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) return url;
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
  const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, "");
  
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}
