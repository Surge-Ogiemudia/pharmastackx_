// Mock data for bulk CSV uploads by businesses
export interface BulkUpload {
  id: string;
  business: string;
  csvName: string;
  timestamp: string; // ISO string or formatted
  csvUrl: string;
}

export const mockBulkUploads: BulkUpload[] = [
  {
    id: "bulk1",
    business: "Green Pharmacy",
    csvName: "green-inventory-2025-11-01.csv",
    timestamp: "2025-11-01T10:15:00Z",
    csvUrl: "https://pharmastackx.com/csvs/green-inventory-2025-11-01.csv"
  },
  {
    id: "bulk2",
    business: "City Meds",
    csvName: "citymeds-bulk-2025-10-28.csv",
    timestamp: "2025-10-28T14:30:00Z",
    csvUrl: "https://pharmastackx.com/csvs/citymeds-bulk-2025-10-28.csv"
  },
  {
    id: "bulk3",
    business: "Wellness Hub",
    csvName: "wellness-bulk-2025-09-15.csv",
    timestamp: "2025-09-15T09:00:00Z",
    csvUrl: "https://pharmastackx.com/csvs/wellness-bulk-2025-09-15.csv"
  }
];
